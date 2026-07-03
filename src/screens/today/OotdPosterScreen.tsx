import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { createOotdPoster } from '@/api/ootdPosters';
import { getWearHistoryByDate, uploadOotdPhoto } from '@/api/outfitHistory';
import { getOutfitVisualAsset } from '@/api/outfitVisual';
import { createPresignedUpload, uploadToPresigned } from '@/api/uploads';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { OotdPosterTemplate } from '@/types/api';
import type { TodayStackParamList } from '@/types/navigation';
import { todayISO } from '@/utils/date';
import { compressImage, MAX_UPLOAD_BYTES } from '@/utils/image';
import { shareWithAsset } from '@/utils/share';

type Props = NativeStackScreenProps<TodayStackParamList, 'OotdPoster'>;

type Phase = 'compose' | 'generating' | 'result' | 'failed';

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
};

const TEMPLATES: { value: OotdPosterTemplate; label: string }[] = [
  { value: 'minimal', label: '极简' },
  { value: 'studio', label: '影棚' },
  { value: 'street', label: '街拍' },
];

const CONSENT_TEXT = '我已知悉海报由第三方 AI 模型生成，效果图仅供参考，可能与实物存在差异。';

export function OotdPosterScreen({ navigation, route }: Props) {
  const { t } = useT();
  const track = useTrack();
  const showToast = useToastStore((s) => s.show);

  // The look the user came from. API_GAP[FE#15]: the poster API is selfie-based
  // (background-repaint only) and does NOT consume the outfit, so outfitId can't
  // drive the generated image. Rather than silently dropping it, we surface the
  // look's title as context and keep it on the start-analytics event below.
  const fromOutfitTitle = route.params?.outfitTitle ?? null;

  const [phase, setPhase] = useState<Phase>('compose');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [template, setTemplate] = useState<OotdPosterTemplate>('minimal');
  const [consent, setConsent] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  useEffect(() => {
    track('ootd_poster_started', route.params?.outfitId ? { outfitId: route.params.outfitId } : {});
  }, [track, route.params]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({ message: '需要相册权限', kind: 'error' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    setUploading(true);
    try {
      const compressed = await compressImage(uri);
      const blob = await fetch(compressed.uri).then((r) => r.blob());
      if (blob.size > MAX_UPLOAD_BYTES) {
        showToast({ message: '图片过大，请换一张', kind: 'error' });
        setImageUri(null);
        return;
      }
      const presign = await createPresignedUpload({
        fileName: `ootd-${Date.now()}.jpg`,
        contentType: 'image/jpeg',
        maxContentLength: Math.max(blob.size, 1),
      });
      await uploadToPresigned(presign, 'image/jpeg', blob);
      setImageUrl(presign.fileUrl);
    } catch {
      showToast({ message: '上传失败，请重试', kind: 'error' });
      setImageUri(null);
    } finally {
      setUploading(false);
    }
  };

  // Best-effort: hang the selfie on today's wear-history record so history /
  // calendar surfaces the real look (BE keeps ootd_image_url null otherwise).
  // No record for today (nothing marked worn) is a legitimate skip — both
  // requests run silent so the poster flow never surfaces this as an error.
  const attachOotdToToday = async (photoUrl: string) => {
    try {
      const entry = await getWearHistoryByDate(todayISO(), { silentErrorToast: true });
      await uploadOotdPhoto(entry.wearHistoryId, photoUrl, { silentErrorToast: true });
      track('ootd_attached_to_history', { wearHistoryId: entry.wearHistoryId });
    } catch {
      track('ootd_attach_skipped', {});
    }
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createOotdPoster({ ootdImageUrl: imageUrl ?? undefined, templateId: template, consent: true }),
    onSuccess: (res) => {
      setAssetId(res.assetId);
      setPhase('generating');
      track('ootd_poster_generated', { template });
      if (imageUrl) void attachOotdToToday(imageUrl);
    },
  });

  const assetQuery = useQuery({
    queryKey: ['outfitVisualAsset', assetId],
    queryFn: () => getOutfitVisualAsset(assetId as string),
    enabled: phase === 'generating' && !!assetId,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 2000;
      if (d.imageUrl || d.errorCode || d.generationStatus === 'failed') return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (phase !== 'generating') return;
    const d = assetQuery.data;
    if (!d) return;
    if (d.imageUrl) {
      setPosterUrl(d.imageUrl);
      setPhase('result');
    } else if (d.errorCode || d.generationStatus === 'failed') {
      setPhase('failed');
    }
  }, [assetQuery.data, phase]);

  const canGenerate = !!imageUrl && consent && !uploading && !createMutation.isPending;

  // Zero-dep sharing: hand the poster URL to the native share sheet (where the
  // user can AirDrop / send / save). Saving straight to the camera roll would
  // need expo-media-library, deferred.
  const handleShare = async () => {
    if (!posterUrl) return;
    await shareWithAsset('我的今日穿搭 · Aidrobe', posterUrl);
    track('ootd_poster_shared', {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ ...type.title2, color: T.ink }}>OOTD 海报</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: T.card,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.soft,
          }}
        >
          <SystemIcon name="x" size={16} color={T.ink} />
        </Pressable>
      </View>

      {phase === 'compose' ? (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.screen, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Context: the poster is built from the SELFIE, not the chosen
                outfit board. Make that explicit so a user arriving from an
                outfit doesn't expect the look itself to be rendered. */}
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: 14, gap: 4 }}>
              {fromOutfitTitle ? (
                <Text style={{ ...type.footnote, color: T.ink2 }}>
                  {t('ootd.fromOutfit', { title: fromOutfitTitle })}
                </Text>
              ) : null}
              <Text style={{ ...type.footnote, color: T.ink3, lineHeight: 18 }}>{t('ootd.selfieBased')}</Text>
            </View>

            {/* Image picker */}
            <Pressable
              onPress={uploading ? undefined : pickImage}
              style={{
                height: 220,
                borderRadius: radius.xl,
                backgroundColor: T.card,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                ...shadow.soft,
              }}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <SystemIcon name="camera" size={28} color={T.accent} strokeWidth={1.8} />
                  <Text style={{ ...type.callout, color: T.ink3 }}>选择今日穿着自拍</Text>
                </View>
              )}
              {uploading ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(26,23,20,0.35)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </Pressable>

            {/* Template */}
            <View style={{ gap: 10 }}>
              <Text style={{ ...type.footnote, color: T.ink3 }}>海报模板</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {TEMPLATES.map((t) => {
                  const active = template === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setTemplate(t.value)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        backgroundColor: active ? T.ink : T.card,
                        ...shadow.soft,
                      }}
                    >
                      <Text style={{ ...type.body, fontWeight: '600', color: active ? colors.inverse : T.ink2 }}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Consent */}
            <Pressable
              onPress={() => setConsent((c) => !c)}
              style={{
                flexDirection: 'row',
                gap: 10,
                backgroundColor: colors.accentSoft,
                borderRadius: radius.lg,
                padding: 14,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: consent ? T.accent : 'transparent',
                  borderWidth: consent ? 0 : 1.5,
                  borderColor: T.accent,
                }}
              >
                {consent ? <SystemIcon name="check" size={14} color={colors.inverse} /> : null}
              </View>
              <Text style={{ ...type.footnote, color: T.ink2, flex: 1, lineHeight: 18 }}>{CONSENT_TEXT}</Text>
            </Pressable>
          </ScrollView>

          <View style={{ paddingHorizontal: spacing.screen, paddingTop: 12, paddingBottom: 28 }}>
            <PrimaryButton
              label="生成海报"
              onPress={() => createMutation.mutate()}
              disabled={!canGenerate}
              loading={createMutation.isPending}
            />
          </View>
        </>
      ) : null}

      {phase === 'generating' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 }}>
          <ActivityIndicator color={T.accent} size="large" />
          <Text style={{ ...type.headline, color: T.ink }}>正在生成你的海报…</Text>
          <Text style={{ ...type.footnote, color: T.ink3, textAlign: 'center', lineHeight: 18 }}>
            {CONSENT_TEXT}
          </Text>
        </View>
      ) : null}

      {phase === 'result' ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.screen }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: T.cardSoft, aspectRatio: 0.72, ...shadow.elevated }}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : null}
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: spacing.screen, paddingTop: 12, paddingBottom: 28 }}>
            <PrimaryButton label="分享" onPress={handleShare} />
          </View>
        </View>
      ) : null}

      {phase === 'failed' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 }}>
          <Text style={{ ...type.headline, color: T.ink }}>海报生成失败</Text>
          <Text style={{ ...type.footnote, color: T.ink3, textAlign: 'center' }}>
            稍后再试，或换一张自拍。
          </Text>
          <View style={{ marginTop: 12, width: '100%', maxWidth: 240 }}>
            <PrimaryButton
              label="重新生成"
              onPress={() => {
                setAssetId(null);
                setPosterUrl(null);
                setPhase('compose');
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
