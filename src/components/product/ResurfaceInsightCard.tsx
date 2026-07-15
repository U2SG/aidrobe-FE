import { Pressable, Text } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { colors, radius, type } from '@/theme/design';

export type ResurfaceInsight = {
  id: string;
  text: string;
  itemId?: string;
};

type Props = {
  insight: ResurfaceInsight | null | undefined;
  onPress?: (insight: ResurfaceInsight) => void;
};

// A single low-key "you haven't worn X in a while" nudge under the outfit card.
// Renders nothing when there is no real insight — never a fabricated one — and
// the caller enforces the frequency cap (max 1/day, same-item cooldown; wired
// in Phase 5). One insight only; it never stacks.
export function ResurfaceInsightCard({ insight, onPress }: Props) {
  if (!insight) return null;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress ? () => onPress(insight) : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: radius.lg,
        backgroundColor: colors.groupedBackground,
        borderWidth: 1,
        borderColor: colors.separatorSoft,
        padding: 14,
      }}
    >
      <SystemIcon name="clock" size={18} color={colors.tertiaryLabel} strokeWidth={1.8} />
      <Text style={{ flex: 1, ...type.callout, color: colors.secondaryLabel }}>{insight.text}</Text>
      {onPress ? <SystemIcon name="chevronRight" size={16} color={colors.quaternaryLabel} /> : null}
    </Pressable>
  );
}
