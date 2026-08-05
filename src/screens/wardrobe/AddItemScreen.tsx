import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type DimensionValue,
  View,
} from 'react-native';

import { API_BASE_URL, APP_ENV } from '@/api/client';
import { createImportTask } from '@/api/importTasks';
import { createPresignedUpload, uploadFileUriToPresigned } from '@/api/uploads';
import { AIOrb } from '@/components/ui/AIOrb';
import { Button } from '@/components/ui/Button';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { AddSourceSheet } from '@/components/wardrobe/AddSourceSheet';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { useImportDraftStore } from '@/store/importDraft';
import { useToastStore } from '@/store/toast';
import { colors, shadow } from '@/theme/design';
import type { ImportInputType, ImportSourceType } from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';
import { compressImage, MAX_UPLOAD_BYTES } from '@/utils/image';

// Pull the first http(s) URL out of pasted share text (e.g. XHS/Douyin blurbs
// like "「外套」https://xhslink.com/abc 复制打开App"). The backend resolves the
// short link + platform from a clean URL, so the client only needs to extract
// it. Stop at whitespace and common CJK closing punctuation so trailing copy
// doesn't get glued onto the URL.
function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s，。、；）】」』"']+/i);
  return match ? match[0] : null;
}

function detectLinkSource(url: string): ImportSourceType {
  const u = url.toLowerCase();
  if (u.includes('taobao') || u.includes('tmall')) return 'taobao';
  if (u.includes('xiaohongshu') || u.includes('xhslink')) return 'xhs';
  if (u.includes('douyin')) return 'douyin';
  if (u.includes('jd.com')) return 'jd';
  return 'web';
}

type Props = NativeStackScreenProps<WardrobeStackParamList, 'AddItem'>;

// Album multi-select cap. Backend stays one-task-per-image; we just fan out.
const MAX_IMPORT_BATCH = 9;

const Tok = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.fill,
  ink: colors.label,
  muted: colors.tertiaryLabel,
  faint: colors.quaternaryLabel,
  line: colors.separator,
  rail: colors.secondaryLabel,
} as const;

export function AddItemScreen({ navigation }: Props) {
  const { t, locale } = useT();
  const setDraft = useImportDraftStore((state) => state.set);
  const showToast = useToastStore((state) => state.show);
  const track = useTrack();

  const [sourceSheetVisible, setSourceSheetVisible] = useState(true);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);
  const [processingLabel, setProcessingLabel] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const busy = submittingLink || processingLabel !== null;

  useEffect(() => {
    track('add_item_started');
  }, [track]);

  const submitLink = async () => {
    const url = extractFirstUrl(linkUrl);
    if (!url) {
      showToast({ message: t('add.noLink'), kind: 'error' });
      return;
    }
    setSubmittingLink(true);
    try {
      const sourceType = detectLinkSource(url);
      const task = await createImportTask({ inputType: 'link', sourceType, sourceUrl: url, locale });
      track('import_task_created', { taskId: task.id, sourceType });
      setLinkModalOpen(false);
      setLinkUrl('');
      navigation.replace('ImportConfirm', { taskId: task.id });
    } catch {
      navigation.replace('ImportFailure', { reason: 'network_error' });
    } finally {
      setSubmittingLink(false);
    }
  };

  // Shared per-image pipeline: compress -> presign -> upload -> create task.
  // `labelPrefix` lets the batch flow show "处理 k/N · <step>". No nav/draft here.
  const runImportPipeline = async (
    uri: string,
    sourceType: 'camera' | 'album',
    labelPrefix = '',
    inputType: ImportInputType = 'image',
  ) => {
    setUploadProgress(0);
    setProcessingLabel(`${labelPrefix}${t('add.tidyPhoto')}`);
    console.log('[import] compress:start', { sourceType });
    const compressed = await compressImage(uri);
    console.log('[import] compress:done', { uri: compressed.uri });

    setProcessingLabel(`${labelPrefix}${t('add.openChannel')}`);
    const fileName = `wardrobe-${Date.now()}.jpg`;
    console.log('[import] presign:start', { fileName });
    const presign = await createPresignedUpload({
      fileName,
      contentType: 'image/jpeg',
      maxContentLength: MAX_UPLOAD_BYTES,
    });
    console.log('[import] presign:done', {
      uploadHost: safeHost(presign.uploadUrl),
      fileHost: safeHost(presign.fileUrl),
      fields: Object.keys(presign.fields ?? {}),
    });

    setProcessingLabel(`${labelPrefix}${t('add.uploading')}`);
    console.log('[import] upload:start');
    await uploadFileUriToPresigned(presign, 'image/jpeg', compressed.uri, fileName, setUploadProgress);
    console.log('[import] upload:done');

    setProcessingLabel(`${labelPrefix}${t('add.makingCard')}`);
    console.log('[import] task:start');
    const task = await createImportTask({ inputType, sourceType, imageUrl: presign.fileUrl, locale });
    console.log('[import] task:done', { taskId: task.id });
    return { task, localUri: compressed.uri };
  };

  const handlePicked = async (
    uri: string,
    sourceType: 'camera' | 'album',
    inputType: ImportInputType = 'image',
  ) => {
    try {
      const { task, localUri } = await runImportPipeline(uri, sourceType, '', inputType);
      setDraft({ taskId: task.id, localImageUri: localUri, recognized: task.recognized });
      track('import_task_created', { taskId: task.id, sourceType, inputType });
      navigation.replace('ImportConfirm', { taskId: task.id });
    } catch (error) {
      console.error('[import] failed', error);
      if (APP_ENV !== 'production') {
        showToast({
          message: `上传失败：${(error as Error)?.message ?? 'unknown'} @ ${API_BASE_URL}`,
          kind: 'error',
        });
      }
      navigation.replace('ImportFailure', { reason: 'upload_failed' });
    } finally {
      setProcessingLabel(null);
    }
  };

  // Multi-image: fan out one task per photo (one at a time so we don't hammer
  // presign/upload), skipping individual failures, then hand the queue to
  // ImportConfirm to confirm sequentially.
  const handlePickedBatch = async (uris: string[]) => {
    const taskIds: string[] = [];
    let failed = 0;
    for (const [i, uri] of uris.entries()) {
      try {
        const { task } = await runImportPipeline(
          uri,
          'album',
          t('add.batchPrefix', { index: i + 1, total: uris.length }),
        );
        taskIds.push(task.id);
        track('import_task_created', { taskId: task.id, sourceType: 'album' });
      } catch (error) {
        console.error('[import] batch item failed', error);
        failed += 1;
      }
    }
    setProcessingLabel(null);
    const firstTask = taskIds[0];
    if (!firstTask) {
      navigation.replace('ImportFailure', { reason: 'upload_failed' });
      return;
    }
    if (failed > 0) {
      showToast({ message: t('add.someSkipped', { count: failed }), kind: 'error' });
    }
    navigation.replace('ImportConfirm', { taskId: firstTask, queue: taskIds, queueIndex: 0 });
  };

  const pickFromCamera = async () => {
    if (busy) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast({ message: t('add.cameraPermission'), kind: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) void handlePicked(result.assets[0].uri, 'camera');
  };

  const pickFromLibrary = async () => {
    if (busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({ message: t('add.albumPermission'), kind: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMPORT_BATCH,
    });
    if (result.canceled || result.assets.length === 0) return;
    const uris = result.assets.map((a) => a.uri);
    const [firstUri] = uris;
    if (uris.length === 1 && firstUri) {
      void handlePicked(firstUri, 'album');
    } else {
      void handlePickedBatch(uris);
    }
  };

  // Shopping/order screenshot import: same album picker + upload plumbing as
  // pickFromLibrary, single image only (one order screenshot per task), tagged
  // with input_type 'order_screenshot' so the backend OCR adapter picks it up.
  const pickShoppingScreenshot = async () => {
    if (busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({ message: t('add.albumPermission'), kind: 'error' });
      setSourceSheetVisible(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) {
      // The source sheet is the only entry point for this import type, so
      // restore it when the picker is dismissed without a selection.
      setSourceSheetVisible(true);
      return;
    }
    void handlePicked(result.assets[0].uri, 'album', 'order_screenshot');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={10}
        >
          <SystemIcon name="chevronLeft" size={24} color={Tok.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('add.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={pickFromCamera}
          disabled={busy}
          style={styles.captureStage}
        >
          <View style={styles.stageRail} />
          <View style={[styles.hangerHook, styles.hangerLeft]} />
          <View style={[styles.hangerHook, styles.hangerRight]} />
          <View style={styles.scanHaloOuter}>
            <View style={styles.scanHaloMid}>
              <View style={styles.scanHaloInner}>
                <SystemIcon name="camera" size={35} color={Tok.ink} strokeWidth={1.55} />
              </View>
            </View>
          </View>
          <View style={styles.scanLine} />
          <GarmentSpecimen variant="coat" />
          <GarmentSpecimen variant="shirt" />
          <View style={styles.stageFooter}>
            <Text style={styles.stageTitle}>{t('add.stageTitle')}</Text>
            <Text style={styles.stageSub}>{t('add.stageSub')}</Text>
          </View>
        </Pressable>

        <View style={styles.importDock}>
          <DockAction icon="photo" label={t('add.dock.album')} onPress={pickFromLibrary} disabled={busy} />
          <DockAction icon="link" label={t('add.dock.link')} onPress={() => setLinkModalOpen(true)} disabled={busy} />
          <DockAction icon="share" label={t('add.dock.share')} onPress={() => setLinkModalOpen(true)} disabled={busy} />
        </View>
      </ScrollView>

      <AddSourceSheet
        visible={sourceSheetVisible && !linkModalOpen}
        onClose={() => {
          setSourceSheetVisible(false);
          navigation.goBack();
        }}
        onCamera={() => {
          setSourceSheetVisible(false);
          void pickFromCamera();
        }}
        onAlbum={() => {
          setSourceSheetVisible(false);
          void pickFromLibrary();
        }}
        onOutfit={() => {
          // No dedicated outfit-extraction handler yet; reuses album picker.
          // TODO: wire to outfit-extract flow once backend supports it.
          setSourceSheetVisible(false);
          void pickFromLibrary();
        }}
        onLink={() => {
          setSourceSheetVisible(false);
          setLinkModalOpen(true);
        }}
        onShoppingScreenshot={() => {
          setSourceSheetVisible(false);
          void pickShoppingScreenshot();
        }}
      />
      <LinkImportModal
        visible={linkModalOpen}
        value={linkUrl}
        submitting={submittingLink}
        title={t('add.modalTitle')}
        placeholder={t('add.linkPlaceholder')}
        submitLabel={t('add.fetchItem')}
        onChange={setLinkUrl}
        onSubmit={submitLink}
        onClose={() => !submittingLink && setLinkModalOpen(false)}
      />
      <ProcessingOverlay label={processingLabel} progress={uploadProgress} />
    </View>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid-url';
  }
}

function DockAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'photo' | 'link' | 'share';
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.dockAction, disabled && styles.disabled]}
    >
      <View style={styles.dockIcon}>
        <SystemIcon name={icon} size={21} color={Tok.ink} strokeWidth={1.9} />
      </View>
      <Text style={styles.dockLabel}>{label}</Text>
    </Pressable>
  );
}

function GarmentSpecimen({ variant }: { variant: 'coat' | 'shirt' }) {
  const isCoat = variant === 'coat';
  return (
    <View style={[styles.garment, isCoat ? styles.garmentCoat : styles.garmentShirt]}>
      <View style={styles.garmentNeck} />
      <View style={[styles.garmentSleeve, styles.leftSleeve]} />
      <View style={[styles.garmentSleeve, styles.rightSleeve]} />
      <View style={styles.garmentBody}>
        <View style={styles.garmentPlacket} />
      </View>
    </View>
  );
}

function LinkImportModal({
  visible,
  value,
  submitting,
  title,
  placeholder,
  submitLabel,
  onChange,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  value: string;
  submitting: boolean;
  title: string;
  placeholder: string;
  submitLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={() => {}} style={styles.linkSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={Tok.faint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!submitting}
            onSubmitEditing={onSubmit}
            style={styles.linkInput}
          />
          <Button
            variant="primary"
            label={submitLabel}
            onPress={onSubmit}
            loading={submitting}
            style={styles.modalSubmit}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ProcessingOverlay({ label, progress }: { label: string | null; progress: number }) {
  if (!label) return null;
  const width: DimensionValue = progress > 0 ? `${Math.min(Math.max(progress, 8), 100)}%` : '34%';
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.processingBackdrop}>
        <View style={styles.processingCard}>
          <AIOrb variant="ink" size={96} />
          <Text style={styles.processingTitle}>{label}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Tok.bg,
  },
  header: {
    paddingTop: 46,
    paddingHorizontal: 22,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Tok.ink,
    letterSpacing: 0,
  },
  headerSpacer: {
    width: 46,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 124,
  },
  captureStage: {
    minHeight: 520,
    borderRadius: 34,
    backgroundColor: Tok.card,
    overflow: 'hidden',
    padding: 22,
    justifyContent: 'flex-end',
    ...shadow.elevated,
  },
  capturePressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.96,
  },
  stageRail: {
    position: 'absolute',
    top: 44,
    left: 58,
    right: 58,
    height: 2,
    backgroundColor: Tok.ink,
    opacity: 0.72,
  },
  hangerHook: {
    position: 'absolute',
    top: 44,
    width: 1,
    height: 64,
    backgroundColor: Tok.ink,
    opacity: 0.24,
  },
  hangerLeft: {
    left: 116,
  },
  hangerRight: {
    right: 116,
  },
  scanHaloOuter: {
    position: 'absolute',
    top: 124,
    alignSelf: 'center',
    width: 214,
    height: 214,
    borderRadius: 107,
    borderWidth: 1,
    borderColor: colors.separatorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanHaloMid: {
    width: 158,
    height: 158,
    borderRadius: 79,
    borderWidth: 1,
    borderColor: colors.separator,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryElevated,
  },
  scanHaloInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Tok.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    top: 244,
    left: 44,
    right: 44,
    height: 1,
    backgroundColor: Tok.rail,
    opacity: 0.32,
  },
  garment: {
    position: 'absolute',
    width: 92,
    height: 150,
  },
  garmentCoat: {
    left: 38,
    top: 138,
    transform: [{ rotate: '-7deg' }],
  },
  garmentShirt: {
    right: 34,
    top: 310,
    transform: [{ rotate: '6deg' }],
  },
  garmentNeck: {
    position: 'absolute',
    top: 4,
    left: 34,
    width: 24,
    height: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Tok.line,
    backgroundColor: Tok.card,
    zIndex: 2,
  },
  garmentSleeve: {
    position: 'absolute',
    top: 30,
    width: 24,
    height: 76,
    borderRadius: 14,
    backgroundColor: Tok.cardSoft,
  },
  leftSleeve: {
    left: 2,
    transform: [{ rotate: '15deg' }],
  },
  rightSleeve: {
    right: 2,
    transform: [{ rotate: '-15deg' }],
  },
  garmentBody: {
    position: 'absolute',
    left: 24,
    top: 24,
    width: 44,
    height: 118,
    borderRadius: 18,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.separatorSoft,
  },
  garmentPlacket: {
    position: 'absolute',
    left: 21,
    top: 14,
    bottom: 14,
    width: 1,
    backgroundColor: colors.separator,
  },
  stageFooter: {
    gap: 8,
    borderRadius: 26,
    backgroundColor: Tok.ink,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  stageTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.inverse,
  },
  stageSub: {
    fontSize: 13,
    color: colors.inverse,
    opacity: 0.6,
  },
  importDock: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  dockAction: {
    flex: 1,
    minHeight: 96,
    borderRadius: 24,
    backgroundColor: Tok.card,
    borderWidth: 1,
    borderColor: colors.separatorSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  dockIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tok.bg,
  },
  dockLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Tok.ink,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,23,20,0.42)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  linkSheet: {
    borderRadius: 30,
    backgroundColor: Tok.card,
    padding: 20,
    paddingBottom: 24,
    gap: 16,
    ...shadow.elevated,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Tok.line,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Tok.ink,
  },
  linkInput: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Tok.ink,
    backgroundColor: Tok.bg,
  },
  modalSubmit: {
    minHeight: 54,
    borderRadius: 18,
  },
  processingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,23,20,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  processingCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: Tok.card,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    ...shadow.elevated,
  },
  processingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Tok.ink,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: Tok.cardSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Tok.rail,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
});
