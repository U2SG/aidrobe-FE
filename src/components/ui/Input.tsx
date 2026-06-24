import { forwardRef } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { colors, radius, type } from '@/theme/design';

import { Typography } from './Typography';

// Token-driven text field, consolidating the inline `inputStyle` objects /
// ad-hoc `<TextInput>` styling across AddInspiration / AddItem / link modals.
// Placeholder uses quaternaryLabel; `error` renders an inline caption and a
// danger border.
interface Props extends TextInputProps {
  error?: string | null;
  invalid?: boolean;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { error, invalid, multiline, style, ...rest },
  ref,
) {
  const hasError = invalid || Boolean(error);
  return (
    <View>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.quaternaryLabel}
        multiline={multiline}
        style={[
          {
            backgroundColor: colors.elevated,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: hasError ? colors.danger : colors.borderSubtle,
            paddingHorizontal: 14,
            paddingVertical: multiline ? 12 : 10,
            ...type.body,
            color: colors.label,
            minHeight: multiline ? 88 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Typography variant="caption" color="danger" style={{ marginTop: 4 }}>
          {error}
        </Typography>
      ) : null}
    </View>
  );
});
