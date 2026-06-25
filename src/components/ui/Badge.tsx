import { View } from 'react-native';

import { colors, radius } from '@/theme/design';

import { Typography } from './Typography';

// Generic pill badge — absorbs the inline NativeWind badges
// (`rounded-full bg-* px-2 py-0.5 text-[10px]`) scattered across cards/screens.
// For the richer dot+label status indicator use `StatusPill`; for accent tags
// use `Tag` — this is the plain token-driven pill those don't cover.
export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'dark';

interface Props {
  label: string;
  tone?: BadgeTone;
}

const TONES: Record<BadgeTone, { bg: string; fg: keyof typeof colors }> = {
  neutral: { bg: colors.fill, fg: 'secondaryLabel' },
  accent: { bg: colors.accentSoft, fg: 'label' },
  success: { bg: colors.successBg, fg: 'success' },
  warning: { bg: colors.warningBg, fg: 'warning' },
  danger: { bg: colors.dangerBg, fg: 'danger' },
  dark: { bg: colors.label, fg: 'inverse' },
};

export function Badge({ label, tone = 'neutral' }: Props) {
  const { bg, fg } = TONES[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Typography variant="caption" color={fg}>
        {label}
      </Typography>
    </View>
  );
}
