import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getWardrobeReport } from '@/api/insights';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Tag } from '@/components/ui/Tag';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
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

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() < 6 ? 'H1' : 'H2'}`;
}

export function WardrobeReportScreen({ navigation, route }: Props) {
  const period = route.params?.period ?? currentPeriod();
  const track = useTrack();
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
      return { title: h.title, sub: `穿了 ${h.wearCount} 次 · 每次成本 ¥${Math.round(h.costPerWear)}` };
    }
    const top = report.topItems[0];
    return top ? { title: top.title, sub: `穿了 ${top.wearCount} 次` } : null;
  }, [report]);

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
      ) : report && report.isEmpty ? (
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
            <Text style={{ ...type.footnote, color: colors.inverse, opacity: 0.7, marginTop: 4 }}>
              推荐采纳率 {Math.round(report.recommendationAdoptionRate * 100)}%
            </Text>
          </View>

          {/* Hero item */}
          {hero ? (
            <View style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, ...shadow.soft }}>
              <Text style={{ ...type.caption, color: T.accent, fontWeight: '700' }}>你的本命单品</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: T.cardSoft }} />
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
            onPress={() => showToast({ message: '分享即将上线', kind: 'info' })}
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
