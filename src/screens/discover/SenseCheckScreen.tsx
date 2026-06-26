import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getSenseCheckHistory, senseCheck } from '@/api/shopping';
import { getWardrobeItem } from '@/api/wardrobe';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ImageThumb } from '@/components/ui/ImageThumb';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Tag } from '@/components/ui/Tag';
import { useT, type UseT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import type { I18nKey } from '@/i18n';
import { resolveItemDisplayName } from '@/i18n/domainLabels';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { I18nMessage, SenseCheckBody, SenseCheckResult, WardrobeItem } from '@/types/api';
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

const VERDICT: Record<string, { labelKey: I18nKey; color: string; bg: string }> = {
  buy: { labelKey: 'sense_check.verdict.buy', color: colors.success, bg: colors.successBg },
  consider: { labelKey: 'sense_check.verdict.consider', color: colors.warning, bg: colors.warningBg },
  skip: { labelKey: 'sense_check.verdict.skip', color: colors.danger, bg: colors.dangerBg },
};

const THUMB = 44;

const SENSE_REASON_KEYS = [
  'sense_check.skip.duplicate',
  'sense_check.buy.gap',
  'sense_check.buy.versatile',
  'sense_check.consider.some',
] as const satisfies readonly I18nKey[];

type SenseReasonKey = (typeof SENSE_REASON_KEYS)[number];

function isSenseReasonKey(key: string): key is SenseReasonKey {
  return (SENSE_REASON_KEYS as readonly string[]).includes(key);
}

function stringParam(message: I18nMessage | null | undefined, key: string): string | null {
  const value = message?.params?.[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

function numberParam(message: I18nMessage | null | undefined, key: string): number | null {
  const value = message?.params?.[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function displayReason(result: SenseCheckResult, t: UseT): string {
  const message = result.displayReason;
  if (message?.key && isSenseReasonKey(message.key)) {
    return t.t(message.key, {
      count:
        numberParam(message, 'count') ??
        result.similarItemCount ??
        result.pairableCount ??
        result.outfitPotential,
      category: t.tEnum('category', stringParam(message, 'category')),
      color: t.tEnum('color', stringParam(message, 'color')),
    });
  }
  if (message?.fallbackText) return message.fallbackText;
  if (result.fallbackText) return result.fallbackText;
  // API_GAP[BE]: sense-check display_reason missing on older payloads.
  return t.locale === 'en-US' && result.reason ? result.reason : t.t('sense_check.reason.pending');
}

function outfitPotentialCopy(result: SenseCheckResult, t: UseT): string {
  const count = result.pairableCount ?? result.outfitPotential;
  const similar = result.similarItemCount ?? result.similarItems.length;
  if (result.verdict === 'skip') {
    return similar > 0
      ? t.t('sense_check.potential.skipWithSimilar', { count, similar })
      : t.t('sense_check.potential.skip', { count });
  }
  if (result.verdict === 'buy') return t.t('sense_check.potential.buy', { count });
  return t.t('sense_check.potential.consider', { count });
}

function similarFallback(item: WardrobeItem | undefined, t: UseT): string {
  if (!item) return t.t('ask.itemFallback');
  return (
    resolveItemDisplayName(t.locale, {
      name: item.name,
      nameSource: item.nameSource,
      displayName: item.displayName,
      localizedNames: item.localizedNames,
    }) ||
    [t.tEnum('category', item.category), t.tEnum('color', item.color)].filter(Boolean).join(' · ') ||
    t.t('ask.itemFallback')
  );
}

function ResultCard({ result, t }: { result: SenseCheckResult; t: UseT }) {
  const verdict = VERDICT[result.verdict] ?? null;
  const label = verdict ? t.t(verdict.labelKey) : result.verdict;
  const color = verdict?.color ?? T.ink;
  const bg = verdict?.bg ?? T.cardSoft;
  const ids = useMemo(() => result.similarItems.map((s) => s.itemId), [result.similarItems]);
  const itemQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['wardrobeItem', id],
      queryFn: () => getWardrobeItem(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  return (
    <View style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, gap: 14, ...shadow.soft }}>
      <View style={{ gap: 8 }}>
        <Text style={{ ...type.caption, color: T.ink3 }}>{t.t('sense_check.section.decision')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ backgroundColor: bg, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ ...type.title2, color }}>{label}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ ...type.title2, color: T.ink }}>{result.pairableCount ?? result.outfitPotential}</Text>
            <Text style={{ ...type.caption, color: T.ink3 }}>可搭套数</Text>
          </View>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ ...type.caption, color: T.ink3 }}>{t.t('sense_check.section.reason')}</Text>
        <Text style={{ ...type.body, color: T.ink2, lineHeight: 22 }}>{displayReason(result, t)}</Text>
        <Text style={{ ...type.footnote, color: T.ink3, lineHeight: 19 }}>{outfitPotentialCopy(result, t)}</Text>
      </View>

      {result.similarItems.length > 0 ? (
        <View>
          <Text style={{ ...type.footnote, color: T.ink3, marginBottom: 8 }}>衣橱里的相似单品</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {result.similarItems.map((s, index) => {
              const item = itemQueries[index]?.data;
              const fallbackLabel = similarFallback(item, t);
              return (
                <View key={s.itemId} style={{ width: 72 }}>
                  <ImageThumb
                    uri={item?.imageUrl ?? null}
                    size={72}
                    cornerRadius={radius.md}
                    fallbackLabel={fallbackLabel}
                    accessibilityLabel={fallbackLabel}
                  />
                  <Text style={{ ...type.caption, color: T.ink2, marginTop: 6 }} numberOfLines={1}>
                    {fallbackLabel}
                  </Text>
                  <Text style={{ ...type.caption, color: T.accent }}>{Math.round(s.similarity * 100)}% 相似</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {result.wardrobeGap.length > 0 ? (
        <View>
          <Text style={{ ...type.footnote, color: T.ink3, marginBottom: 8 }}>衣橱真正缺的</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {result.wardrobeGap.map((g) => (
              <Tag key={g}>{t.tEnum('category', g) || g}</Tag>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function SenseCheckScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const t = useT();
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
              <ImageThumb
                uri={imageUri}
                size={56}
                cornerRadius={radius.sm}
                fallbackLabel="商品图"
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
        {current ? <ResultCard result={current} t={t} /> : null}

        {/* History */}
        {historyQuery.data && historyQuery.data.length > 0 ? (
          <View>
            <Text style={{ ...type.headline, color: T.ink, marginBottom: 12 }}>最近检查</Text>
            <View style={{ gap: 10 }}>
              {historyQuery.data.map((h) => {
                const v = VERDICT[h.verdict] ?? null;
                const label = v ? t.t(v.labelKey) : h.verdict;
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
                    <ImageThumb
                      uri={h.imageUrl}
                      size={THUMB}
                      cornerRadius={radius.sm}
                      fallbackLabel={h.sourceUrl ? '链接' : '商品图'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...type.body, color: T.ink }} numberOfLines={1}>
                        {h.sourceUrl || '商品图'}
                      </Text>
                      <Text style={{ ...type.caption, color: T.ink3, marginTop: 2 }} numberOfLines={1}>
                        {displayReason(h, t)}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: v?.bg ?? T.cardSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ ...type.caption, color: v?.color ?? T.ink, fontWeight: '700' }}>{label}</Text>
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
