import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { colors, radius, type } from '@/theme/design';

export type ContextOverrideSuggestion = {
  id: string;
  labelKey: I18nKey;
  payload: string;
  // Optional icon from SystemIcon's name union. Chips without one render text only.
  iconName?: 'suitcase' | 'compass';
};

type Props = {
  visible: boolean;
  onClose: () => void;
  suggestions: ContextOverrideSuggestion[];
  onSelectSuggestion: (payload: string) => void;
  onSubmitText: (text: string) => void;
  disabled?: boolean;
};

// Today v2 context override sheet (brief v0.9 §5.4): bottom sheet, suggestions
// first (primary), free-text input second (secondary). Chips fire immediately
// and close. The text input submits via the inline send button or the full-width
// CTA; cancel dismisses without action.
//
// Layout note: every Pressable here keeps its layout on a plain-object style or
// an inner View — layout props inside a Pressable style FUNCTION get dropped
// on-device (new arch) and the children render stacked/scattered (web is fine,
// which is how it passed web verification).
export function ContextOverrideBar({
  visible,
  onClose,
  suggestions,
  onSelectSuggestion,
  onSubmitText,
  disabled,
}: Props) {
  const { t } = useT();
  const [text, setText] = useState('');

  const handleChip = (payload: string) => {
    if (disabled) return;
    onSelectSuggestion(payload);
    onClose();
  };

  const handleSubmitText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmitText(trimmed);
    setText('');
    onClose();
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  // Chips arranged in a 2-column grid matching the prototype layout.
  const chipRows: ContextOverrideSuggestion[][] = [];
  for (let i = 0; i < suggestions.length; i += 2) {
    chipRows.push(suggestions.slice(i, i + 2));
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      {/* Title + subtitle */}
      <View style={{ gap: 4 }}>
        <Text style={{ ...type.headline, color: colors.label, textAlign: 'center' }}>
          {t('today.override.prompt')}
        </Text>
        <Text style={{ ...type.footnote, color: colors.tertiaryLabel, textAlign: 'center' }}>
          {t('today.override.subtitle')}
        </Text>
      </View>

      {/* Chips — 2-column grid, primary affordance */}
      <View style={{ gap: 10 }}>
        {chipRows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => handleChip(s.payload)}
                android_ripple={{ color: colors.fill }}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    minHeight: 72,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.separator,
                    backgroundColor: colors.elevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: 12,
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  {s.iconName ? (
                    <SystemIcon
                      name={s.iconName}
                      size={20}
                      color={colors.secondaryLabel}
                      strokeWidth={1.6}
                    />
                  ) : null}
                  <Text
                    style={{
                      ...type.callout,
                      fontWeight: '600',
                      color: colors.label,
                      textAlign: 'center',
                    }}
                  >
                    {t(s.labelKey)}
                  </Text>
                </View>
              </Pressable>
            ))}
            {/* Pad the last row if it has only one chip */}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>

      {/* Divider label — secondary affordance transition */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.separatorSoft }} />
        <Text style={{ ...type.footnote, color: colors.quaternaryLabel }}>
          {t('today.override.orType')}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.separatorSoft }} />
      </View>

      {/* Free-text input row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: radius.md,
          backgroundColor: colors.secondaryElevated,
          paddingLeft: 12,
          paddingRight: 6,
        }}
      >
        <SystemIcon name="search" size={16} color={colors.quaternaryLabel} strokeWidth={1.6} />
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!disabled}
          placeholder={t('today.override.placeholder')}
          placeholderTextColor={colors.quaternaryLabel}
          onSubmitEditing={handleSubmitText}
          returnKeyType="send"
          // iOS PWA: lock font-size >= 16 to defeat input auto-zoom.
          style={{ flex: 1, ...type.body, color: colors.label, paddingVertical: 12 }}
        />
        {text.trim() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('today.override.submit')}
            onPress={handleSubmitText}
            disabled={disabled}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <View
              style={{
                height: 34,
                paddingHorizontal: 14,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.label,
              }}
            >
              <Text style={{ ...type.caption, fontWeight: '700', color: colors.inverse }}>
                {t('today.override.submit')}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>

      {/* Primary CTA — submits free text if present; disabled when empty */}
      <Pressable
        accessibilityRole="button"
        disabled={disabled || !text.trim()}
        onPress={handleSubmitText}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <View
          style={{
            height: 50,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: text.trim() ? colors.label : colors.fill,
          }}
        >
          <Text
            style={{
              ...type.headline,
              color: text.trim() ? colors.inverse : colors.quaternaryLabel,
            }}
          >
            {t('today.override.refresh')}
          </Text>
        </View>
      </Pressable>

      {/* Cancel */}
      <Pressable
        accessibilityRole="button"
        onPress={handleClose}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <View style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>
            {t('common.cancel')}
          </Text>
        </View>
      </Pressable>
    </BottomSheet>
  );
}
