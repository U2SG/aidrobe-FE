import { Pressable, View, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/design';

import { ConfidenceBadge } from './ConfidenceBadge';
import { SystemIcon } from './SystemIcon';
import { Typography } from './Typography';

// Tap-to-edit metadata chip (FE#39). One chip = one field; tapping opens the
// caller's editor (an OptionPickerSheet, a text sheet, etc.) without navigating
// to a full-page form. Low-confidence AI fields render distinctly (warning ring)
// with a confirm/change affordance so they read as reviewable, not final.
//
// Presentational: the caller owns the value source, the editor, and the
// confirm/change handlers + their localized copy. The component ships no copy.

interface Props {
  /** Field label, e.g. "Category". */
  label: string;
  /** Current localized value, or null/empty for "not set". */
  value?: string | null;
  /** Placeholder shown when value is empty. */
  placeholder?: string;
  /** Opens the editor for this field. */
  onPress: () => void;
  /** Render the chip as low-confidence (warning ring + confirm/change row). */
  lowConfidence?: boolean;
  /** AI-detection score in [0, 1]; renders a ConfidenceBadge when provided. */
  confidenceScore?: number | null;
  /** Localized confidence label, e.g. "62%" (required when confidenceScore is set). */
  confidenceLabel?: string;
  /** Confirm the AI value as-is. Only used when lowConfidence. */
  onConfirm?: () => void;
  /** Localized "Confirm" copy (required when onConfirm is set). */
  confirmLabel?: string;
  /** Localized "Change" copy (required when onConfirm is set). */
  changeLabel?: string;
  style?: ViewStyle;
}

export function EditableChip({
  label,
  value,
  placeholder,
  onPress,
  lowConfidence = false,
  confidenceScore,
  confidenceLabel,
  onConfirm,
  confirmLabel,
  changeLabel,
  style,
}: Props) {
  const display = value && value.length > 0 ? value : (placeholder ?? '—');
  const isEmpty = !value || value.length === 0;
  const showReview = lowConfidence && onConfirm != null;

  return (
    <View style={[{ gap: 6 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        onPress={onPress}
        // 44px min hit area for mobile.
        style={({ pressed }) => ({
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: radius.pill,
          backgroundColor: colors.elevated,
          borderWidth: 1,
          borderColor: lowConfidence ? colors.warning : colors.separator,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flex: 1, gap: 1 }}>
          <Typography variant="caption" color="tertiaryLabel">
            {label}
          </Typography>
          <Typography
            variant="footnote"
            color={isEmpty ? 'tertiaryLabel' : 'label'}
            style={{ fontWeight: '500' }}
          >
            {display}
          </Typography>
        </View>
        {confidenceScore != null ? (
          <ConfidenceBadge score={confidenceScore} label={confidenceLabel ?? ''} />
        ) : null}
        {lowConfidence ? (
          <SystemIcon name="sparkle" size={14} color={colors.warning} strokeWidth={1.9} />
        ) : (
          <SystemIcon name="chevronRight" size={14} color={colors.tertiaryLabel} />
        )}
      </Pressable>

      {showReview ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => ({
              minHeight: 44,
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              borderRadius: radius.sm,
              backgroundColor: colors.label,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <SystemIcon name="check" size={13} color={colors.inverse} strokeWidth={2} />
            <Typography variant="caption" color="inverse">
              {confirmLabel ?? ''}
            </Typography>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => ({
              minHeight: 44,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              backgroundColor: colors.elevated,
              borderWidth: 1,
              borderColor: colors.separator,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Typography variant="caption" color="secondaryLabel">
              {changeLabel ?? ''}
            </Typography>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
