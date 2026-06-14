import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { createImportTask } from '@/api/importTasks';
import { createPresignedUpload, uploadToPresigned } from '@/api/uploads';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useImportDraftStore } from '@/store/importDraft';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow } from '@/theme/design';
import type { ImportSourceType } from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';
import { compressImage, MAX_UPLOAD_BYTES } from '@/utils/image';

// Coarse source tag from the pasted URL — the backend routes by domain itself,
// so this is just metadata/analytics; default to web.
function detectLinkSource(url: string): ImportSourceType {
  const u = url.toLowerCase();
  if (u.includes('taobao') || u.includes('tmall')) return 'taobao';
  if (u.includes('xiaohongshu') || u.includes('xhslink')) return 'xhs';
  if (u.includes('douyin')) return 'douyin';
  if (u.includes('jd.com')) return 'jd';
  return 'web';
}

type Props = NativeStackScreenProps<WardrobeStackParamList, 'AddItem'>;

const T = {
  bg: colors.groupedBackground,
  bgAlt: colors.background,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  ink4: colors.quaternaryLabel,
  divider: colors.separator,
  accent: colors.accent,
  shadowSm: shadow.soft,
  shadowMd: shadow.elevated,
};

export function AddItemScreen({ navigation }: Props) {
  const setDraft = useImportDraftStore((state) => state.set);
  const showToast = useToastStore((state) => state.show);
  const track = useTrack();

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);

  useEffect(() => {
    track('add_item_started');
  }, [track]);

  const submitLink = async () => {
    const url = linkUrl.trim();
    if (!/^https?:\/\/\S+/i.test(url)) {
      showToast({ message: '请粘贴有效的商品链接', kind: 'error' });
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

  const handlePicked = async (uri: string, sourceType: 'camera' | 'album') => {
    try {
      const compressed = await compressImage(uri);
      const blob = await fetch(compressed.uri).then((r) => r.blob());
      if (blob.size > MAX_UPLOAD_BYTES) {
        navigation.replace('ImportFailure', { reason: 'too_large' });
        return;
      }
      const presign = await createPresignedUpload({
        fileName: `wardrobe-${Date.now()}.jpg`,
        contentType: 'image/jpeg',
        maxContentLength: Math.max(blob.size, 1),
      });
      await uploadToPresigned(presign, 'image/jpeg', blob);
      const task = await createImportTask({
        inputType: 'image',
        sourceType,
        imageUrl: presign.fileUrl,
      });
      setDraft({ taskId: task.id, localImageUri: compressed.uri, recognized: task.recognized });
      track('import_task_created', { taskId: task.id, sourceType });
      navigation.replace('ImportConfirm', { taskId: task.id });
    } catch {
      navigation.replace('ImportFailure', { reason: 'upload_failed' });
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showToast({ message: '需要相机权限', kind: 'error' }); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ImagePicker.MediaType.Images });
    if (!result.canceled && result.assets[0]) void handlePicked(result.assets[0].uri, 'camera');
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast({ message: '需要相册权限', kind: 'error' }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ImagePicker.MediaType.Images });
    if (!result.canceled && result.assets[0]) void handlePicked(result.assets[0].uri, 'album');
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 52, paddingBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ fontSize: 30, fontWeight: '600', color: T.ink }}>添加衣物</Text>
          <Text style={{ marginTop: 8, fontSize: 13, color: T.ink3 }}>选择最方便的方式加入衣橱</Text>
        </View>
        <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
          <SystemIcon name="bell" size={22} color={T.ink2} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary: camera */}
        <Pressable
          onPress={pickFromCamera}
          style={({ pressed }) => ({
            backgroundColor: T.ink,
            borderRadius: radius.xl,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            opacity: pressed ? 0.88 : 1,
            ...T.shadowMd,
          })}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: '#fff', marginBottom: 4 }}>
              拍照添加
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18 }}>
              对着衣服一拍，AI 自动识别品类、颜色、版型
            </Text>
          </View>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.lg,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SystemIcon name="camera" size={36} color="#fff" strokeWidth={1.6} />
          </View>
          <SystemIcon name="chevronRight" size={22} color="rgba(255,255,255,0.55)" />
        </Pressable>

        <Text
          style={{
            fontSize: 11,
            color: T.ink3,
            marginTop: 6,
            marginLeft: 4,
            letterSpacing: 0.5,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
          }}
        >
          已有内容 · 一键导入
        </Text>

        {/* Album import */}
        <AddEntry
          title="从相册导入"
          sub="批量选择，适合已有照片"
          icon="photo"
          onPress={pickFromLibrary}
        />

        {/* Link import */}
        <AddEntry
          title="粘贴商品链接"
          sub="淘宝 · 京东 · 小红书 · 得物 · 自动识别 SKU 与版型"
          icon="link"
          onPress={() => setLinkModalOpen(true)}
        />

        {/* Share from app */}
        <AddEntry
          title="从其他 App 分享"
          sub="得物、小红书、淘宝、微信 · 直接分享到 Aidrobe"
          icon="share"
          onPress={() => setLinkModalOpen(true)}
        />

        {/* Tips */}
        <View style={{ backgroundColor: T.cardSoft, borderRadius: radius.lg, padding: 14, marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: T.ink3, marginBottom: 10, letterSpacing: 0.4 }}>
            小提示
          </Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {[
              { icon: 'camera', title: '单件拍摄更准', sub: '避免遮挡' },
              { icon: 'photo', title: '尽量纯色背景', sub: '减少干扰' },
              { icon: 'sparkle', title: '光线充足', sub: '识别更精准' },
            ].map((tip) => (
              <View key={tip.title} style={{ flex: 1, gap: 4 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: radius.pill,
                    backgroundColor: T.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SystemIcon name={tip.icon as 'camera' | 'photo' | 'sparkle'} size={15} color={T.ink2} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: T.ink2 }}>{tip.title}</Text>
                <Text style={{ fontSize: 10, color: T.ink3 }}>{tip.sub}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Paste-link import: enter a product URL; the backend resolves the
          image (taobao/xhs/douyin adapters + og:image fallback) then runs
          recognition, reusing the ImportConfirm screen. */}
      <Modal
        visible={linkModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLinkModalOpen(false)}
      >
        <Pressable
          onPress={() => !submittingLink && setLinkModalOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(26,23,20,0.45)', justifyContent: 'center', padding: 24 }}
        >
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 22, gap: 14, ...T.shadowMd }}
          >
            <View>
              <Text style={{ fontSize: 20, fontWeight: '600', color: T.ink }}>粘贴商品链接</Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: T.ink3, lineHeight: 18 }}>
                淘宝 · 天猫 · 小红书 · 抖音 · 京东，自动抓取商品图并识别
              </Text>
            </View>
            <TextInput
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://..."
              placeholderTextColor={T.ink4}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!submittingLink}
              onSubmitEditing={submitLink}
              style={{
                borderWidth: 1,
                borderColor: T.divider,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: T.ink,
                backgroundColor: T.bgAlt,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => !submittingLink && setLinkModalOpen(false)}
                style={{ flex: 1, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', backgroundColor: T.cardSoft }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: T.ink2 }}>取消</Text>
              </Pressable>
              <Pressable
                onPress={submitLink}
                disabled={submittingLink}
                style={{ flex: 2, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', backgroundColor: T.ink, opacity: submittingLink ? 0.7 : 1 }}
              >
                {submittingLink ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>抓取并识别</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function AddEntry({
  title,
  sub,
  icon,
  onPress,
}: {
  title: string;
  sub: string;
  icon: 'photo' | 'link' | 'share';
  onPress: () => void;
}) {
  const T = {
    card: colors.elevated,
    ink: colors.label,
    ink3: colors.tertiaryLabel,
    shadowSm: shadow.soft,
  };
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: T.card,
        borderRadius: radius.xl,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        opacity: pressed ? 0.88 : 1,
        ...T.shadowSm,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: T.ink, marginBottom: 4 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: T.ink3, lineHeight: 17 }}>{sub}</Text>
      </View>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <SystemIcon name={icon} size={20} color={T.ink} />
      </View>
      <SystemIcon name="chevronRight" size={18} color={T.ink3} />
    </Pressable>
  );
}
