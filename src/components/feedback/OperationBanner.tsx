import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { isFailed, isPending, isSucceeded, type OperationPhase } from '@/state/operationState';
import { colors, radius, type } from '@/theme/design';

interface Props {
  phase: OperationPhase;
  /** Optional copy per phase. Sensible defaults are provided. */
  pendingText?: string;
  successText?: string;
  errorText?: string;
  /** Shown on the failed state when provided; reuses no input, just re-fires. */
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Inline status banner for an async operation: pending → success → error with an
 * optional retry. Hidden while idle. Token-based (matches ErrorState/LoadingBlock
 * style, not ToastHost's className idiom). Unlike a toast it does not auto-dismiss,
 * so an error stays visible until the next attempt.
 */
export function OperationBanner({
  phase,
  pendingText = '正在保存…',
  successText = '已保存',
  errorText = '保存失败，请重试',
  onRetry,
  retryLabel = '重试',
}: Props) {
  if (phase === 'idle') return null;

  if (isPending(phase)) {
    return (
      <Banner bg={colors.fill}>
        <ActivityIndicator size="small" color={colors.secondaryLabel} />
        <Text style={{ ...type.callout, color: colors.secondaryLabel, flex: 1 }}>{pendingText}</Text>
      </Banner>
    );
  }

  if (isSucceeded(phase)) {
    return (
      <Banner bg={colors.successBg}>
        <SystemIcon name="check" size={16} color={colors.success} />
        <Text style={{ ...type.callout, color: colors.success, flex: 1 }}>{successText}</Text>
      </Banner>
    );
  }

  if (isFailed(phase)) {
    return (
      <Banner bg={colors.dangerBg}>
        <SystemIcon name="x" size={16} color={colors.danger} />
        <Text style={{ ...type.callout, color: colors.danger, flex: 1 }}>{errorText}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            android_ripple={{ color: 'rgba(184,92,74,0.12)' }}
            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.xs }}
          >
            <Text style={{ ...type.callout, color: colors.danger, fontWeight: '700' }}>{retryLabel}</Text>
          </Pressable>
        ) : null}
      </Banner>
    );
  }

  return null;
}

function Banner({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radius.md,
        backgroundColor: bg,
      }}
    >
      {children}
    </View>
  );
}
