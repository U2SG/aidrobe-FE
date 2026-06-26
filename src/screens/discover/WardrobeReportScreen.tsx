import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';

import { getWardrobeReport } from '@/api/insights';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { ImageThumb } from '@/components/ui/ImageThumb';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Tag } from '@/components/ui/Tag';
import { useTrack } from '@/hooks/useTrack';
import { useT, type UseT } from '@/hooks/useT';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { WardrobeReport } from '@/types/api';
import type { DiscoverStackParamList } from '@/types/navigation';
import { httpStatus } from '@/utils/http';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'WardrobeReport'>;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
};

const WEAR_HISTORY_SUFFICIENT_THRESHOLD = 5;

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() < 6 ? 'H1' : 'H2'}`;
}

function buildShareMessage(
  report: WardrobeReport,
  t: UseT['t'],
  keywordSeparator: string,
): string {
  const adoptionRate = Math.round(report.recommendationAdoptionRate * 100);
  const topItem = report.topItems[0];
  const topItemLine = topItem
    ? t('wardrobeReport.shareTopItem', { title: topItem.title, count: topItem.wearCount })
    : '';
  const keywordText = report.styleKeywords.slice(0, 5).join(keywordSeparator);
  const keywordLine = keywordText
    ? t('wardrobeReport.shareKeywords', { keywords: keywordText })
    : '';

  return [
    t('wardrobeReport.shareMessage', {
      label: report.label,
      totalWears: report.totalWears,
      adoptionRate,
    }),
    topItemLine,
    keywordLine,
  ]
    .filter(Boolean)
    .join('\n');
}

export function WardrobeReportScreen({ navigation, route }: Props) {
  const period = route.params?.period ?? currentPeriod();
  const track = useTrack();
  const { locale, t } = useT();
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    track('wardrobe_report_viewed', { period });
  }, [track, period]);

  const reportQuery = useQuery({
    queryKey: ['wardrobeReport', period],
    queryFn: () => getWardrobeReport(period),
    retry: 1,
  });

  const report = reportQuery.data;
  const hero = useMemo(() => {
    if (!report) return null;
    if (report.highestCostPerWear) {
      const h = report.highestCostPerWear;
      const topMatch = report.topItems.find((item) => item.itemId === h.itemId);
      return {
        title: h.title,
        sub: `穿了 ${h.wearCount} 次 · 每次成本 ¥${Math.round(h.costPerWear)}`,
        imageUrl: topMatch?.coverImageUrl ?? null,
        category: topMatch?.category ?? null,
      };
    }
    const top = report.topItems[0];
    return top
      ? {
          title: top.title,
          sub: `穿了 ${top.wearCount} 次`,
          imageUrl: top.coverImageUrl,
          category: top.category,
        }
      : null;
  }, [report]);
  const shareMessage = useMemo(
    () =>
      report
        ? buildShareMessage(report, t, locale === 'zh-CN' ? '、' : ', ')
        : '',
    [locale, report, t],
  );

  const handleShare = async () => {
    if (!report) return;
    try {
      if (report.shareAssetUrl) {
        // Mirror the OOTD poster share flow: append the asset URL to the message
        // so Android (where Share.share's `url` field is iOS-only and dropped)
        // still carries it, while `url` drives the iOS rich-preview.
        await Share.share({
          message: `${shareMessage}\n${report.shareAssetUrl}`,
          url: report.shareAssetUrl,
        });
      } else {
        // API_GAP[untracked]: wardrobe report has no shareable poster/asset URL.
        // Fallback: share a text recap through the native share sheet. See docs/api-gaps.md.
        await Share.share({ message: shareMessage });
      }
    } catch {
      showToast({ message: t('wardrobeReport.shareFailed'), kind: 'error' });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader title="衣橱报告" onBack={() => navigation.goBack()} />

      {reportQuery.isLoading ? (
        <LoadingBlock label="生成报告中…" />
      ) : reportQuery.isError ? (
        httpStatus(reportQuery.error) === 503 ? (
          <EmptyState title="报告尚未开放" description="该功能正在准备中，稍后回来试试。" />
        ) : (
          <ErrorState onRetry={() => reportQuery.refetch()} />
        )
      ) : report && (report.isEmpty || report.totalWears < WEAR_HISTORY_SUFFICIENT_THRESHOLD) ? (
        <EmptyState title={`${report.label} 还没有足够数据`} description="多穿几天，回顾就会精彩起来。" />
      ) : report ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 100, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero story card */}
          <View style={{ backgroundColor: T.ink, borderRadius: radius.xl, padding: 22, ...shadow.elevated }}>
            <Text style={{ ...type.caption, color: T.accent, letterSpacing: 1, fontWeight: '700' }}>
              {report.label}
            </Text>
            <Text style={{ ...type.title2, color: colors.inverse, marginTop: 10 }}>
              这半年你穿出了风格
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 }}>
              <Text style={{ fontSize: 44, lineHeight: 48, fontWeight: '700', color: colors.inverse }}>
                {report.totalWears}
              </Text>
              <Text style={{ ...type.body, color: colors.inverse, opacity: 0.8, marginBottom: 8 }}>
                次穿着
              </Text>
            </View>
            {report.prevTotalWears > 0 ? (
              <Text style={{ ...type.footnote, color: T.accent, marginTop: 6 }}>
                {(() => {
                  const d = Math.round(
                    ((report.totalWears - report.prevTotalWears) / report.prevTotalWears) * 100,
                  );
                  return d > 0 ? `较上期多 ${d}%` : d < 0 ? `较上期少 ${-d}%` : '与上期持平';
                })()}
              </Text>
            ) : null}
            <Text style={{ ...type.footnote, color: colors.inverse, opacity: 0.7, marginTop: 4 }}>
              推荐采纳率 {Math.round(report.recommendationAdoptionRate * 100)}%
            </Text>
          </View>

          {/* Hero item */}
          {hero ? (
            <View style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, ...shadow.soft }}>
              <Text style={{ ...type.caption, color: T.accent, fontWeight: '700' }}>你的本命单品</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <ImageThumb
                  uri={hero.imageUrl}
                  size={56}
                  cornerRadius={radius.md}
                  fallbackLabel={hero.category ?? hero.title}
                  accessibilityLabel={hero.title}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...type.headline, color: T.ink }} numberOfLines={1}>
                    {hero.title}
                  </Text>
                  <Text style={{ ...type.footnote, color: T.ink3, marginTop: 2 }}>{hero.sub}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Style keywords */}
          {report.styleKeywords.length > 0 ? (
            <View style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, ...shadow.soft }}>
              <Text style={{ ...type.headline, color: T.ink, marginBottom: 12 }}>风格关键词</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {report.styleKeywords.map((k) => (
                  <Tag key={k}>{k}</Tag>
                ))}
              </View>
            </View>
          ) : null}

          {/* Share */}
          <Pressable
            onPress={handleShare}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: T.card,
              borderRadius: radius.lg,
              paddingVertical: 16,
              ...shadow.soft,
            }}
          >
            <SystemIcon name="share" size={18} color={T.ink} />
            <Text style={{ ...type.headline, color: T.ink }}>分享我的回顾</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
}
