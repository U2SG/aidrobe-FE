import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { API_BASE_URL, APP_ENV } from '@/api/client';
import { updateUserSettings } from '@/api/settings';
import { OperationBanner } from '@/components/feedback/OperationBanner';
import { WheelTimePicker } from '@/components/forms/WheelTimePicker';
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
  ink4: colors.quaternaryLabel,
  accent: colors.accent,
  divider: colors.separator,
  shadowSm: shadow.soft,
};

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
      showToast({ message: `保存失败，请稍后重试${detail}`, kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // The selected `time` persists across a failed save, so retry never requires
  // re-picking. Banner reflects pending/error inline.
  const savePhase = phaseFromFlags({ pending: saving, failed: saveFailed, busyPhase: 'saving' });

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Progress */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 24, paddingTop: 60 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= 2 ? T.ink : T.divider,
            }}
          />
        ))}
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 28,
          paddingTop: 32,
          paddingBottom: 36,
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              letterSpacing: 1.2,
              color: T.accent,
              marginBottom: 12,
            }}
          >
            STEP 02 / 04
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '600', color: T.ink, lineHeight: 34 }}>
            你一般几点出门？
          </Text>
          <Text style={{ marginTop: 8, fontSize: 13, color: T.ink3, lineHeight: 20 }}>
            我们会在你出门前 90 分钟提前算好今天的方案，打开就能看。
          </Text>

          {/* Time display */}
          <View
            style={{
              marginTop: 32,
              padding: 24,
              backgroundColor: T.card,
              borderRadius: 18,
              alignItems: 'center',
              ...T.shadowSm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text
                style={{
                  fontSize: 64,
                  fontWeight: '600',
                  color: T.ink,
                  letterSpacing: -2,
                  lineHeight: 74,
                }}
              >
                {time.slice(0, 2)}
              </Text>
              <Text
                style={{
                  fontSize: 64,
                  fontWeight: '300',
                  color: T.ink3,
                  lineHeight: 74,
                }}
              >
                :
              </Text>
              <Text
                style={{
                  fontSize: 64,
                  fontWeight: '600',
                  color: T.ink,
                  letterSpacing: -2,
                  lineHeight: 74,
                }}
              >
                {time.slice(3, 5)}
              </Text>
            </View>
            <Text style={{ marginTop: 4, fontSize: 11, color: T.ink3 }}>工作日 · 可分别设置</Text>

            {/* Shared wheel picker (also used by the settings Bottom Sheet). */}
            <View style={{ marginTop: 16 }}>
              <WheelTimePicker value={time.slice(0, 5)} onChange={(v) => setTime(`${v}:00`)} />
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
                          color: selected ? colors.inverse : T.ink2,
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

        <View style={{ gap: 10 }}>
          <OperationBanner
            phase={savePhase}
            pendingText="正在保存出门时间…"
            successText="已保存"
            errorText="保存失败，请重试"
            onRetry={save}
          />
          <Pressable
            onPress={save}
            disabled={saving}
            style={({ pressed }) => ({
              height: 54,
              borderRadius: 14,
              backgroundColor: T.ink,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: saving || pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>下一步</Text>
          </Pressable>
          <Pressable
            onPress={finish}
            disabled={saving}
            style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 12, color: T.ink3 }}>跳过</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
