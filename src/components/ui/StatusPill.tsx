import { View, Text } from 'react-native';

import { colors, type } from '@/theme/design';

type Kind = 'ok' | 'warn' | 'danger';

interface Props {
  kind?: Kind;
  label?: string;
}

const MAP: Record<Kind, { color: string; bg: string; defaultLabel: string }> = {
  ok: { color: colors.success, bg: colors.successBg, defaultLabel: '可穿' },
  warn: { color: colors.warning, bg: colors.warningBg, defaultLabel: '待洗' },
  danger: { color: colors.danger, bg: colors.dangerBg, defaultLabel: '不可穿' },
};

export function StatusPill({ kind = 'ok', label }: Props) {
  const m = MAP[kind];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.color }} />
      <Text style={{ ...type.caption, color: m.color, fontWeight: '600' }}>
        {label ?? m.defaultLabel}
      </Text>
    </View>
  );
}
