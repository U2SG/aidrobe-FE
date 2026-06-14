import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { createPackingList } from '@/api/packingList';
import { PrimaryButton } from '@/components/forms/PrimaryButton';
import { SystemIcon } from '@/components/ui/SystemIcon';
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

export function CreatePackingListScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const track = useTrack();
  const showToast = useToastStore((s) => s.show);

  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [scenes, setScenes] = useState<string[]>(['commute']);

  const toggleScene = (v: string) =>
    setScenes((cur) => (cur.includes(v) ? cur.filter((s) => s !== v) : [...cur, v]));

  const createMutation = useMutation({
    mutationFn: () =>
      createPackingList({
        destination: destination.trim() || undefined,
        days,
        scenes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packingLists'] });
      track('packing_list_created', { days, scenes: scenes.length });
      showToast({ message: '清单已生成', kind: 'success' });
      navigation.goBack();
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
