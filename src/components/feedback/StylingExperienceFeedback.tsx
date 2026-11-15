import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  createStylingExperience, deleteStylingExperience, getStylingExperiences,
  type CreateStylingExperience, type ExperienceKind, type WearFeeling,
} from '@/api/stylingExperiences';
import { Button } from '@/components/ui/Button';
import { useT } from '@/hooks/useT';
import { useAuthStore } from '@/store/auth';
import { useDevUserStore } from '@/store/devUser';
import { useToastStore } from '@/store/toast';
import { colors, radius, type } from '@/theme/design';
import { httpStatus } from '@/utils/http';
import { experienceState } from '@/utils/stylingExperience';
import { newFlowId } from '@/utils/v3AnalyticsEvents';

export function StylingExperienceFeedback({ outfitId, conversationId, revision, disabled = false }: {
  outfitId: string;
  conversationId?: string;
  revision?: number;
  disabled?: boolean;
}) {
  const { t } = useT();
  const qc = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const devUserId = useDevUserStore((state) => state.userId);
  const owner = `${sessionVersion}:${devUserId ?? ''}:${outfitId}`;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const queryKey = ['stylingExperiences', owner, outfitId];
  const query = useQuery({ queryKey, queryFn: () => getStylingExperiences(outfitId), retry: false });
  const refetch = query.refetch;
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  const state = query.data ? experienceState(query.data) : null;
  const [feeling, setFeeling] = useState<WearFeeling>('like');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const request = useRef<{ key: string; id: string } | null>(null);
  const previous = state?.wearFeedback;
  useEffect(() => {
    setFeeling(previous?.feedback ?? 'like');
    setNote(previous?.note ?? '');
    setEditing(false);
  }, [owner, previous?.experience_id, previous?.feedback, previous?.note]);
  useEffect(() => { setUnavailable(false); }, [owner, query.dataUpdatedAt]);

  const mutation = useMutation({
    mutationFn: async (action: { owner: string; body?: CreateStylingExperience; remove?: string }) => {
      if (ownerRef.current !== action.owner) return;
      if (action.remove) await deleteStylingExperience(action.remove);
      else if (action.body) await createStylingExperience(action.body);
    },
    onSuccess: async (_, action) => {
      if (ownerRef.current !== action.owner) return;
      request.current = null;
      setEditing(false);
      await qc.invalidateQueries({ queryKey });
    },
    onError: async (error, action) => {
      if (ownerRef.current !== action.owner) return;
      if ([404, 503].includes(httpStatus(error) ?? 0)) {
        setUnavailable(true);
        return;
      }
      if (httpStatus(error) === 409) {
        request.current = null;
        await qc.invalidateQueries({ queryKey });
      }
      if (ownerRef.current !== action.owner) return;
      showToast({ message: t(httpStatus(error) === 409 ? 'experience.changed' : 'experience.failed'), kind: 'error' });
    },
  });
  const busy = disabled || mutation.isPending;
  const record = (kind: ExperienceKind) => {
    if (busy || !state) return;
    const existing = kind === 'appreciated' ? state.appreciated : kind === 'want_to_try' ? state.wantToTry : undefined;
    if (existing) return mutation.mutate({ owner, remove: existing.experience_id });
    if (kind === 'wear_feedback' && !state.wornDate) return;
    const body = {
      outfit_id: outfitId, kind,
      ...(conversationId && revision != null ? { conversation_id: conversationId, revision } : {}),
      ...(kind === 'wear_feedback' ? {
        worn_date: state.wornDate!, feedback: feeling,
        note: note.trim() || undefined, supersedes_id: previous?.experience_id,
      } : {}),
    };
    const key = JSON.stringify([owner, body]);
    if (request.current?.key !== key) request.current = { key, id: newFlowId() };
    mutation.mutate({ owner, body: { ...body, request_id: request.current.id } });
  };

  // An older or disabled server offers no experience surface.
  if (unavailable || [404, 503].includes(httpStatus(query.error) ?? 0)) return null;
  if (!state) return query.isError ? <Button label={t('common.retry')} variant="secondary" onPress={() => { void query.refetch(); }} /> : null;
  const chip = (label: string, selected: boolean, onPress: () => void) => <Pressable
    accessibilityRole="button" accessibilityState={{ selected, disabled: busy }} disabled={busy} onPress={onPress}
    style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: radius.md,
      borderWidth: 1, borderColor: selected ? colors.accent : colors.separator, backgroundColor: selected ? colors.fill : 'transparent' }}
  ><Text style={{ ...type.callout, color: selected ? colors.accent : colors.label }}>{label}</Text></Pressable>;

  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {chip(t('experience.appreciated'), Boolean(state.appreciated), () => record('appreciated'))}
      {chip(t('experience.wantToTry'), Boolean(state.wantToTry), () => record('want_to_try'))}
    </View>
    {state.wornDate ? <View style={{ gap: 8 }}>
      <Text style={{ ...type.footnote, color: colors.secondaryLabel }}>{t('experience.afterWearing', { date: state.wornDate })}</Text>
      {previous && !editing ? <>
        <Text style={{ ...type.body, color: colors.label }}>{t(previous.feedback === 'like' ? 'experience.like' : previous.feedback === 'dislike' ? 'experience.dislike' : 'experience.neutral')}</Text>
        {previous.note ? <Text style={{ ...type.footnote, color: colors.secondaryLabel }}>{previous.note}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label={t('experience.edit')} variant="secondary" disabled={busy} onPress={() => setEditing(true)} />
          <Button label={t('experience.remove')} variant="secondary" disabled={busy} onPress={() => mutation.mutate({ owner, remove: previous.experience_id })} />
        </View>
      </> : <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['like', 'neutral', 'dislike'] as const).map((value) => <View key={value}>{chip(t(`experience.${value}`), feeling === value, () => setFeeling(value))}</View>)}
        </View>
        <TextInput value={note} onChangeText={setNote} maxLength={500} multiline editable={!busy}
          placeholder={t('experience.note')} accessibilityLabel={t('experience.note')}
          style={{ ...type.body, color: colors.label, padding: 12, minHeight: 60, borderWidth: 1, borderColor: colors.separator, borderRadius: radius.md }} />
        <Button label={t('experience.save')} loading={mutation.isPending} disabled={busy} onPress={() => record('wear_feedback')} />
      </>}
    </View> : null}
  </View>;
}
