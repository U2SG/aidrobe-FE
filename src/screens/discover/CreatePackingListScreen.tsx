import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createElement, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { createPackingList } from '@/api/packingList';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { useTrack } from '@/hooks/useTrack';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { DiscoverStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'CreatePackingList'>;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  cardSoft: colors.secondaryElevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
};

const SCENES: { value: string; label: string }[] = [
  { value: 'commute', label: '通勤' },
  { value: 'business', label: '商务' },
  { value: 'casual', label: '休闲' },
  { value: 'travel', label: '旅行' },
  { value: 'date', label: '约会' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ ...type.footnote, color: T.ink3 }}>{label}</Text>
      {children}
    </View>
  );
}

function toISODate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

function formatDepartureDate(value: Date): string {
  return `${value.getMonth() + 1}月${value.getDate()}日`;
}

export function CreatePackingListScreen({ navigation, route }: Props) {
  const qc = useQueryClient();
  const track = useTrack();
  const showToast = useToastStore((s) => s.show);
  const t = useT();

  const [destination, setDestination] = useState('');
  // Prefilled by the Ask trip-intent handoff (BE#115) when the trip length was
  // stated in the conversation.
  const [days, setDays] = useState(route.params?.durationDays ?? 3);
  const [scenes, setScenes] = useState<string[]>(['commute']);
  const [weatherHint, setWeatherHint] = useState('');
  // Optional. With a destination it unlocks real per-day forecasts on the
  // backend (BE#118) — without it the plan falls back to the weather hint.
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const toggleScene = (v: string) =>
    setScenes((cur) => (cur.includes(v) ? cur.filter((s) => s !== v) : [...cur, v]));

  const createMutation = useMutation({
    mutationFn: () =>
      createPackingList({
        destination: destination.trim() || undefined,
        days,
        scenes,
        weatherHint: weatherHint.trim() || undefined,
        departureDate: departureDate ? toISODate(departureDate) : undefined,
      }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['packingLists'] });
      track('packing_list_created', { days, scenes: scenes.length });
      showToast({ message: '清单已生成', kind: 'success' });
      // Land on the list itself — goBack() bounced Ask-handoff users straight
      // back to Ask with no idea where the list went (#116). replace keeps the
      // back gesture returning to the originating screen.
      navigation.replace('PackingListDetail', { id: created.id });
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Modal header */}
      <View
        style={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ ...type.title2, color: T.ink }}>新建打包清单</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: T.card,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadow.soft,
          }}
        >
          <SystemIcon name="x" size={16} color={T.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.screen, gap: 22 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="目的地（可选）">
          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="例如：东京"
            placeholderTextColor={colors.quaternaryLabel}
            style={{
              backgroundColor: T.card,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 13,
              ...type.body,
              color: T.ink,
              ...shadow.soft,
            }}
          />
        </Field>

        <Field label="出发日期（可选，配合目的地获取真实天气）">
          {Platform.OS === 'web' ? (
            createElement('input', {
              type: 'date',
              min: toISODate(new Date()),
              value: departureDate ? toISODate(departureDate) : '',
              onChange: (event: { target: { value: string } }) => {
                const raw = event.target.value;
                setDepartureDate(raw ? new Date(`${raw}T00:00:00`) : null);
              },
              style: {
                backgroundColor: T.card,
                borderRadius: radius.md,
                border: 'none',
                padding: '13px 14px',
                fontSize: 16,
                color: T.ink,
                fontFamily: 'inherit',
              },
            })
          ) : (
            <>
              <Pressable
                onPress={() => setDatePickerVisible(true)}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: T.card,
                  borderRadius: radius.md,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  minHeight: 48,
                  ...shadow.soft,
                }}
              >
                <Text style={{ ...type.body, color: departureDate ? T.ink : colors.quaternaryLabel }}>
                  {departureDate ? formatDepartureDate(departureDate) : '选择日期'}
                </Text>
                {departureDate ? (
                  <Pressable onPress={() => setDepartureDate(null)} hitSlop={10} accessibilityLabel="清除日期">
                    <SystemIcon name="x" size={15} color={T.ink3} />
                  </Pressable>
                ) : (
                  <SystemIcon name="chevronRight" size={15} color={T.ink3} />
                )}
              </Pressable>
              {datePickerVisible ? (
                <DateTimePicker
                  value={departureDate ?? new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(event, selected) => {
                    setDatePickerVisible(false);
                    if (event.type === 'set' && selected) setDepartureDate(selected);
                  }}
                />
              ) : null}
            </>
          )}
        </Field>

        <Field label={t.t('packing.create.weatherLabel')}>
          <TextInput
            value={weatherHint}
            onChangeText={setWeatherHint}
            placeholder={t.t('packing.create.weatherPlaceholder')}
            placeholderTextColor={colors.quaternaryLabel}
            style={{
              backgroundColor: T.card,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 13,
              ...type.body,
              color: T.ink,
              ...shadow.soft,
            }}
          />
        </Field>

        <Field label="天数">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: T.card,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 10,
              ...shadow.soft,
            }}
          >
            <Pressable
              onPress={() => setDays((d) => Math.max(1, d - 1))}
              hitSlop={8}
              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 22, color: T.ink2 }}>−</Text>
            </Pressable>
            <Text style={{ ...type.headline, color: T.ink }}>{days} 天</Text>
            <Pressable
              onPress={() => setDays((d) => Math.min(90, d + 1))}
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: T.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, color: colors.inverse, marginTop: -2 }}>＋</Text>
            </Pressable>
          </View>
        </Field>

        <Field label="场景（多选）">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SCENES.map((s) => {
              const active = scenes.includes(s.value);
              return (
                <Pressable
                  key={s.value}
                  onPress={() => toggleScene(s.value)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: radius.pill,
                    backgroundColor: active ? T.ink : T.card,
                    ...shadow.soft,
                  }}
                >
                  <Text style={{ ...type.footnote, fontWeight: '600', color: active ? colors.inverse : T.ink2 }}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.screen, paddingTop: 12, paddingBottom: 28 }}>
        <PrimaryButton
          label="生成清单"
          onPress={() => createMutation.mutate()}
          disabled={scenes.length === 0}
          loading={createMutation.isPending}
        />
      </View>
    </View>
  );
}
