import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { API_BASE_URL, APP_ENV } from '@/api/client';
import { updateUserSettings } from '@/api/settings';
import { OperationBanner } from '@/components/feedback/OperationBanner';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { enableMvpV2Ui } from '@/lib/featureFlags';
import { invalidateAfterUpdateDepartureTime } from '@/state/invalidation';
import { phaseFromFlags } from '@/state/operationState';
import { useCommuteExposureStore, type CommuteExposure } from '@/store/commuteExposure';
import { useOnboardingStore } from '@/store/onboarding';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type as typeScale } from '@/theme/design';
import { httpStatus } from '@/utils/http';

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
  accentSoft: colors.accentSoft,
  inverse: colors.inverse,
  divider: colors.separator,
  shadowSm: shadow.soft,
};

// Onboarding flow: Welcome → Permission → DepartureTime (3 screens total).
const TOTAL_STEPS = 3;
const CURRENT_STEP = 3;

// Preset departure times shown as quick-select chips.
const PRESETS = ['08:00', '08:30', '09:00'] as const;

/** Add or subtract minutes from an HH:MM:SS string, wrapping at midnight. */
function adjustTime(hhmmss: string, deltaMinutes: number): string {
  const parts = hhmmss.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const totalMinutes = ((h * 60 + m + deltaMinutes) % (24 * 60) + 24 * 60) % (24 * 60);
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}

export function DepartureTimeScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [time, setTime] = useState('08:30:00');
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const setCompleted = useOnboardingStore((state) => state.setCompleted);
  const showToast = useToastStore((state) => state.show);
  const track = useTrack();
  const { t } = useT();
  const exposure = useCommuteExposureStore((s) => s.exposure);
  const setExposure = useCommuteExposureStore((s) => s.setExposure);
  const selectExposure = (value: CommuteExposure) => {
    setExposure(value);
    track('commute_exposure_selected', { exposure: value });
  };

  const finish = () => {
    setCompleted(true);
    if (navigation.canGoBack()) navigation.goBack();
  };

  const save = async () => {
    setSaving(true);
    setSaveFailed(false);
    try {
      await updateUserSettings({ departureTime: time });
      track('departure_time_saved', { time });
      // update departure time → userSettings, todayRecommendation (see state/invalidation).
      invalidateAfterUpdateDepartureTime(queryClient);
      finish();
    } catch (error) {
      const detail =
        APP_ENV === 'production'
          ? ''
          : `（${httpStatus(error) ?? (error as Error)?.message ?? 'unknown'} @ ${API_BASE_URL}）`;
      // Banner now carries the inline error + retry; keep the toast for detail.
      setSaveFailed(true);
      showToast({ message: `${t('departure.saveFailed')}${detail}`, kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // The selected `time` persists across a failed save, so retry never requires
  // re-picking. Banner reflects pending/error inline.
  const savePhase = phaseFromFlags({ pending: saving, failed: saveFailed, busyPhase: 'saving' });

  // HH:MM display derived from time state.
  const displayHH = time.slice(0, 2);
  const displayMM = time.slice(3, 5);
  const displayHHMM = `${displayHH}:${displayMM}`;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* ── Progress bar (mirrors WelcomeScreen pattern) ── */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 60,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 2,
                backgroundColor: i < CURRENT_STEP ? T.ink : T.divider,
              }}
            />
          ))}
        </View>
        <Text
          style={{
            ...typeScale.caption,
            color: T.ink3,
            letterSpacing: 0.4,
          }}
        >
          {t('departure.stepLabel')}
        </Text>
      </View>

      {/* Scrollable so the optional commute question + pinned CTAs still fit on
          shorter viewports (space-between preserved on tall screens). */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: 36,
          justifyContent: 'space-between',
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {/* Title + subtitle */}
          <Text
            style={{
              ...typeScale.largeTitle,
              color: T.ink,
            }}
          >
            {t('departure.title')}
          </Text>
          <Text
            style={{
              ...typeScale.callout,
              color: T.ink2,
              marginTop: 14,
              lineHeight: 22,
            }}
          >
            {t('departure.subtitle')}
          </Text>

          {/* ── Time display card ── */}
          <View
            style={{
              marginTop: 32,
              paddingVertical: 28,
              paddingHorizontal: 24,
              backgroundColor: T.card,
              borderRadius: radius.lg,
              alignItems: 'center',
              ...T.shadowSm,
            }}
          >
            {/* − / HH:MM / + row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 20,
              }}
            >
              <Pressable
                onPress={() => setTime(adjustTime(time, -30))}
                hitSlop={12}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.sm,
                  backgroundColor: T.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: '300', color: T.ink, lineHeight: 30 }}>
                  {'−'}
                </Text>
              </Pressable>

              <Text
                style={{
                  fontSize: 64,
                  fontWeight: '600',
                  color: T.ink,
                  letterSpacing: -2,
                  lineHeight: 74,
                  minWidth: 172,
                  textAlign: 'center',
                }}
              >
                {displayHHMM}
              </Text>

              <Pressable
                onPress={() => setTime(adjustTime(time, 30))}
                hitSlop={12}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.sm,
                  backgroundColor: T.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: '300', color: T.ink, lineHeight: 30 }}>
                  +
                </Text>
              </Pressable>
            </View>

            {/* Preset chips row */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginTop: 24,
                width: '100%',
              }}
            >
              {PRESETS.map((preset) => {
                const selected = displayHHMM === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setTime(`${preset}:00`)}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: radius.sm,
                      borderWidth: 1,
                      borderColor: selected ? T.accent : T.divider,
                      backgroundColor: selected ? T.accentSoft : T.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 4,
                    }}
                  >
                    {selected ? (
                      <SystemIcon name="check" size={13} color={T.accent} strokeWidth={2.2} />
                    ) : null}
                    <Text
                      style={{
                        ...typeScale.footnote,
                        fontWeight: selected ? '600' : '400',
                        color: selected ? T.accent : T.ink2,
                      }}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Optional commute-exposure micro-question (brief §9.5) — the single
              sanctioned active question, attached to the existing departure
              context. V2 only; skippable by simply not choosing. */}
          {enableMvpV2Ui ? (
            <View style={{ marginTop: 24, gap: 10 }}>
              <Text style={{ ...typeScale.footnote, color: T.ink2 }}>{t('commuteExposure.question')}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['more_outdoor', 'less_outdoor'] as const).map((value) => {
                  const selected = exposure === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => selectExposure(value)}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: selected ? T.ink : T.divider,
                        backgroundColor: selected ? T.ink : T.card,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          ...typeScale.callout,
                          fontWeight: '600',
                          color: selected ? T.inverse : T.ink2,
                        }}
                      >
                        {t(value === 'more_outdoor' ? 'commuteExposure.more' : 'commuteExposure.less')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Bottom CTAs ── */}
        <View style={{ gap: 10, marginTop: 32 }}>
          <OperationBanner
            phase={savePhase}
            pendingText={t('departure.saving')}
            successText={t('departure.saved')}
            errorText={t('departure.saveFailed')}
            onRetry={save}
          />
          <Pressable
            onPress={save}
            disabled={saving}
            style={{
              height: 54,
              borderRadius: radius.md,
              backgroundColor: T.ink,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: saving ? 0.75 : 1,
            }}
          >
            <Text style={{ ...typeScale.headline, color: T.inverse }}>{t('departure.saveTime')}</Text>
          </Pressable>
          <Pressable
            onPress={finish}
            disabled={saving}
            style={{
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ ...typeScale.footnote, color: T.ink3 }}>{t('departure.skip')}</Text>
          </Pressable>
          <Text
            style={{
              ...typeScale.caption,
              color: T.ink3,
              textAlign: 'center',
              marginTop: 2,
            }}
          >
            {t('departure.footnote')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
