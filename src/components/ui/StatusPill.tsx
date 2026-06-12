import { View, Text } from 'react-native';

type Kind = 'ok' | 'warn' | 'danger';

interface Props {
  kind?: Kind;
  label?: string;
}

const MAP: Record<Kind, { color: string; bg: string; defaultLabel: string }> = {
  ok:     { color: '#7A9B6E', bg: '#E5EDDF', defaultLabel: '可穿' },
  warn:   { color: '#C8924A', bg: '#F4E8D1', defaultLabel: '待洗' },
  danger: { color: '#B85C4A', bg: '#F0D9D2', defaultLabel: '不可穿' },
};

export function StatusPill({ kind = 'ok', label }: Props) {
  const m = MAP[kind];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.color }} />
      <Text style={{ fontSize: 11, color: m.color, fontWeight: '500' }}>
        {label ?? m.defaultLabel}
      </Text>
    </View>
  );
}
