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

function MemoryRow({
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
  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: colors.secondaryElevated,
        borderWidth: 1,
        borderColor: colors.separatorSoft,
        padding: 16,
        gap: 10,
      }}
    >
      <Text style={{ ...type.body, color: colors.label }}>{item.label}</Text>
      <Text style={{ ...type.caption, color: colors.quaternaryLabel }}>
        {t(SOURCE_LABEL[item.source])}
      </Text>
      <View style={{ flexDirection: 'row', gap: 18 }}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onMarkWrong} hitSlop={8}>
          <Text style={{ ...type.footnote, color: busy ? colors.quaternaryLabel : colors.accent }}>
            {t('privacy.memory.markWrong')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onDelete} hitSlop={8}>
          <Text style={{ ...type.footnote, color: busy ? colors.quaternaryLabel : colors.danger }}>
            {t('privacy.memory.delete')}
          </Text>
        </Pressable>
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
          {items.map((item) => (
            <MemoryRow
              key={item.id}
              item={item}
              busy={busy}
              onMarkWrong={() => markWrongMutation.mutate(item.id)}
              onDelete={() => deleteMutation.mutate(item.id)}
            />
          ))}
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
