import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  getColorPalette,
  getInsightsSummary,
  getStyleTrend,
  getTopItems,
  getWardrobeHealth,
} from '@/api/insights';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import {
  isWardrobeHealthSparse,
  wardrobeHealthHeadline,
  wardrobeHealthInsightCopy,
} from '@/screens/discover/wardrobeHealth';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { DiscoverStackParamList } from '@/types/navigation';
import { httpStatus } from '@/utils/http';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Insights'>;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
  divider: colors.separator,
};

const SWATCHES = [colors.accent, '#D9C7A6', colors.label, '#8C6F4A', colors.tertiaryLabel, '#C9A876'];

// Severity -> visual emphasis. `high` reads as a focal accent bar, `medium` a
// warm hint, `low` a quiet neutral — never alarming (supportive, non-judgmental).
const SEVERITY_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low: T.ink3,
  medium: colors.warning,
  high: colors.accent,
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: T.card, borderRadius: radius.xl, padding: 16, ...shadow.soft }}>
      <Text style={{ ...type.headline, color: T.ink, marginBottom: 12 }}>{title}</Text>
      {children}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ ...type.title1, color: T.ink }}>{value}</Text>
      <Text style={{ ...type.caption, color: T.ink3, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export function InsightsScreen({ navigation }: Props) {
  const { t, tEnum } = useT();
  const track = useTrack();
  useEffect(() => {
    track('insights_viewed', {});
  }, [track]);

  const summaryQuery = useQuery({ queryKey: ['insights', 'summary'], queryFn: getInsightsSummary, retry: 1 });
  const topQuery = useQuery({ queryKey: ['insights', 'topItems'], queryFn: () => getTopItems(8), retry: 1 });
  const paletteQuery = useQuery({ queryKey: ['insights', 'palette'], queryFn: getColorPalette, retry: 1 });
  const trendQuery = useQuery({ queryKey: ['insights', 'styleTrend'], queryFn: getStyleTrend, retry: 1 });
  // FE #46 — gated by ENABLE_WARDROBE_HEALTH server-side; on 503 (flag off) we
  // simply omit the card (no retry storm) rather than surfacing an error.
  const healthQuery = useQuery({
    queryKey: ['insights', 'wardrobeHealth'],
    queryFn: getWardrobeHealth,
    retry: (count, err) => httpStatus(err) !== 503 && count < 1,
  });

  const { paletteEntries, paletteTotal } = useMemo(() => {
    const entries = Object.entries(paletteQuery.data?.palette ?? {}).sort((a, b) => b[1] - a[1]);
    return { paletteEntries: entries, paletteTotal: entries.reduce((sum, [, n]) => sum + n, 0) };
  }, [paletteQuery.data]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScreenHeader title="衣橱洞察" onBack={() => navigation.goBack()} />

      {summaryQuery.isLoading ? (
        <LoadingBlock label="加载中…" />
      ) : summaryQuery.isError ? (
        <ErrorState onRetry={() => summaryQuery.refetch()} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 100, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Wardrobe health (FE #46) — omitted entirely when the flag is off
              (503) or on any fetch error; severity drives per-row emphasis. */}
          {healthQuery.data
            ? (() => {
                const health = healthQuery.data;
                const sparse = isWardrobeHealthSparse(health.insights);
                // Near-empty wardrobe: the score is not yet meaningful, so show
                // only the encouraging empty state (skip the score + headline).
                if (sparse) {
                  return (
                    <Card title={t('wardrobeHealth.title')}>
                      <Text style={{ ...type.headline, color: T.ink }}>
                        {t('wardrobeHealth.empty.title')}
                      </Text>
                      <Text style={{ ...type.footnote, color: T.ink2, marginTop: 4 }}>
                        {t('wardrobeHealth.empty.description')}
                      </Text>
                    </Card>
                  );
                }
                const { headline, summary } = wardrobeHealthHeadline(health.level, t);
                return (
                  <Card title={t('wardrobeHealth.title')}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                      <Text style={{ ...type.title1, color: T.ink }}>
                        {t('wardrobeHealth.score', { score: health.score })}
                      </Text>
                      <Text style={{ ...type.headline, color: T.ink2 }}>{headline}</Text>
                    </View>
                    <Text style={{ ...type.footnote, color: T.ink3, marginTop: 4 }}>{summary}</Text>

                    <View style={{ marginTop: 14, gap: 14 }}>
                        {health.insights.map((insight, i) => {
                          const copy = wardrobeHealthInsightCopy(insight, t, tEnum);
                          const accent = SEVERITY_COLOR[copy.severity];
                          return (
                            <View
                              key={`${insight.type}-${i}`}
                              style={{ flexDirection: 'row', gap: 10 }}
                            >
                              <View
                                style={{
                                  width: 3,
                                  borderRadius: 2,
                                  backgroundColor: accent,
                                  alignSelf: 'stretch',
                                }}
                              />
                              <View style={{ flex: 1 }}>
                                <View
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                >
                                  <Text style={{ ...type.callout, color: T.ink, flex: 1, fontWeight: '600' }}>
                                    {copy.title}
                                  </Text>
                                  <Text style={{ ...type.caption, color: accent, fontWeight: '700' }}>
                                    {copy.severityLabel}
                                  </Text>
                                </View>
                                <Text style={{ ...type.footnote, color: T.ink2, marginTop: 2 }}>
                                  {copy.suggestion}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                  </Card>
                );
              })()
            : null}

          {/* Summary */}
          {summaryQuery.data ? (
            <Card title="概览">
              <View style={{ flexDirection: 'row' }}>
                <Stat value={String(summaryQuery.data.totalItems)} label="总件数" />
                <Stat value={`${Math.round(summaryQuery.data.activeRate * 100)}%`} label="活跃率" />
                <Stat value={String(summaryQuery.data.idleCount)} label="闲置" />
              </View>
            </Card>
          ) : null}

          {/* Top items */}
          {topQuery.data && topQuery.data.length > 0 ? (
            <Card title="最常穿">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {topQuery.data.map((item) => (
                  <View key={item.id} style={{ width: 72 }}>
                    <View
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: radius.md,
                        backgroundColor: T.cardSoft,
                      }}
                    />
                    <Text style={{ ...type.caption, color: T.ink2, marginTop: 6 }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ ...type.caption, color: T.accent }}>{item.wearCount} 次</Text>
                  </View>
                ))}
              </ScrollView>
            </Card>
          ) : null}

          {/* Color palette */}
          {paletteEntries.length > 0 && paletteTotal > 0 ? (
            <Card title="配色分布">
              <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                {paletteEntries.map(([name, count], i) => (
                  <View
                    key={name}
                    style={{
                      width: `${(count / paletteTotal) * 100}%`,
                      backgroundColor: SWATCHES[i % SWATCHES.length],
                    }}
                  />
                ))}
              </View>
              <View style={{ marginTop: 12, gap: 6 }}>
                {paletteEntries.slice(0, 5).map(([name, count], i) => (
                  <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: SWATCHES[i % SWATCHES.length],
                      }}
                    />
                    <Text style={{ ...type.footnote, color: T.ink2, flex: 1 }}>{name}</Text>
                    <Text style={{ ...type.footnote, color: T.ink3 }}>
                      {Math.round((count / paletteTotal) * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Style trend */}
          {trendQuery.data && trendQuery.data.length > 0 ? (
            <Card title="风格趋势">
              <View style={{ gap: 8 }}>
                {trendQuery.data.slice(-6).map((entry) => {
                  const top = Object.entries(entry.tags).sort((a, b) => b[1] - a[1])[0];
                  return (
                    <View
                      key={entry.yearMonth}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Text style={{ ...type.footnote, color: T.ink3 }}>{entry.yearMonth}</Text>
                      <Text style={{ ...type.footnote, color: T.ink2 }}>
                        {top ? `${top[0]} · ${top[1]}` : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}

          {/* Report entry */}
          <Pressable
            onPress={() => navigation.navigate('WardrobeReport')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: T.card,
              borderRadius: radius.lg,
              padding: 16,
              ...shadow.soft,
            }}
          >
            <Text style={{ ...type.headline, color: T.ink }}>查看上半年完整报告</Text>
            <SystemIcon name="chevronRight" size={18} color={T.ink3} />
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
