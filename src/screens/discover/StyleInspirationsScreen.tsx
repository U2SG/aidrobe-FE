import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Alert, FlatList, Image, Pressable, Text, View } from 'react-native';

import { deleteInspiration, listInspirations } from '@/api/style';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { HeaderIconButton, ScreenHeader } from '@/components/layout/ScreenHeader';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { Inspiration } from '@/types/api';
import type { DiscoverStackParamList } from '@/types/navigation';
import { httpStatus } from '@/utils/http';

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
      <ScreenHeader
        title="风格灵感"
        onBack={() => navigation.goBack()}
        right={<HeaderIconButton icon="plus" dark onPress={() => navigation.navigate('AddInspiration')} />}
      />

      {query.isLoading ? (
        <LoadingBlock label="加载中…" />
      ) : query.isError ? (
        httpStatus(query.error) === 503 ? (
          <EmptyState title="风格灵感尚未开放" description="该功能正在准备中，稍后回来试试。" />
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
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <InspoCard item={item} onDelete={() => confirmDelete(item)} />
          )}
          ListFooterComponent={
            <Text style={{ ...type.caption, color: T.ink3, textAlign: 'center', marginTop: 8 }}>
              长按可移除灵感
            </Text>
          }
        />
      )}
    </View>
  );
}
