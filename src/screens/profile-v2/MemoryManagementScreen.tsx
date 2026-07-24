import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import {
  clearLearnedMemory,
  deleteMemoryItem,
  getLearnedMemory,
  markMemoryWrong,
  type MemoryItem,
} from '@/api/profile';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingBlock } from '@/components/feedback/LoadingBlock';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { useToastStore } from '@/store/toast';
import { colors, radius, type } from '@/theme/design';

// "衣然记住的关于你" (brief v0.9 §10.3), wired to BE#83 /v1/profile/memory.
// Every entry is real (never fabricated) and carries the two promised controls:
// [这不准] (mark-wrong — audited server-side as a correction signal) and [删除].
// A flag-off backend answers 403 (silent) and the screen keeps the honest
// empty copy.
const SOURCE_LABEL: Record<MemoryItem['source'], I18nKey> = {
  explicit: 'privacy.memory.source.explicit',
  feedback: 'privacy.memory.source.feedback',
  inferred: 'privacy.memory.source.inferred',
};

const CONFIDENCE_LABEL: Record<MemoryItem['confidence'], I18nKey> = {
  low: 'privacy.memory.confidence.low',
  medium: 'privacy.memory.confidence.medium',
  high: 'privacy.memory.confidence.high',
};

// preference_type → display label key. Falls back to humanizing the raw token.
const MEMORY_TYPE_LABEL: Partial<Record<string, I18nKey>> = {
  style: 'privacy.memory.type.style',
  color: 'privacy.memory.type.color',
  fit: 'privacy.memory.type.fit',
  occasion: 'privacy.memory.type.occasion',
  brand: 'privacy.memory.type.brand',
  material: 'privacy.memory.type.material',
  formality: 'privacy.memory.type.formality',
  climate: 'privacy.memory.type.climate',
  footwear: 'privacy.memory.type.footwear',
  negative_preference: 'privacy.memory.type.negative_preference',
};

function MemoryChip({
  item,
  busy,
  onMarkWrong,
  onDelete,
}: {
  item: MemoryItem;
  busy: boolean;
  onMarkWrong: () => void;
  onDelete: () => void;
}) {
  const { t } = useT();

  const typeKey = MEMORY_TYPE_LABEL[item.type];
  const typeLabel = typeKey ? t(typeKey) : item.type.replace(/_/g, ' ');
  const chipText = `${item.label} · ${typeLabel}`;

  const handlePress = () => {
    const sourceText = t(SOURCE_LABEL[item.source]);
    const confidenceText = t(CONFIDENCE_LABEL[item.confidence]);
    Alert.alert(
      item.label,
      `${typeLabel}  ·  ${sourceText}  ·  ${confidenceText}`,
      [
        {
          text: t('privacy.memory.markWrong'),
          onPress: onMarkWrong,
        },
        {
          text: t('privacy.memory.delete'),
          style: 'destructive',
          onPress: onDelete,
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={handlePress}
      hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
      style={{
        minHeight: 36,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        backgroundColor: colors.secondaryElevated,
        borderWidth: 1,
        borderColor: colors.separatorSoft,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          ...type.footnote,
          color: busy ? colors.quaternaryLabel : colors.label,
        }}
        numberOfLines={1}
      >
        {chipText}
      </Text>
    </Pressable>
  );
}

function MemorySection({
  titleKey,
  items,
  busy,
  onMarkWrong,
  onDelete,
}: {
  titleKey: I18nKey;
  items: MemoryItem[];
  busy: boolean;
  onMarkWrong: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useT();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...type.callout, color: colors.secondaryLabel }}>{t(titleKey)}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item) => (
          <MemoryChip
            key={item.id}
            item={item}
            busy={busy}
            onMarkWrong={() => onMarkWrong(item.id)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

export function MemoryManagementScreen() {
  const { t } = useT();
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const memoryQuery = useQuery({
    queryKey: ['learnedMemory'],
    queryFn: getLearnedMemory,
    retry: 1,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['learnedMemory'] });

  const markWrongMutation = useMutation({
    mutationFn: markMemoryWrong,
    onSuccess: () => {
      showToast({ message: t('privacy.memory.markedWrong'), kind: 'success' });
      invalidate();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMemoryItem,
    onSuccess: () => {
      showToast({ message: t('privacy.memory.deleted'), kind: 'success' });
      invalidate();
    },
  });
  const clearMutation = useMutation({
    mutationFn: clearLearnedMemory,
    onSuccess: () => {
      showToast({ message: t('privacy.memory.clearedAll'), kind: 'success' });
      invalidate();
    },
  });

  const confirmClearAll = () => {
    Alert.alert(t('privacy.memory.clearAll.title'), t('privacy.memory.clearAll.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('privacy.memory.clearAll.confirm'),
        style: 'destructive',
        onPress: () => clearMutation.mutate(),
      },
    ]);
  };

  const busy = markWrongMutation.isPending || deleteMutation.isPending || clearMutation.isPending;
  const items = memoryQuery.data ?? [];
  const unavailable =
    memoryQuery.isError &&
    (memoryQuery.error as { response?: { status?: number } })?.response?.status === 403;

  const positiveItems = items.filter((i) => i.polarity === 'positive');
  const negativeItems = items.filter((i) => i.polarity === 'negative');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ ...type.title1, color: colors.label }}>{t('privacy.memory.title')}</Text>
        <Text style={{ ...type.body, color: colors.tertiaryLabel }}>
          {t('privacy.memory.subtitle')}
        </Text>
      </View>

      {memoryQuery.isLoading ? (
        <LoadingBlock />
      ) : memoryQuery.isError && !unavailable ? (
        <ErrorState onRetry={() => memoryQuery.refetch()} />
      ) : items.length === 0 ? (
        // Flag-off (403, silent) and genuinely-empty both land on honest copy.
        <View
          style={{
            borderRadius: radius.lg,
            backgroundColor: colors.secondaryElevated,
            borderWidth: 1,
            borderColor: colors.separatorSoft,
            padding: 24,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <SystemIcon name="sparkle" size={22} color={colors.quaternaryLabel} strokeWidth={1.8} />
          <Text style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center' }}>
            {t('privacy.memory.empty')}
          </Text>
        </View>
      ) : (
        <>
          <MemorySection
            titleKey="privacy.memory.section.positive"
            items={positiveItems}
            busy={busy}
            onMarkWrong={(id) => markWrongMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
          <MemorySection
            titleKey="privacy.memory.section.negative"
            items={negativeItems}
            busy={busy}
            onMarkWrong={(id) => markWrongMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={confirmClearAll}
            hitSlop={8}
          >
            <Text
              style={{
                ...type.footnote,
                color: busy ? colors.quaternaryLabel : colors.danger,
                textAlign: 'center',
              }}
            >
              {t('privacy.memory.clearAll')}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
