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
import { visibleImportFields } from './importConfirmFields';
import { phaseFromFlags } from '@/state/operationState';
import { armAvatarSourceFlow } from '@/store/avatarCandidatePrompt';
import { useImportDraftStore } from '@/store/importDraft';
import { colors, radius, shadow, type as typeScale } from '@/theme/design';
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
  // radius shortcuts
  rSm: radius.sm,
  rMd: radius.md,
  rLg: radius.lg,
  rXl: radius.xl,
  rPill: radius.pill,
};

export function ImportConfirmScreen({ navigation, route }: Props) {
  const { t, tEnum } = useT();
  const CATEGORY_OPTIONS = CATEGORY_KEYS.map((id) => ({ id, label: tEnum('category', id) }));
  const FIT_OPTIONS = FIT_KEYS.map((id) => ({ id, label: tEnum('fitIntent', id) }));
  const { taskId, inputType, queue, queueIndex, onboarding } = route.params;
  // V3-014 — the only import input type whose BE handler queues avatar
  // candidate detection (`import_tasks.py::_offer_outfit_import_as_avatar_
  // candidate` filters on `input_type == outfit_image`; every other type is a
  // single garment, a product page or a receipt). Arming on the rest would open
  // a 6-poll / 12-second discovery window that cannot possibly find anything.
  //
  // It comes from the nav param, not from `data`: `ImportTaskResponse` carries
  // no `input_type` field at all, so reading it back would be a BE schema
  // change — and that would turn this FE-only feature into a two-repo OpenAPI
  // change for a bounded, silent, flag-off-by-default waste.
  const canArmAvatarCandidate = inputType === 'outfit_image';
  // Multi-image batch: confirm this task, then advance to the next one.
  const queueLen = queue?.length ?? 0;
  const inQueue = queueLen > 1;
  const idx = queueIndex ?? 0;
  const total = inQueue ? queueLen : 1;
  const current = inQueue ? idx + 1 : 1;
  const goNextOrExit = () => {
    const nextId = queue && queue[idx + 1];
    if (nextId) {
      navigation.replace('ImportConfirm', {
        taskId: nextId,
        inputType,
        queue,
        queueIndex: idx + 1,
        onboarding,
      });
    } else if (enableMvpV2Ui) {
      // V2: after the last item, land on the First Outfit activation gate
      // instead of dropping the user back onto the list. Forward `onboarding`
      // so First Outfit continues onboarding (→ StyleMemory) rather than Today.
      navigation.replace('FirstOutfit', onboarding ? { onboarding: true } : undefined);
    } else {
      navigation.popToTop();
    }
  };
  // Back/close/retake exits: in the wardrobe stack popToTop lands on the list;
  // re-hosted in onboarding it would land on Welcome (step 1) — go back to the
  // AddWardrobe step (2/6) instead.
  const exitFlow = () => {
    if (onboarding) navigation.navigate('AddWardrobe' as never);
    else navigation.popToTop();
  };
  const qc = useQueryClient();
  const resetDraft = useImportDraftStore((state) => state.reset);
  const localImageUri = useImportDraftStore((state) => state.localImageUri);
  const track = useTrack();

  const query = useQuery({
    queryKey: ['importTask', taskId],
    queryFn: () => getImportTask(taskId),
    retry: 1,
    refetchInterval: (queryInfo) => {
      const task = queryInfo.state.data;
      if (!task || queryInfo.state.status === 'error') return false;
      if (task.status === 'waiting_confirm' || task.status === 'failed') {
        pollStartRef.current = null;
        return false;
      }
      if (pollStartRef.current == null) pollStartRef.current = Date.now();
      if (Date.now() - pollStartRef.current > 120_000) return false;
      return 1500;
    },
  });

  const [form, setForm] = useState<ConfirmImportTaskBody>({ name: '', category: 'top', color: '' });
  const [selectedFit, setSelectedFit] = useState<FitIntent>('regular');
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [saving, setSaving] = useState(false);
  // Late-night low-friction: compute once on mount so the form doesn't
  // reshuffle if the clock ticks past a threshold during editing.
  const [budget] = useState(() => confirmationBudgetForImport(new Date()));
  // Whether the user has tapped "改一下" to expand the collapsed fields.
  const [expanded, setExpanded] = useState(false);
  // Surfaces save failure inline (in the SaveBar) instead of a 2.5s toast that
  // vanishes. The edited `form` state is never touched on failure, so retrying
  // resubmits the same content with no re-typing.
  const [saveFailed, setSaveFailed] = useState(false);
  // Synchronous gate: `saving` state only disables the button after a re-render,
  // so two taps in the same frame can both fire confirmImportTask -> duplicate
  // item. The ref blocks the second call immediately, before React re-renders.
  const savingRef = useRef(false);
  // Tracks when polling started so we can cap it at 120 s (mirrors ItemDetailScreen).
  const pollStartRef = useRef<number | null>(null);

  useEffect(() => { track('import_confirm_viewed', { taskId }); }, [taskId, track]);

  const data = query.data;
  const taskStatus = data?.status;

  // Schedule a fallback timer when the task is still processing, so the user
  // is never trapped on ProcessingOverlay indefinitely. Fires 120 s after
  // polling started (or immediately if the budget has already elapsed).
  useEffect(() => {
    if (taskStatus === 'waiting_confirm' || taskStatus === 'failed' || taskStatus === undefined) return;
    const elapsed = pollStartRef.current != null ? Date.now() - pollStartRef.current : 0;
    const remaining = Math.max(0, 120_000 - elapsed);
    const id = setTimeout(() => setPollTimedOut(true), remaining);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskStatus]);

  useEffect(() => {
    if (!data) return;
    if (data.status === 'failed') {
      navigation.replace('ImportFailure', {
        reason: data.errorReason ?? 'recognition_failed',
        onboarding,
      });
      return;
    }
    if (data.status === 'waiting_confirm' && data.recognized) {
      setForm({
        name: data.recognized.name ?? '',
        category: data.recognized.category ?? 'top',
        color: data.recognized.color ?? '',
      });
    }
  }, [data, navigation, onboarding]);

  if (query.isError && data?.status !== 'waiting_confirm') {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={exitFlow}
          hitSlop={8}
          style={{ position: 'absolute', top: 52, left: 20, padding: 4 }}
        >
          <SystemIcon name="chevronLeft" size={22} color={T.ink2} />
        </Pressable>
        <SystemIcon name="exclamation" size={28} color={colors.label} />
        <Text style={{ ...typeScale.headline, color: T.ink, textAlign: 'center' }}>
          {t('common.errorTitle')}
        </Text>
        <Text style={{ ...typeScale.callout, color: T.ink3, textAlign: 'center' }}>
          {t('common.errorDescription')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          style={{ minHeight: 44, borderRadius: T.rMd, backgroundColor: T.ink, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ ...typeScale.headline, color: colors.inverse }}>
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (pollTimedOut && (!data || data.status !== 'waiting_confirm')) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={exitFlow}
          hitSlop={8}
          style={{ position: 'absolute', top: 52, left: 20, padding: 4 }}
        >
          <SystemIcon name="chevronLeft" size={22} color={T.ink2} />
        </Pressable>
        <SystemIcon name="exclamation" size={28} color={colors.label} />
        <Text style={{ ...typeScale.headline, color: T.ink, textAlign: 'center' }}>
          {t('import.recognizingTimeout')}
        </Text>
        <Text style={{ ...typeScale.callout, color: T.ink3, textAlign: 'center' }}>
          {t('import.recognizingTimeoutHint')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setPollTimedOut(false);
            pollStartRef.current = null;
            void query.refetch();
          }}
          style={{ minHeight: 44, borderRadius: T.rMd, backgroundColor: T.ink, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ ...typeScale.headline, color: colors.inverse }}>
            {t('common.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!data || data.status !== 'waiting_confirm') {
    return (
      <View style={{ flex: 1 }}>
        <ProcessingOverlay title={t('import.recognizing')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={exitFlow}
          hitSlop={8}
          style={{ position: 'absolute', top: 52, left: 20, padding: 4 }}
        >
          <SystemIcon name="chevronLeft" size={22} color={T.ink2} />
        </Pressable>
      </View>
    );
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
        isLastInBatch={!(queue && queue[idx + 1])}
        canArmAvatarCandidate={canArmAvatarCandidate}
        onClose={exitFlow}
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
      await confirmImportTask(taskId, { ...form, fitIntent: selectedFit });
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
      <View style={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={exitFlow} hitSlop={8} style={undefined}>
          <SystemIcon name="chevronLeft" size={22} color={T.ink2} />
        </Pressable>
        <Text style={{ ...typeScale.footnote, color: T.ink3 }}>{t('import.progress', { current, total })}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title block */}
        <View style={{ marginBottom: 20, marginTop: 4 }}>
          <Text style={{ ...typeScale.largeTitle, color: T.ink, marginBottom: 6 }}>
            {t('import.confirmTitle')}
          </Text>
          <Text style={{ ...typeScale.footnote, color: T.ink3 }}>
            {confidencePct !== null
              ? t('import.confidence', { pct: confidencePct })
              : t('import.confidenceUnknown')}
          </Text>
        </View>

        {/* Late-night low-friction hint (brief §6.4): past the confirmation
            budget, nudge "先收下，之后再整理" instead of pressing for edits. */}
        {budget === 0 ? (
          <View
            style={{
              backgroundColor: T.cardSoft,
              borderRadius: T.rMd,
              paddingHorizontal: 14,
              paddingVertical: 11,
              marginBottom: 16,
            }}
          >
            <Text style={{ ...typeScale.footnote, color: T.ink2 }}>{t('import.lateNightHint')}</Text>
          </View>
        ) : null}

        {/* Image card */}
        <View
          style={{
            height: 260,
            backgroundColor: T.card,
            borderRadius: T.rXl,
            alignItems: 'center',
            justifyContent: 'center',
            ...T.shadowSm,
            marginBottom: 16,
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
                backgroundColor: T.ink,
                borderRadius: T.rPill,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success }} />
              <Text style={{ ...typeScale.caption, color: colors.inverse, letterSpacing: 0.4 }}>
                {t('import.confidenceBadge', { pct: confidencePct })}
              </Text>
            </View>
          )}
        </View>

        {/* Fields card: name always visible; category/color/fit conditionally
            shown based on late-night budget. Dividers are leading elements of
            each conditional block to avoid dangling separators. */}
        {(() => {
          const fields = visibleImportFields(budget);
          const showExpander = !expanded && !(fields.category && fields.color && fields.fit);
          const showCategory = fields.category || expanded;
          const showColor = fields.color || expanded;
          const showFit = fields.fit || expanded;
          return (
            <View style={{ backgroundColor: T.card, borderRadius: T.rLg, ...T.shadowSm, marginBottom: 16, overflow: 'hidden' }}>
              {/* Name — always visible, no leading divider */}
              <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
                <Text style={{ ...typeScale.caption, color: T.ink3, marginBottom: 6 }}>{t('import.fieldName')}</Text>
                <TextInput
                  value={form.name}
                  onChangeText={(name) => setForm((c) => ({ ...c, name }))}
                  placeholder={t('import.namePlaceholder')}
                  placeholderTextColor={T.ink4}
                  style={{ ...typeScale.headline, color: T.ink }}
                />
              </View>

              {/* Expander row — visible when one or more fields are collapsed */}
              {showExpander && (
                <>
                  <View style={{ height: 1, backgroundColor: T.divider, marginHorizontal: 16 }} />
                  <Pressable
                    onPress={() => setExpanded(true)}
                    style={{
                      minHeight: 44,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ ...typeScale.callout, color: T.accent }}>{t('item.change')}</Text>
                  </Pressable>
                </>
              )}

              {/* Category — leading divider + field */}
              {showCategory && (
                <>
                  <View style={{ height: 1, backgroundColor: T.divider, marginHorizontal: 16 }} />
                  <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
                    <Text style={{ ...typeScale.caption, color: T.ink3, marginBottom: 10 }}>{t('import.fieldCategory')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {CATEGORY_OPTIONS.map((o) => (
                        <ChoiceChip
                          key={o.id}
                          active={form.category === o.id}
                          onPress={() => setForm((c) => ({ ...c, category: o.id }))}
                          label={o.label}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Color — leading divider + field */}
              {showColor && (
                <>
                  <View style={{ height: 1, backgroundColor: T.divider, marginHorizontal: 16 }} />
                  <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
                    <Text style={{ ...typeScale.caption, color: T.ink3, marginBottom: 6 }}>{t('import.fieldColor')}</Text>
                    <TextInput
                      value={form.color}
                      onChangeText={(color) => setForm((c) => ({ ...c, color }))}
                      placeholder={t('import.colorPlaceholder')}
                      placeholderTextColor={T.ink4}
                      style={{ ...typeScale.body, color: T.ink }}
                    />
                  </View>
                </>
              )}

              {/* Fit — leading divider + field */}
              {showFit && (
                <>
                  <View style={{ height: 1, backgroundColor: T.divider, marginHorizontal: 16 }} />
                  <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
                    <Text style={{ ...typeScale.caption, color: T.ink3, marginBottom: 10 }}>{t('import.fieldFit')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {FIT_OPTIONS.map((o) => (
                        <ChoiceChip
                          key={o.id}
                          active={selectedFit === o.id}
                          onPress={() => setSelectedFit(o.id)}
                          label={o.label}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          );
        })()}

        {/* Info note */}
        <View style={{ paddingHorizontal: 14, paddingVertical: 11, backgroundColor: T.cardSoft, borderRadius: T.rMd }}>
          <Text style={{ ...typeScale.footnote, color: T.ink2, lineHeight: 20 }}>
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
        onSecondary={() => (inQueue ? goNextOrExit() : exitFlow())}
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
  isLastInBatch,
  canArmAvatarCandidate,
  onClose,
  onAdvance,
}: {
  task: ImportTask;
  current: number;
  total: number;
  inQueue: boolean;
  /** False while more photos of an album batch are still queued behind this
   *  one — see the avatar arm in `save`. */
  isLastInBatch: boolean;
  /** True only for an `outfit_image` import — the one input type whose BE
   *  handler queues avatar candidate detection. See the arm in `save`. */
  canArmAvatarCandidate: boolean;
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
      // V3-014 source B (V3_SPEC §7.1): the person-reference question comes
      // AFTER the clothing import completes and is authorized separately —
      // importing clothes never implies consent (contract §4.3). `confirm-items`
      // is the only endpoint whose handler enqueues detection, which is why the
      // arm is here and not on the single-candidate `confirm` path.
      //
      // Gated on the LAST photo of a batch. An album import fans out one task
      // per image and BE queues detection per task, so arming on every confirm
      // would walk the user through one sheet per photo — the repeated
      // prompting §7.3 and acceptance 4 forbid.
      //
      // Gated on the input type as well: BE only queues detection for
      // `outfit_image`, so without this every screenshot / link / receipt
      // import burned a silent 6-poll window that could never find a candidate.
      if (isLastInBatch && canArmAvatarCandidate) armAvatarSourceFlow();
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
      <View style={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={onClose} hitSlop={8} style={undefined}>
          <SystemIcon name="chevronLeft" size={22} color={T.ink2} />
        </Pressable>
        <Text style={{ ...typeScale.footnote, color: T.ink3 }}>{t('import.progress', { current, total })}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 20, marginTop: 4 }}>
          <Text style={{ ...typeScale.title1, color: T.ink, marginBottom: 6 }}>
            {t('import.multiTitle', { count: drafts.length })}
          </Text>
          <Text style={{ ...typeScale.footnote, color: T.ink3 }}>{t('import.multiSubtitle')}</Text>
        </View>

        {drafts.map((d) => {
          const disabled = d.tempItemId === null;
          return (
            <View
              key={d.key}
              style={{ backgroundColor: T.card, borderRadius: T.rLg, marginBottom: 12, opacity: disabled ? 0.5 : 1, ...T.shadowSm, overflow: 'hidden' }}
            >
              {/* Row header: checkbox + thumbnail + name */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
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
                <View style={{ width: 64, height: 64, borderRadius: T.rMd, overflow: 'hidden', backgroundColor: T.cardSoft, alignItems: 'center', justifyContent: 'center' }}>
                  {d.imageUrl ? (
                    <Image source={{ uri: d.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <GarmentSvg kind="shirt" size={38} />
                  )}
                </View>
                <TextInput
                  value={d.name}
                  onChangeText={(name) => update(d.key, { name })}
                  editable={!disabled}
                  placeholder={t('import.namePlaceholder')}
                  placeholderTextColor={T.ink4}
                  style={{ flex: 1, ...typeScale.headline, color: T.ink }}
                />
              </View>

              <View style={{ height: 1, backgroundColor: T.divider, marginHorizontal: 14 }} />

              {/* Category chips */}
              <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 }}>
                <Text style={{ ...typeScale.caption, color: T.ink3, marginBottom: 8 }}>{t('import.fieldCategory')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORY_OPTIONS.map((o) => (
                    <ChoiceChip
                      key={o.id}
                      active={d.category === o.id}
                      onPress={() => !disabled && update(d.key, { category: o.id })}
                      label={o.label}
                    />
                  ))}
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: T.divider, marginHorizontal: 14 }} />

              {/* Color */}
              <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 }}>
                <Text style={{ ...typeScale.caption, color: T.ink3, marginBottom: 6 }}>{t('import.fieldColor')}</Text>
                <TextInput
                  value={d.color}
                  onChangeText={(color) => update(d.key, { color })}
                  editable={!disabled}
                  placeholder={t('import.colorPlaceholder')}
                  placeholderTextColor={T.ink4}
                  style={{ ...typeScale.body, color: T.ink }}
                />
              </View>
            </View>
          );
        })}

        <View style={{ paddingHorizontal: 14, paddingVertical: 11, backgroundColor: T.cardSoft, borderRadius: T.rMd }}>
          <Text style={{ ...typeScale.footnote, color: T.ink2, lineHeight: 20 }}>{t('import.note')}</Text>
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

function ChoiceChip({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        minHeight: 34,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.label : 'transparent',
        borderWidth: 1,
        borderColor: active ? colors.label : colors.separator,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ ...typeScale.caption, color: active ? colors.inverse : colors.secondaryLabel }}>{label}</Text>
    </Pressable>
  );
}
