import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  getColorPalette,
  getInsightsSummary,
  getStyleTrend,
  getTopItems,
} from '@/api/insights';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { DiscoverStackParamList } from '@/types/navigation';

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
  const track = useTrack();
  useEffect(() => {
    track('insights_viewed', {});
  }, [track]);

  const summaryQuery = useQuery({ queryKey: ['insights', 'summary'], queryFn: getInsightsSummary, retry: 1 });
  const topQuery = useQuery({ queryKey: ['insights', 'topItems'], queryFn: () => getTopItems(8), retry: 1 });
  const paletteQuery = useQuery({ queryKey: ['insights', 'palette'], queryFn: getColorPalette, retry: 1 });
  const trendQuery = useQuery({ queryKey: ['insights', 'styleTrend'], queryFn: getStyleTrend, retry: 1 });

  const palette = paletteQuery.data?.palette ?? {};
  const paletteEntries = Object.entries(palette).sort((a, b) => b[1] - a[1]);
  const paletteTotal = paletteEntries.reduce((sum, [, n]) => sum + n, 0);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 52,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: T.card,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.soft,
          }}
        >
          <SystemIcon name="chevronLeft" size={18} color={T.ink} />
        </Pressable>
        <Text style={{ ...type.title2, color: T.ink }}>衣橱洞察</Text>
      </View>

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
