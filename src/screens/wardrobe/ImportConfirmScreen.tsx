import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { confirmImportTask, confirmImportTaskItems, getImportTask } from '@/api/importTasks';
import { ProcessingOverlay } from '@/components/feedback/ProcessingOverlay';
import { SaveBar } from '@/components/feedback/SaveBar';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { enableMvpV2Ui } from '@/lib/featureFlags';
import { invalidateAfterConfirmImport } from '@/state/invalidation';
import { confirmationBudgetForImport } from '@/utils/timeUX';
import { phaseFromFlags } from '@/state/operationState';
import { useImportDraftStore } from '@/store/importDraft';
import { colors, shadow } from '@/theme/design';
import type { ConfirmImportTaskBody, FitIntent, ImportTask, ItemCategory } from '@/types/api';
import type { WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'ImportConfirm'>;

const CATEGORY_KEYS: ItemCategory[] = ['top', 'bottom', 'outerwear', 'dress', 'shoes', 'accessory'];
const FIT_KEYS: FitIntent[] = ['fitted', 'regular', 'relaxed', 'oversized'];

const T = {
  bg: colors.groupedBackground,
  bgAlt: colors.background,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  cardInner: colors.background,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  ink4: colors.quaternaryLabel,
  divider: colors.separator,
  accent: colors.accent,
  ok: colors.success,
  shadowSm: shadow.soft,
};

export function ImportConfirmScreen({ navigation, route }: Props) {
  const { t, tEnum } = useT();
  const CATEGORY_OPTIONS = CATEGORY_KEYS.map((id) => ({ id, label: tEnum('category', id) }));
  const FIT_OPTIONS = FIT_KEYS.map((id) => ({ id, label: tEnum('fitIntent', id) }));
  const { taskId, queue, queueIndex } = route.params;
  // Multi-image batch: confirm this task, then advance to the next one.
  const queueLen = queue?.length ?? 0;
  const inQueue = queueLen > 1;
  const idx = queueIndex ?? 0;
  const total = inQueue ? queueLen : 1;
  const current = inQueue ? idx + 1 : 1;
  const goNextOrExit = () => {
    const nextId = queue && queue[idx + 1];
    if (nextId) {
      navigation.replace('ImportConfirm', { taskId: nextId, queue, queueIndex: idx + 1 });
    } else if (enableMvpV2Ui) {
      // V2: after the last item, land on the First Outfit activation gate
      // instead of dropping the user back onto the list.
      navigation.replace('FirstOutfit');
    } else {
      navigation.popToTop();
    }
  };
  const qc = useQueryClient();
  const resetDraft = useImportDraftStore((state) => state.reset);
  const localImageUri = useImportDraftStore((state) => state.localImageUri);
  const track = useTrack();

  const query = useQuery({
    queryKey: ['importTask', taskId],
    queryFn: () => getImportTask(taskId),
    refetchInterval: (queryInfo) =>
      queryInfo.state.data?.status === 'waiting_confirm' ||
      queryInfo.state.data?.status === 'failed'
        ? false
        : 1500,
  });

  const [form, setForm] = useState<ConfirmImportTaskBody>({ name: '', category: 'top', color: '' });
  const [selectedFit, setSelectedFit] = useState('regular');
  const [saving, setSaving] = useState(false);
  // Surfaces save failure inline (in the SaveBar) instead of a 2.5s toast that
  // vanishes. The edited `form` state is never touched on failure, so retrying
  // resubmits the same content with no re-typing.
  const [saveFailed, setSaveFailed] = useState(false);
  // Synchronous gate: `saving` state only disables the button after a re-render,
  // so two taps in the same frame can both fire confirmImportTask -> duplicate
  // item. The ref blocks the second call immediately, before React re-renders.
  const savingRef = useRef(false);

  useEffect(() => { track('import_confirm_viewed', { taskId }); }, [taskId, track]);

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    if (data.status === 'failed') {
      navigation.replace('ImportFailure', { reason: data.errorReason ?? 'recognition_failed' });
      return;
    }
    if (data.status === 'waiting_confirm' && data.recognized) {
      setForm({
        name: data.recognized.name ?? '',
        category: data.recognized.category ?? 'top',
        color: data.recognized.color ?? '',
      });
    }
  }, [query.data, navigation]);

  const data = query.data;
  if (!data || data.status !== 'waiting_confirm') {
    return <ProcessingOverlay title={t('import.recognizing')} />;
  }

  // BE#24/#25 — one photo can yield multiple candidates. Single (<=1) keeps the
  // existing form below; multi (>1) shows the batch select/edit + confirm-items.
  if (data.candidateItems.length > 1) {
    return (
      <MultiCandidateConfirm
        task={data}
        current={current}
        total={total}
        inQueue={inQueue}
        onClose={() => navigation.popToTop()}
        onAdvance={goNextOrExit}
      />
    );
  }

  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    try {
      await confirmImportTask(taskId, form);
      track('item_saved', { taskId });
      // confirm import → wardrobeItems, todayRecommendation (see state/invalidation).
      invalidateAfterConfirmImport(qc);
      resetDraft();
      goNextOrExit();
    } catch {
      // Leave `form` untouched so the user's edits survive; surface the error
      // inline in the SaveBar instead of a transient toast.
      setSaveFailed(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const savePhase = phaseFromFlags({ pending: saving, failed: saveFailed, busyPhase: 'saving' });

  // In batch mode the cached draft uri only matches one task, so prefer the
  // task's own (server) image; single mode keeps the instant local preview.
  const imageUri = inQueue ? data.imageUrl ?? null : localImageUri ?? data.imageUrl ?? null;

  // Real confidence from the recognizer (0-1). Fall back to hiding the badge
  // rather than showing a hardcoded number.
  const score = data.recognized?.confidenceScore;
  const confidencePct =
    typeof score === 'number' ? Math.round(Math.max(0, Math.min(1, score)) * 100) : null;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Nav */}
      <View style={{ paddingTop: 52, paddingHorizontal: 16, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={() => navigation.popToTop()}>
          <SystemIcon name="x" size={22} color={T.ink2} />
        </Pressable>
        <Text style={{ fontSize: 13, color: T.ink2 }}>{t('import.progress', { current, total })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 26, fontWeight: '600', color: T.ink, lineHeight: 32, marginBottom: 6 }}>
          {t('import.confirmTitle')}
        </Text>
        <Text style={{ fontSize: 12, color: T.ink3, marginBottom: 18 }}>
          {confidencePct !== null
            ? t('import.confidence', { pct: confidencePct })
            : t('import.confidenceUnknown')}
        </Text>

        {/* Late-night low-friction hint (brief §6.4): past the confirmation
            budget, nudge "先收下，之后再整理" instead of pressing for edits. */}
        {confirmationBudgetForImport(new Date()) === 0 ? (
          <View
            style={{
              backgroundColor: colors.secondaryElevated,
              borderRadius: 12,
              padding: 12,
              marginBottom: 18,
            }}
          >
            <Text style={{ fontSize: 13, color: T.ink2, lineHeight: 19 }}>{t('import.lateNightHint')}</Text>
          </View>
        ) : null}

        {/* Image */}
        <View
          style={{
            height: 240,
            backgroundColor: T.card,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            ...T.shadowSm,
            marginBottom: 18,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          ) : (
            <GarmentSvg kind="shirt" size={150} />
          )}
          {confidencePct !== null && (
            <View
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: 'rgba(26,23,20,0.8)',
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#9ED9A1' }} />
              <Text style={{ fontSize: 10, color: colors.inverse, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                {t('import.confidenceBadge', { pct: confidencePct })}
              </Text>
            </View>
          )}
        </View>

        {/* Name field */}
        <View style={{ backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 12, ...T.shadowSm }}>
          <Text style={{ fontSize: 11, color: T.ink3, marginBottom: 6 }}>{t('import.fieldName')}</Text>
          <TextInput
            value={form.name}
            onChangeText={(name) => setForm((c) => ({ ...c, name }))}
            placeholder={t('import.namePlaceholder')}
            placeholderTextColor={T.ink4}
            style={{ fontSize: 17, fontWeight: '600', color: T.ink }}
          />
        </View>

        {/* Category */}
        <FieldGroup label={t('import.fieldCategory')}>
          {CATEGORY_OPTIONS.map((o) => (
            <ChoiceChip
              key={o.id}
              active={form.category === o.id}
              onPress={() => setForm((c) => ({ ...c, category: o.id }))}
              label={o.label}
            />
          ))}
        </FieldGroup>

        {/* Color */}
        <View style={{ backgroundColor: T.card, borderRadius: 14, padding: 14, marginBottom: 12, ...T.shadowSm }}>
          <Text style={{ fontSize: 11, color: T.ink3, marginBottom: 6 }}>{t('import.fieldColor')}</Text>
          <TextInput
            value={form.color}
            onChangeText={(color) => setForm((c) => ({ ...c, color }))}
            placeholder={t('import.colorPlaceholder')}
            placeholderTextColor={T.ink4}
            style={{ fontSize: 15, color: T.ink }}
          />
        </View>

        {/* Fit */}
        <FieldGroup label={t('import.fieldFit')}>
          {FIT_OPTIONS.map((o) => (
            <ChoiceChip
              key={o.id}
              active={selectedFit === o.id}
              onPress={() => setSelectedFit(o.id)}
              label={o.label}
            />
          ))}
        </FieldGroup>

        {/* Info note */}
        <View style={{ marginTop: 14, padding: 12, backgroundColor: T.cardSoft, borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: T.ink2, lineHeight: 19 }}>
            {t('import.note')}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky save bar: shows pending/error inline; error keeps form intact. */}
      <SaveBar
        phase={savePhase}
        saveLabel={t('import.save')}
        onSave={save}
        secondaryLabel={inQueue ? t('import.skip') : t('import.reshoot')}
        onSecondary={() => (inQueue ? goNextOrExit() : navigation.popToTop())}
        errorText={t('import.saveBarError')}
      />
    </View>
  );
}

type CandidateDraft = {
  key: string;
  tempItemId: string | null;
  selected: boolean;
  name: string;
  category: ItemCategory;
  color: string;
  imageUrl: string | null;
};

// BE#24/#25 — batch select + edit + confirm for a single photo that yielded
// multiple candidates. Unselected candidates are simply not imported.
function MultiCandidateConfirm({
  task,
  current,
  total,
  inQueue,
  onClose,
  onAdvance,
}: {
  task: ImportTask;
  current: number;
  total: number;
  inQueue: boolean;
  onClose: () => void;
  onAdvance: () => void;
}) {
  const { t, tEnum } = useT();
  const CATEGORY_OPTIONS = CATEGORY_KEYS.map((id) => ({ id, label: tEnum('category', id) }));
  const qc = useQueryClient();
  const track = useTrack();
  const resetDraft = useImportDraftStore((state) => state.reset);

  const [drafts, setDrafts] = useState<CandidateDraft[]>(() =>
    task.candidateItems.map((c, i) => ({
      key: c.tempItemId ?? `idx-${i}`,
      tempItemId: c.tempItemId,
      // Default-select the recommended candidates; a candidate with no
      // temp_item_id can't be batch-confirmed, so it can't be selected.
      selected: c.shouldImport && c.tempItemId !== null,
      name: c.name,
      category: c.category,
      color: c.colorMain,
      imageUrl: c.imageUrl,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savingRef = useRef(false);

  const update = (key: string, patch: Partial<CandidateDraft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  const selectedCount = drafts.filter((d) => d.selected && d.tempItemId !== null).length;

  const save = async () => {
    if (savingRef.current || selectedCount === 0) return;
    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    try {
      await confirmImportTaskItems(
        task.id,
        drafts
          .filter((d) => d.selected && d.tempItemId !== null)
          .map((d) => ({
            tempItemId: d.tempItemId as string,
            title: d.name,
            category: d.category,
            color: d.color,
          })),
      );
      track('item_saved', { taskId: task.id, count: selectedCount });
      // confirm import → wardrobeItems, todayRecommendation.
      invalidateAfterConfirmImport(qc);
      resetDraft();
      onAdvance();
    } catch {
      // Keep all edits + selections on failure so retry needs no re-entry.
      setSaveFailed(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const savePhase = phaseFromFlags({ pending: saving, failed: saveFailed, busyPhase: 'saving' });

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingTop: 52, paddingHorizontal: 16, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={onClose}>
          <SystemIcon name="x" size={22} color={T.ink2} />
        </Pressable>
        <Text style={{ fontSize: 13, color: T.ink2 }}>{t('import.progress', { current, total })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 24, fontWeight: '600', color: T.ink, lineHeight: 30, marginBottom: 4 }}>
          {t('import.multiTitle', { count: drafts.length })}
        </Text>
        <Text style={{ fontSize: 12, color: T.ink3, marginBottom: 16 }}>{t('import.multiSubtitle')}</Text>

        {drafts.map((d) => {
          const disabled = d.tempItemId === null;
          return (
            <View
              key={d.key}
              style={{ backgroundColor: T.card, borderRadius: 16, padding: 14, marginBottom: 12, opacity: disabled ? 0.5 : 1, ...T.shadowSm }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Pressable
                  onPress={() => !disabled && update(d.key, { selected: !d.selected })}
                  hitSlop={8}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    borderWidth: 2,
                    borderColor: d.selected ? colors.label : T.divider,
                    backgroundColor: d.selected ? colors.label : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {d.selected ? <SystemIcon name="check" size={14} color={colors.inverse} /> : null}
                </Pressable>
                <View style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: T.cardSoft, alignItems: 'center', justifyContent: 'center' }}>
                  {d.imageUrl ? (
                    <Image source={{ uri: d.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <GarmentSvg kind="shirt" size={34} />
                  )}
                </View>
                <TextInput
                  value={d.name}
                  onChangeText={(name) => update(d.key, { name })}
                  editable={!disabled}
                  placeholder={t('import.namePlaceholder')}
                  placeholderTextColor={T.ink4}
                  style={{ flex: 1, fontSize: 16, fontWeight: '600', color: T.ink }}
                />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {CATEGORY_OPTIONS.map((o) => (
                  <ChoiceChip
                    key={o.id}
                    active={d.category === o.id}
                    onPress={() => !disabled && update(d.key, { category: o.id })}
                    label={o.label}
                  />
                ))}
              </View>

              <View style={{ backgroundColor: T.cardInner, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 10, color: T.ink3, marginBottom: 2 }}>{t('import.fieldColor')}</Text>
                <TextInput
                  value={d.color}
                  onChangeText={(color) => update(d.key, { color })}
                  editable={!disabled}
                  placeholder={t('import.colorPlaceholder')}
                  placeholderTextColor={T.ink4}
                  style={{ fontSize: 14, color: T.ink }}
                />
              </View>
            </View>
          );
        })}

        <View style={{ marginTop: 6, padding: 12, backgroundColor: T.cardSoft, borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: T.ink2, lineHeight: 19 }}>{t('import.note')}</Text>
        </View>
      </ScrollView>

      <SaveBar
        phase={savePhase}
        saveLabel={t('import.saveSelected', { count: selectedCount })}
        saveDisabled={selectedCount === 0}
        onSave={save}
        secondaryLabel={inQueue ? t('import.skip') : t('import.reshoot')}
        onSecondary={inQueue ? onAdvance : onClose}
        errorText={t('import.saveBarError')}
      />
    </View>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, color: colors.tertiaryLabel, marginBottom: 8, paddingHorizontal: 4, letterSpacing: 0.4 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>
    </View>
  );
}

function ChoiceChip({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active ? colors.label : 'transparent',
        borderWidth: 1,
        borderColor: active ? colors.label : colors.separator,
      }}
    >
      <Text style={{ fontSize: 12, color: active ? colors.inverse : colors.secondaryLabel }}>{label}</Text>
    </Pressable>
  );
}
