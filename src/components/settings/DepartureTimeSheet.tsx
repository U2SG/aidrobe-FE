import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { WheelTimePicker } from '@/components/forms/WheelTimePicker';
import { useT } from '@/hooks/useT';
import { colors, radius, shadow, type } from '@/theme/design';

const DEFAULT_TIME = '08:30';
const toHHMM = (value: string | null | undefined) => (value ? value.slice(0, 5) : DEFAULT_TIME);

// Bottom Sheet for quickly changing the departure time from Settings — a light
// scrim + a sheet with the shared WheelTimePicker, instead of pushing the
// full-screen onboarding flow (FE#14). `onSave` emits "HH:MM".
export function DepartureTimeSheet({
  visible,
  initialValue,
  saving = false,
  onSave,
  onClose,
}: {
  visible: boolean;
  initialValue: string | null | undefined;
  saving?: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState(toHHMM(initialValue));

  // Re-seed from the latest saved value each time the sheet opens, so a
  // cancelled edit doesn't leak into the next open.
  useEffect(() => {
    if (visible) setDraft(toHHMM(initialValue));
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel={t('common.cancel')}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: 'rgba(20,16,12,0.25)' }}
        />
        <View
          style={{
            backgroundColor: colors.elevated,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 32,
            gap: 18,
            ...shadow.elevated,
          }}
        >
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ ...type.headline, color: colors.label }}>
              {t('settings.departureTime')}
            </Text>
            <Text
              style={{
                fontSize: 40,
                fontWeight: '600',
                color: colors.label,
                letterSpacing: -1,
                fontVariant: ['tabular-nums'],
              }}
            >
              {draft}
            </Text>
          </View>

          <WheelTimePicker value={draft} onChange={setDraft} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={({ pressed }) => ({
                flex: 1,
                height: 50,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.separator,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ ...type.headline, color: colors.secondaryLabel }}>
                {t('common.cancel')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(draft)}
              disabled={saving}
              style={({ pressed }) => ({
                flex: 1,
                height: 50,
                borderRadius: radius.md,
                backgroundColor: colors.label,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: saving || pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ ...type.headline, color: colors.inverse }}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
