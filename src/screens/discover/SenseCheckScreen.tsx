import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getSenseCheckHistory, senseCheck } from '@/api/shopping';
import { historyThumbState } from '@/screens/discover/senseCheckHistory';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Tag } from '@/components/ui/Tag';
import { useTrack } from '@/hooks/useTrack';
import { useWardrobeItemNames } from '@/hooks/useWardrobeItemNames';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { SenseCheckBody, SenseCheckResult } from '@/types/api';
import type { DiscoverStackParamList } from '@/types/navigation';
import { httpStatus } from '@/utils/http';
import { pickAndUploadImage, uploadErrorMessage } from '@/utils/imageUpload';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'SenseCheck'>;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
};

const VERDICT: Record<string, { label: string; color: string; bg: string }> = {
  buy: { label: '建议入手', color: colors.success, bg: colors.successBg },
  consider: { label: '再考虑', color: colors.warning, bg: colors.warningBg },
  skip: { label: '别买了', color: colors.danger, bg: colors.dangerBg },
};

const THUMB = 44;

// History row thumbnail with a deterministic fallback. The box keeps a fixed
// 44×44 footprint regardless of load/error state so the row never jumps; the
// <Image> overlays it and on failure (or no URL) we keep the box + a 'photo'
// glyph. `testID`s make loading/error states QA-visible. This is the actual P0
// fix: the old row drew a bare placeholder <View> and never mounted an Image.
function HistoryThumb({ imageUrl }: { imageUrl: string | null }) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // A history row keeps the same `h.id` (and thus the same React key) across
  // refetches, so a fresh/refreshed `imageUrl` reuses this component instance.
  // Without resetting, a prior `onError` leaves `errored` true and the new URL
  // never gets a chance to load. Reset load/error state whenever the URL changes.
  useEffect(() => {
    setErrored(false);
    setLoaded(false);
  }, [imageUrl]);
  const state = historyThumbState(imageUrl, errored);

  return (
    <View
      style={{ width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: T.cardSoft, overflow: 'hidden' }}
    >
      {state === 'fallback' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="sense-history-thumb-fallback">
          <SystemIcon name="photo" size={20} color={T.ink3} />
        </View>
      ) : (
        <>
          <Image
            source={{ uri: imageUrl as string }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            testID="sense-history-thumb-image"
          />
          {!loaded ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              testID="sense-history-thumb-loading"
            >
              <ActivityIndicator size="small" color={T.ink3} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function ResultCard({ result }: { result: SenseCheckResult }) {
  const v = VERDICT[result.verdict] ?? { label: result.verdict, color: T.ink, bg: T.cardSoft };
  const nameById = useWardrobeItemNames(result.similarItems.map((s) => s.itemId));

  return (
    <View style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, gap: 14, ...shadow.soft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ backgroundColor: v.bg, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ ...type.title2, color: v.color }}>{v.label}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ ...type.title2, color: T.ink }}>{result.outfitPotential}</Text>
          <Text style={{ ...type.caption, color: T.ink3 }}>可搭套数</Text>
        </View>
      </View>

      <Text style={{ ...type.body, color: T.ink2, lineHeight: 22 }}>{result.reason}</Text>

      {result.similarItems.length > 0 ? (
        <View>
          <Text style={{ ...type.footnote, color: T.ink3, marginBottom: 8 }}>衣橱里的相似单品</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {result.similarItems.map((s) => (
              <View key={s.itemId} style={{ width: 72 }}>
                <View style={{ width: 72, height: 72, borderRadius: radius.md, backgroundColor: T.cardSoft }} />
                <Text style={{ ...type.caption, color: T.ink2, marginTop: 6 }} numberOfLines={1}>
                  {nameById.get(s.itemId) ?? '衣橱单品'}
                </Text>
                <Text style={{ ...type.caption, color: T.accent }}>{Math.round(s.similarity * 100)}% 相似</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {result.wardrobeGap.length > 0 ? (
        <View>
          <Text style={{ ...type.footnote, color: T.ink3, marginBottom: 8 }}>衣橱真正缺的</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {result.wardrobeGap.map((g) => (
              <Tag key={g}>{g}</Tag>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function SenseCheckScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const track = useTrack();
  const showToast = useToastStore((s) => s.show);
  const [url, setUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [current, setCurrent] = useState<SenseCheckResult | null>(null);

  useEffect(() => {
    track('sense_check_viewed', {});
  }, [track]);

  const historyQuery = useQuery({
    queryKey: ['senseCheckHistory'],
    queryFn: () => getSenseCheckHistory(20),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const checkMutation = useMutation({
    mutationFn: (body: SenseCheckBody) => senseCheck(body),
    onSuccess: (result) => {
      setCurrent(result);
      qc.invalidateQueries({ queryKey: ['senseCheckHistory'] });
      track('sense_check_run', { verdict: result.verdict });
    },
    onError: (err: unknown) => {
      const code = httpStatus(err);
      if (code === 500 || code === 422) {
        showToast({ message: '无法解析，换一张图或链接试试', kind: 'error' });
      }
      // Other errors handled by the axios interceptor.
    },
  });

  const onUpload = async () => {
    setUploading(true);
    try {
      const picked = await pickAndUploadImage('sense');
      if (picked) {
        setImageUri(picked.uri);
        setImageUrl(picked.url);
      }
    } catch (e) {
      showToast({ message: uploadErrorMessage(e), kind: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const runCheck = () => {
    if (imageUrl) checkMutation.mutate({ imageUrl });
    else if (url.trim()) checkMutation.mutate({ sourceUrl: url.trim() });
  };

  const canCheck = (!!imageUrl || url.trim().length > 0) && !checkMutation.isPending && !uploading;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader title="该不该买" onBack={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Input */}
        <View style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, gap: 12, ...shadow.soft }}>
          {imageUri ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image
                source={{ uri: imageUri }}
                style={{ width: 56, height: 56, borderRadius: radius.sm }}
                resizeMode="cover"
              />
              <Text style={{ ...type.footnote, color: T.ink2, flex: 1 }}>已选商品图</Text>
              <Pressable
                onPress={() => {
                  setImageUri(null);
                  setImageUrl(null);
                }}
                hitSlop={8}
              >
                <SystemIcon name="x" size={16} color={T.ink3} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onUpload}
              disabled={uploading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: colors.separator,
                borderStyle: 'dashed',
              }}
            >
              {uploading ? (
                <ActivityIndicator color={T.accent} />
              ) : (
                <>
                  <SystemIcon name="camera" size={18} color={T.accent} strokeWidth={1.8} />
                  <Text style={{ ...type.callout, color: T.ink2 }}>上传商品图（相册）</Text>
                </>
              )}
            </Pressable>
          )}

          <Text style={{ ...type.footnote, color: T.ink3 }}>或粘贴商品链接</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            editable={!imageUrl}
            placeholder="https://..."
            placeholderTextColor={colors.quaternaryLabel}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{
              backgroundColor: T.bg,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 12,
              ...type.body,
              color: T.ink,
              opacity: imageUrl ? 0.4 : 1,
            }}
          />
          <Pressable
            onPress={runCheck}
            disabled={!canCheck}
            style={{
              minHeight: 50,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: colors.label,
              opacity: canCheck ? 1 : 0.42,
            }}
          >
            <Text style={{ ...type.body, fontWeight: '700', color: colors.inverse }}>
              {checkMutation.isPending ? '检查中…' : '检查一下'}
            </Text>
          </Pressable>
        </View>

        {/* Current result */}
        {current ? <ResultCard result={current} /> : null}

        {/* History */}
        {historyQuery.data && historyQuery.data.length > 0 ? (
          <View>
            <Text style={{ ...type.headline, color: T.ink, marginBottom: 12 }}>最近检查</Text>
            <View style={{ gap: 10 }}>
              {historyQuery.data.map((h) => {
                const v = VERDICT[h.verdict] ?? { label: h.verdict, color: T.ink, bg: T.cardSoft };
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => setCurrent(h)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: T.card,
                      borderRadius: radius.lg,
                      padding: 12,
                      ...shadow.soft,
                    }}
                  >
                    <HistoryThumb imageUrl={h.imageUrl} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...type.body, color: T.ink }} numberOfLines={1}>
                        {h.sourceUrl || '商品图'}
                      </Text>
                      <Text style={{ ...type.caption, color: T.ink3, marginTop: 2 }} numberOfLines={1}>
                        {h.reason}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: v.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ ...type.caption, color: v.color, fontWeight: '700' }}>{v.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
