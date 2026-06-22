import { ActivityIndicator, Text, View } from 'react-native';

import { AIOrb } from '@/components/ui/AIOrb';
import { colors, type } from '@/theme/design';

interface Props {
  /** Primary line, e.g. "正在识别衣物". */
  title: string;
  /** Optional secondary line. */
  detail?: string;
  /** Use the branded orb (heavier work) vs a plain spinner. Default orb. */
  variant?: 'orb' | 'spinner';
}

/**
 * Full-bleed "work in progress" block for processing-style waits (recognition,
 * generation). Centered over the grouped background; reuses the SiriOrb so it
 * matches the existing ad-hoc wait screens. Render it as the whole screen body
 * (or inside an absolute-fill wrapper) while `processing`.
 */
export function ProcessingOverlay({ title, detail, variant = 'orb' }: Props) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 32,
        backgroundColor: colors.groupedBackground,
      }}
    >
      {variant === 'orb' ? <AIOrb variant="ink" size="lg" /> : <ActivityIndicator color={colors.accent} />}
      <Text style={{ ...type.headline, color: colors.secondaryLabel, textAlign: 'center' }}>{title}</Text>
      {detail ? (
        <Text style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center' }}>{detail}</Text>
      ) : null}
    </View>
  );
}
