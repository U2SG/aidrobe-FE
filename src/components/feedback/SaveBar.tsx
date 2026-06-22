import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { isFailed, isPending, type OperationPhase } from '@/state/operationState';
import { colors, radius, spacing, type } from '@/theme/design';

interface Props {
  phase: OperationPhase;
  /** Primary save action. */
  saveLabel: string;
  onSave: () => void;
  /** Disable the save CTA (e.g. nothing changed yet). */
  saveDisabled?: boolean;
  /** Optional secondary action (e.g. skip / re-shoot). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Error copy surfaced inline above the buttons on failure. */
  errorText?: string;
}

/**
 * Sticky bottom save bar with an inline error row. On failure it shows a
 * persistent error line (unlike a toast that disappears) directly above the
 * save button — the form/input above is untouched, so pressing save again
 * resubmits the same edited content without re-typing.
 */
export function SaveBar({
  phase,
  saveLabel,
  onSave,
  saveDisabled = false,
  secondaryLabel,
  onSecondary,
  errorText = '保存失败，请重试',
}: Props) {
  const pending = isPending(phase);
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.screen,
        paddingTop: 14,
        paddingBottom: 36,
        backgroundColor: colors.groupedBackground,
        gap: 10,
      }}
    >
      {isFailed(phase) ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: radius.md,
            backgroundColor: colors.dangerBg,
          }}
        >
          <SystemIcon name="exclamation" size={16} color={colors.danger} />
          <Text style={{ ...type.callout, color: colors.danger, flex: 1 }}>{errorText}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {secondaryLabel && onSecondary ? (
          <Button
            variant="outline"
            size="sm"
            label={secondaryLabel}
            onPress={onSecondary}
            disabled={pending}
            style={{ flex: 1, minHeight: 50, paddingHorizontal: 10, borderRadius: 14 }}
          />
        ) : null}
        <Button
          variant="primary"
          label={isFailed(phase) ? '重试保存' : saveLabel}
          onPress={onSave}
          loading={pending}
          disabled={saveDisabled}
          style={{ flex: secondaryLabel && onSecondary ? 2 : 1, borderRadius: 14 }}
        />
      </View>
    </View>
  );
}
