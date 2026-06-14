import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { deleteInspiration, listInspirations } from '@/api/style';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { Inspiration } from '@/types/api';
import type { DiscoverStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'StyleInspirations'>;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
};

const SOURCE_LABEL: Record<string, string> = {
  inspiration_image: 'IMG',
  pdf_magazine: 'PDF',
  link: 'LINK',
};

function statusCode(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

function InspoCard({ item, onDelete }: { item: Inspiration; onDelete: () => void }) {
  const learned = item.learnStatus === 'learned';
  return (
    <Pressable
      onLongPress={onDelete}
      style={{ width: '48%', marginBottom: 12, borderRadius: radius.lg, overflow: 'hidden', ...shadow.soft }}
    >
      <View style={{ aspectRatio: 0.8, backgroundColor: T.cardSoft }}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : null}
        {/* Source badge */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: colors.label,
            borderRadius: radius.xs,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ ...type.caption, color: colors.inverse, fontWeight: '700' }}>
            {SOURCE_LABEL[item.sourceType] ?? item.sourceType}
          </Text>
        </View>
        {/* Learn status */}
        <View
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: learned ? colors.successBg : colors.warningBg,
            borderRadius: radius.pill,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <View
            style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: learned ? colors.success : colors.warning }}
          />
          <Text style={{ ...type.caption, color: learned ? colors.success : colors.warning, fontWeight: '600' }}>
            {learned ? '已学习' : '学习中'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function StyleInspirationsScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const track = useTrack();
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    track('inspiration_viewed', {});
  }, [track]);

  const query = useQuery({
    queryKey: ['inspirations'],
    queryFn: () => listInspirations({ limit: 50 }),
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInspiration(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspirations'] });
      showToast({ message: '已删除', kind: 'success' });
    },
  });

  const confirmDelete = (item: Inspiration) =>
    Alert.alert('删除灵感', '确定从灵感库移除？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);

  const items = query.data?.items ?? [];

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
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
          <Text style={{ ...type.title2, color: T.ink }}>风格灵感</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('AddInspiration')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: T.ink,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.soft,
          }}
        >
          <Text style={{ fontSize: 22, color: colors.inverse, marginTop: -2 }}>＋</Text>
        </Pressable>
      </View>

      {query.isLoading ? (
        <LoadingBlock label="加载中…" />
      ) : query.isError ? (
        statusCode(query.error) === 503 ? (
          <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 }}>
            <Text style={{ ...type.headline, color: T.ink, textAlign: 'center' }}>风格灵感尚未开放</Text>
            <Text style={{ ...type.callout, color: T.ink3, textAlign: 'center', marginTop: 8 }}>
              该功能正在准备中，稍后回来试试。
            </Text>
          </View>
        ) : (
          <ErrorState onRetry={() => query.refetch()} />
        )
      ) : items.length === 0 ? (
        <EmptyState
          title="还没有风格灵感"
          description="收藏喜欢的穿搭图或杂志，帮 Aidrobe 学你的风格"
          ctaLabel="添加灵感"
          onCtaPress={() => navigation.navigate('AddInspiration')}
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {items.map((item) => (
              <InspoCard key={item.id} item={item} onDelete={() => confirmDelete(item)} />
            ))}
          </View>
          <Text style={{ ...type.caption, color: T.ink3, textAlign: 'center', marginTop: 8 }}>
            长按可移除灵感
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
