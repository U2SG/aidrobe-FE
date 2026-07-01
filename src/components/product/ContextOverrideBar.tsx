import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { colors, radius, type } from '@/theme/design';

export type ContextOverrideSuggestion = {
  id: string;
  labelKey: I18nKey;
  payload: string;
};

type Props = {
  suggestions: ContextOverrideSuggestion[];
  onSelectSuggestion: (payload: string) => void;
  onSubmitText: (text: string) => void;
  disabled?: boolean;
};

// Today v2 context override (brief v0.9 §5.4): suggestions-first. The default
// affordance is a row of tappable chips, not a blank text box — one tap submits
// an override. Free text is the secondary path, tucked behind the chips.
export function ContextOverrideBar({ suggestions, onSelectSuggestion, onSubmitText, disabled }: Props) {
  const { t } = useT();
  const [text, setText] = useState('');

  const submitText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmitText(trimmed);
    setText('');
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ ...type.footnote, fontWeight: '600', color: colors.label }}>
        {t('today.override.prompt')}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {suggestions.map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onSelectSuggestion(s.payload)}
            style={({ pressed }) => ({
              minHeight: 36,
              paddingHorizontal: 14,
              justifyContent: 'center',
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.separator,
              backgroundColor: colors.elevated,
              opacity: disabled ? 0.5 : pressed ? 0.86 : 1,
            })}
          >
            <Text style={{ ...type.caption, fontWeight: '600', color: colors.label }}>
              {t(s.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: radius.md,
          backgroundColor: colors.secondaryElevated,
          paddingLeft: 14,
          paddingRight: 6,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!disabled}
          placeholder={t('today.override.placeholder')}
          placeholderTextColor={colors.quaternaryLabel}
          onSubmitEditing={submitText}
          returnKeyType="send"
          // iOS PWA: lock font-size >= 16 to defeat input auto-zoom.
          style={{ flex: 1, ...type.body, color: colors.label, paddingVertical: 12 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('today.override.submit')}
          disabled={disabled || !text.trim()}
          onPress={submitText}
          style={{
            height: 34,
            paddingHorizontal: 14,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: text.trim() ? colors.label : colors.fill,
          }}
        >
          <Text style={{ ...type.caption, fontWeight: '700', color: text.trim() ? colors.inverse : colors.quaternaryLabel }}>
            {t('today.override.submit')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
