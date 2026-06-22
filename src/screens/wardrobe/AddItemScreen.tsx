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
import { Button } from '@/components/ui/Button';
import { SiriOrb } from '@/components/ui/SiriOrb';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useImportDraftStore } from '@/store/importDraft';
import { useToastStore } from '@/store/toast';
import { shadow } from '@/theme/design';
import type { ImportSourceType } from '@/types/api';
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

const P = {
  bg: '#F4F1EA',
  surface: '#FFFCF5',
  surfaceSoft: '#E9E6DA',
  ink: '#151411',
  muted: '#777168',
  faint: '#A9A298',
  line: '#D9D4C8',
  rail: '#3E4B45',
  sage: '#C8D3C1',
  steel: '#7F8D8A',
  black: '#15120F',
};

export function AddItemScreen({ navigation }: Props) {
  const setDraft = useImportDraftStore((state) => state.set);
  const showToast = useToastStore((state) => state.show);
  const track = useTrack();

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
      showToast({ message: '没找到链接，请粘贴商品链接或含链接的分享文案', kind: 'error' });
      return;
    }
    setSubmittingLink(true);
    try {
      const sourceType = detectLinkSource(url);
      const task = await createImportTask({ inputType: 'link', sourceType, sourceUrl: url });
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
  ) => {
    setUploadProgress(0);
    setProcessingLabel(`${labelPrefix}整理照片`);
    console.log('[import] compress:start', { sourceType });
    const compressed = await compressImage(uri);
    console.log('[import] compress:done', { uri: compressed.uri });

    setProcessingLabel(`${labelPrefix}打开衣橱通道`);
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

    setProcessingLabel(`${labelPrefix}上传衣物`);
    console.log('[import] upload:start');
    await uploadFileUriToPresigned(presign, 'image/jpeg', compressed.uri, fileName, setUploadProgress);
    console.log('[import] upload:done');

    setProcessingLabel(`${labelPrefix}生成衣物卡片`);
    console.log('[import] task:start');
    const task = await createImportTask({ inputType: 'image', sourceType, imageUrl: presign.fileUrl });
    console.log('[import] task:done', { taskId: task.id });
    return { task, localUri: compressed.uri };
  };

  const handlePicked = async (uri: string, sourceType: 'camera' | 'album') => {
    try {
      const { task, localUri } = await runImportPipeline(uri, sourceType);
      setDraft({ taskId: task.id, localImageUri: localUri, recognized: task.recognized });
      track('import_task_created', { taskId: task.id, sourceType });
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
        const { task } = await runImportPipeline(uri, 'album', `处理 ${i + 1}/${uris.length} · `);
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
      showToast({ message: `${failed} 张未能导入，已跳过`, kind: 'error' });
    }
    navigation.replace('ImportConfirm', { taskId: firstTask, queue: taskIds, queueIndex: 0 });
  };

  const pickFromCamera = async () => {
    if (busy) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast({ message: '需要相机权限', kind: 'error' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] });
    if (!result.canceled && result.assets[0]) void handlePicked(result.assets[0].uri, 'camera');
  };

  const pickFromLibrary = async () => {
    if (busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({ message: '需要相册权限', kind: 'error' });
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          hitSlop={10}
        >
          <SystemIcon name="chevronLeft" size={24} color={P.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>收进衣橱</Text>
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
          style={({ pressed }) => [styles.captureStage, pressed && styles.capturePressed]}
        >
          <View style={styles.stageRail} />
          <View style={[styles.hangerHook, styles.hangerLeft]} />
          <View style={[styles.hangerHook, styles.hangerRight]} />
          <View style={styles.scanHaloOuter}>
            <View style={styles.scanHaloMid}>
              <View style={styles.scanHaloInner}>
                <SystemIcon name="camera" size={35} color={P.ink} strokeWidth={1.55} />
              </View>
            </View>
          </View>
          <View style={styles.scanLine} />
          <GarmentSpecimen variant="coat" />
          <GarmentSpecimen variant="shirt" />
          <View style={styles.stageFooter}>
            <Text style={styles.stageTitle}>拍一件衣服</Text>
            <Text style={styles.stageSub}>对准单品，留一点边界</Text>
          </View>
        </Pressable>

        <View style={styles.importDock}>
          <DockAction icon="photo" label="相册" onPress={pickFromLibrary} disabled={busy} />
          <DockAction icon="link" label="链接" onPress={() => setLinkModalOpen(true)} disabled={busy} />
          <DockAction icon="share" label="分享" onPress={() => setLinkModalOpen(true)} disabled={busy} />
        </View>
      </ScrollView>

      <LinkImportModal
        visible={linkModalOpen}
        value={linkUrl}
        submitting={submittingLink}
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
      style={({ pressed }) => [styles.dockAction, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.dockIcon}>
        <SystemIcon name={icon} size={21} color={P.ink} strokeWidth={1.9} />
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
  onChange,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  value: string;
  submitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={() => {}} style={styles.linkSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>贴链接或分享文案</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="粘贴商品链接，或整段分享文案"
            placeholderTextColor={P.faint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!submitting}
            onSubmitEditing={onSubmit}
            style={styles.linkInput}
          />
          <Button
            variant="primary"
            label="抓取衣物"
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
          <SiriOrb size={96} />
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
    backgroundColor: P.bg,
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
    color: P.ink,
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
    backgroundColor: P.surface,
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
    backgroundColor: P.ink,
    opacity: 0.72,
  },
  hangerHook: {
    position: 'absolute',
    top: 44,
    width: 1,
    height: 64,
    backgroundColor: P.ink,
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
    borderColor: 'rgba(62,75,69,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanHaloMid: {
    width: 158,
    height: 158,
    borderRadius: 79,
    borderWidth: 1,
    borderColor: 'rgba(62,75,69,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,211,193,0.22)',
  },
  scanHaloInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: P.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    top: 244,
    left: 44,
    right: 44,
    height: 1,
    backgroundColor: P.rail,
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
    borderColor: P.line,
    backgroundColor: P.surface,
    zIndex: 2,
  },
  garmentSleeve: {
    position: 'absolute',
    top: 30,
    width: 24,
    height: 76,
    borderRadius: 14,
    backgroundColor: P.surfaceSoft,
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
    backgroundColor: '#D8CEC0',
    borderWidth: 1,
    borderColor: 'rgba(21,20,17,0.06)',
  },
  garmentPlacket: {
    position: 'absolute',
    left: 21,
    top: 14,
    bottom: 14,
    width: 1,
    backgroundColor: 'rgba(21,20,17,0.2)',
  },
  stageFooter: {
    gap: 8,
    borderRadius: 26,
    backgroundColor: P.black,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  stageTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#fff',
  },
  stageSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.58)',
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
    backgroundColor: 'rgba(255,252,245,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(21,20,17,0.06)',
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
    backgroundColor: P.bg,
  },
  dockLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: P.ink,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(21,18,15,0.42)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  linkSheet: {
    borderRadius: 30,
    backgroundColor: P.surface,
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
    backgroundColor: P.line,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: P.ink,
  },
  linkInput: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 15,
    color: P.ink,
    backgroundColor: P.bg,
  },
  modalSubmit: {
    minHeight: 54,
    borderRadius: 18,
  },
  processingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(21,18,15,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  processingCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: P.surface,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    ...shadow.elevated,
  },
  processingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: P.ink,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: P.surfaceSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: P.rail,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
});
