import { Pressable, Text, View } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { colors, radius, type } from '@/theme/design';

interface Props {
  /** Optional short reason shown above the retry control. */
  message?: string;
  onRetry: () => void;
  retryLabel?: string;
  /** Disabled while a retry is already in flight. */
  busy?: boolean;
}

/**
 * Compact "this failed — try again" control for inline placement next to a
 * failed result (e.g. an assistant answer bubble). The caller owns the retried
 * payload, so retry never requires re-typing input.
 */
export function InlineRetry({ message, onRetry, retryLabel = '重试', busy = false }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
      {message ? (
        <Text style={{ ...type.caption, color: colors.tertiaryLabel, flex: 1 }} numberOfLines={2}>
          {message}
        </Text>
      ) : null}
      <Pressable
        onPress={busy ? undefined : onRetry}
        disabled={busy}
        android_ripple={busy ? undefined : { color: colors.fill }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.separator,
          backgroundColor: colors.elevated,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <SystemIcon name="refresh" size={14} color={colors.secondaryLabel} strokeWidth={1.9} />
        <Text style={{ ...type.caption, color: colors.secondaryLabel, fontWeight: '600' }}>
          {retryLabel}
        </Text>
      </Pressable>
    </View>
  );
}
