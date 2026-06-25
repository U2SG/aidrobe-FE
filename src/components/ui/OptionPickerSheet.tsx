import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { colors, radius } from '@/theme/design';

import { BottomSheet } from './BottomSheet';
import { SystemIcon } from './SystemIcon';
import { Typography } from './Typography';

// Generic option picker on top of BottomSheet (FE#39). Single- or multi-select
// chip grid for tap-to-edit metadata fields (category / season / occasion / fit
// / color). Keeps every metadata editor on one shell instead of bespoke forms.
//
// - mode="single": tapping an option commits immediately and closes.
// - mode="multi": tapping toggles a local selection; the caller-provided Done
//   action (rendered here) commits the set.
// - allowCustom: shows a free-text input whose value is committed as a single
//   selection (used for free-text fields like color).

export interface PickerOption {
  /** Stable value sent back to the caller. */
  value: string;
  /** Localized display label. */
  label: string;
}

interface BaseProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  /** Custom free-text entry (e.g. color). Pass a localized placeholder. */
  allowCustom?: boolean;
  customPlaceholder?: string;
  /** Localized "Done" copy for multi-select. */
  doneLabel?: string;
}

type SingleProps = BaseProps & {
  mode: 'single';
  selected: string | null;
  onSelect: (value: string) => void;
};

type MultiProps = BaseProps & {
  mode: 'multi';
  selected: string[];
  onSelect: (values: string[]) => void;
};

export function OptionPickerSheet(props: SingleProps | MultiProps) {
  const {
    visible,
    onClose,
    title,
    options,
    allowCustom = false,
    customPlaceholder,
    doneLabel,
  } = props;

  const [draft, setDraft] = useState<string[]>([]);
  const [custom, setCustom] = useState('');

  // Seed the local draft from the incoming selection each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    if (props.mode === 'multi') setDraft(props.selected);
    else setDraft(props.selected ? [props.selected] : []);
    setCustom('');
    // Only re-seed on open; selected is captured intentionally at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const isSelected = (value: string) =>
    props.mode === 'multi' ? draft.includes(value) : props.selected === value;

  const handleTap = (value: string) => {
    if (props.mode === 'single') {
      props.onSelect(value);
      onClose();
      return;
    }
    setDraft((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const commitCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    if (props.mode === 'single') {
      props.onSelect(trimmed);
      onClose();
    } else {
      setDraft((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setCustom('');
    }
  };

  const commitMulti = () => {
    if (props.mode === 'multi') props.onSelect(draft);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <ScrollView
        style={{ maxHeight: 320 }}
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {options.map((opt) => {
          const active = isSelected(opt.value);
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => handleTap(opt.value)}
              style={({ pressed }) => ({
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.label : colors.elevated,
                borderWidth: 1,
                borderColor: active ? colors.label : colors.separator,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {active ? (
                <SystemIcon name="check" size={13} color={colors.inverse} strokeWidth={2} />
              ) : null}
              <Typography variant="footnote" color={active ? 'inverse' : 'label'}>
                {opt.label}
              </Typography>
            </Pressable>
          );
        })}
      </ScrollView>

      {allowCustom ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.separator,
            paddingHorizontal: 12,
          }}
        >
          <TextInput
            value={custom}
            onChangeText={setCustom}
            onSubmitEditing={commitCustom}
            placeholder={customPlaceholder}
            placeholderTextColor={colors.tertiaryLabel}
            style={{ flex: 1, minHeight: 44, fontSize: 15, color: colors.label }}
            returnKeyType="done"
          />
          <Pressable
            accessibilityRole="button"
            onPress={commitCustom}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.xs,
              backgroundColor: colors.label,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <SystemIcon name="check" size={15} color={colors.inverse} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}

      {props.mode === 'multi' ? (
        <Pressable
          accessibilityRole="button"
          onPress={commitMulti}
          style={({ pressed }) => ({
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.sm,
            backgroundColor: colors.label,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Typography variant="callout" color="inverse" style={{ fontWeight: '600' }}>
            {doneLabel ?? ''}
          </Typography>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}
