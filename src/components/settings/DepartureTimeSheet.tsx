import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { WheelTimePicker } from '@/components/forms/WheelTimePicker';
import { BottomSheet, Typography } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, radius } from '@/theme/design';

const DEFAULT_TIME = '08:30';
const toHHMM = (value: string | null | undefined) => (value ? value.slice(0, 5) : DEFAULT_TIME);

// Bottom Sheet for quickly changing the departure time from Settings — uses the
// shared BottomSheet primitive (FE#32) + the WheelTimePicker (FE#14). `onSave`
// emits "HH:MM".
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
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Typography variant="headline" color="label">
          {t('settings.departureTime')}
        </Typography>
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
          <Typography variant="headline" color="secondaryLabel">
            {t('common.cancel')}
          </Typography>
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
          <Typography variant="headline" color="inverse">
            {t('common.save')}
          </Typography>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
