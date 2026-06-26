import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';

import { deleteInspiration, getStyleTags, listInspirations, updateStyleTags } from '@/api/style';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { HeaderIconButton, ScreenHeader } from '@/components/layout/ScreenHeader';
import { useT } from '@/hooks/useT';
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

// "你的风格" — current global style tags, read via GET /style/tags and edited
// via PATCH (remove on tap, add via the inline input).
function StyleTagsBar() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const tagsQuery = useQuery({ queryKey: ['styleTags'], queryFn: getStyleTags, retry: 1 });
  const tags = tagsQuery.data ?? [];

  const mutation = useMutation({
    mutationFn: (next: string[]) => updateStyleTags(next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['styleTags'] }),
  });

  if (tagsQuery.isLoading || tagsQuery.isError) return null;

  const remove = (t: string) => mutation.mutate(tags.filter((x) => x !== t));
  const add = () => {
    const v = draft.trim();
    if (v && !tags.includes(v) && tags.length < 20) mutation.mutate([...tags, v]);
    setDraft('');
    setAdding(false);
  };

  const chip = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  };

  return (
    <View style={{ paddingHorizontal: spacing.screen, paddingBottom: 12 }}>
      <Text style={{ ...type.footnote, color: T.ink3, marginBottom: 8 }}>你的风格</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {tags.map((t) => (
          <Pressable key={t} onPress={() => remove(t)} style={chip}>
            <Text style={{ ...type.caption, color: T.ink }}>{t}</Text>
            <Text style={{ ...type.caption, color: T.ink3 }}>×</Text>
          </Pressable>
        ))}
        {adding ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            onBlur={add}
            autoFocus
            placeholder="标签"
            placeholderTextColor={colors.quaternaryLabel}
            maxLength={50}
            style={{
              minWidth: 80,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: colors.elevated,
              ...type.caption,
              color: T.ink,
            }}
          />
        ) : tags.length < 20 ? (
          <Pressable
            onPress={() => setAdding(true)}
            style={{ ...chip, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.separator }}
          >
            <Text style={{ ...type.caption, color: T.ink3 }}>＋ 添加</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
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
  const { t } = useT();
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

      <StyleTagsBar />

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
          align="top"
          title={t('discover.inspirations.empty.title')}
          subtitle={t('discover.inspirations.empty.subtitle')}
          primaryAction={{
            label: t('discover.inspirations.empty.cta'),
            onPress: () => navigation.navigate('AddInspiration'),
          }}
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
