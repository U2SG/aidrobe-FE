import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { enableV3PurchaseDecision } from '@/lib/featureFlags';
import { shoppingEntryRoute } from './shoppingEntryRoute';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { DiscoverStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverHub'>;

type IconName = Parameters<typeof SystemIcon>[0]['name'];

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
};

function AskBar({ onPress }: { onPress: () => void }) {
  const { t } = useT();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: T.card,
        borderRadius: radius.pill,
        paddingVertical: 13,
        paddingHorizontal: 16,
        ...shadow.soft,
      }}
    >
      <SystemIcon name="sparkle" size={18} color={T.accent} strokeWidth={1.9} />
      <Text style={{ ...type.callout, color: T.ink3 }}>{t('ask.barHint')}</Text>
    </Pressable>
  );
}

function ToolCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: T.card,
        borderRadius: radius.lg,
        padding: 14,
        gap: 10,
        ...shadow.soft,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: radius.md,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SystemIcon name={icon} size={20} color={T.accent} strokeWidth={1.9} />
      </View>
      <View>
        <Text style={{ ...type.headline, color: T.ink }}>{title}</Text>
        <Text style={{ ...type.caption, color: T.ink3, marginTop: 2 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export function DiscoverHubScreen({ navigation }: Props) {
  const track = useTrack();

  useEffect(() => {
    track('discover_viewed', {});
  }, [track]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingTop: 52, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...type.largeTitle, color: T.ink }}>发现</Text>
        <Text style={{ ...type.callout, color: T.ink3, marginTop: 4, marginBottom: 18 }}>
          衣橱工具与本季洞察
        </Text>

        <AskBar onPress={() => navigation.navigate('AskAidrobe')} />

        {/* Report hero */}
        <Pressable
          onPress={() => navigation.navigate('WardrobeReport')}
          style={{
            marginTop: 16,
            backgroundColor: T.ink,
            borderRadius: radius.xl,
            padding: 20,
            ...shadow.elevated,
          }}
        >
          <Text style={{ ...type.caption, color: T.accent, letterSpacing: 1, fontWeight: '700' }}>
            2026 · 上半年
          </Text>
          <Text style={{ ...type.title2, color: colors.inverse, marginTop: 8 }}>
            你的衣橱报告已就绪
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
            <Text style={{ ...type.callout, color: colors.inverse, opacity: 0.85 }}>查看年度回顾</Text>
            <SystemIcon name="chevronRight" size={16} color={colors.inverse} />
          </View>
        </Pressable>

        {/* Tools */}
        <Text style={{ ...type.headline, color: T.ink, marginTop: 24, marginBottom: 12 }}>工具</Text>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ToolCard
              icon="suitcase"
              title="打包清单"
              subtitle="按天数 · 场景生成"
              onPress={() => navigation.navigate('PackingList')}
            />
            {/* V3-009 — the same natural entrance (§5.2), repointed at the V3
                decision card while the flag is on. No second card: two
                identically named tools would be exactly the 卡片汤 §9.1
                forbids, and V3 adds no main mental model (§3.3). Flag off (its
                default) keeps the V2 SenseCheck path unchanged. */}
            <ToolCard
              icon="bag"
              title="该不该买"
              subtitle="对照现有衣橱"
              onPress={() => navigation.navigate(shoppingEntryRoute(enableV3PurchaseDecision))}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ToolCard
              icon="chart"
              title="衣橱洞察"
              subtitle="最常穿 · 闲置 · 配色"
              onPress={() => navigation.navigate('Insights')}
            />
            <ToolCard
              icon="bookmark"
              title="风格灵感"
              subtitle="收藏图 · 学习风格"
              onPress={() => navigation.navigate('StyleInspirations')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
