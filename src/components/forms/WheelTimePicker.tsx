import { useEffect, useMemo, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { colors, type } from '@/theme/design';

// Lightweight hour/minute picker built on snapping ScrollViews — no native
// wheel-picker dependency. Reused by onboarding (full-screen) and the settings
// Bottom Sheet so the two share one time-selection control (FE#14).

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5; // odd → one centred row under the selection band
const PAD_ROWS = (VISIBLE_ROWS - 1) / 2;

const pad2 = (n: number) => String(n).padStart(2, '0');

function parseHHMM(value: string): { hour: number; minute: number } {
  const [rawH = '8', rawM = '0'] = value.split(':');
  const hour = Math.min(Math.max(Number(rawH) || 0, 0), 23);
  const minute = Math.min(Math.max(Number(rawM) || 0, 0), 59);
  return { hour, minute };
}

function WheelColumn({
  values,
  selectedIndex,
  onSelect,
}: {
  values: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    // Keep the scroll position aligned with the selected value (initial mount
    // + external changes). After a snap this targets the current offset, so
    // it's a no-op rather than a fight with the user's gesture.
    ref.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.min(Math.max(raw, 0), values.length - 1);
    if (clamped !== selectedIndex) onSelect(clamped);
  };

  return (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={handleEnd}
      style={{ height: ITEM_HEIGHT * VISIBLE_ROWS }}
      contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PAD_ROWS }}
    >
      {values.map((value, i) => (
        <View
          key={value}
          style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            style={{
              ...type.title2,
              fontVariant: ['tabular-nums'],
              color: i === selectedIndex ? colors.label : colors.quaternaryLabel,
            }}
          >
            {pad2(value)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function WheelTimePicker({
  value,
  onChange,
  minuteStep = 5,
}: {
  value: string; // "HH:MM" (extra ":SS" tolerated)
  onChange: (value: string) => void; // emits "HH:MM"
  minuteStep?: number;
}) {
  const { hour, minute } = parseHHMM(value);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  const hourIndex = Math.min(Math.max(hour, 0), hours.length - 1);
  const minuteIndex = Math.min(Math.round(minute / minuteStep), minutes.length - 1);
  const selectedHour = hours[hourIndex] ?? 0;
  const selectedMinute = minutes[minuteIndex] ?? 0;

  const emit = (h: number, m: number) => onChange(`${pad2(h)}:${pad2(m)}`);

  return (
    <View style={{ height: ITEM_HEIGHT * VISIBLE_ROWS }}>
      {/* Centre selection band */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: ITEM_HEIGHT * PAD_ROWS,
          height: ITEM_HEIGHT,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.separator,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <View style={{ width: 64 }}>
          <WheelColumn
            values={hours}
            selectedIndex={hourIndex}
            onSelect={(i) => emit(hours[i] ?? selectedHour, selectedMinute)}
          />
        </View>
        <Text style={{ ...type.title2, color: colors.tertiaryLabel }}>:</Text>
        <View style={{ width: 64 }}>
          <WheelColumn
            values={minutes}
            selectedIndex={minuteIndex}
            onSelect={(i) => emit(selectedHour, minutes[i] ?? selectedMinute)}
          />
        </View>
      </View>
    </View>
  );
}
