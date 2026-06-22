// Loading-state surface — a centered, branded inline wait. Uses the small AIOrb
// so it shares the motion language with the processing/Ask surfaces, while the
// existing `feedback/LoadingBlock` remains the lightweight ActivityIndicator
// option. Pick LoadingState when the wait deserves the brand presence; keep
// LoadingBlock for incidental row/section spinners.
import { Text, View } from 'react-native';

import { AIOrb, type AIOrbSize } from '@/components/ui/AIOrb';
import { colors, type } from '@/theme/design';

interface Props {
  label?: string;
  size?: AIOrbSize;
}

export function LoadingState({ label, size = 'md' }: Props) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
      <AIOrb variant="ink" size={size} />
      {label ? (
        <Text style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center' }}>{label}</Text>
      ) : null}
    </View>
  );
}
