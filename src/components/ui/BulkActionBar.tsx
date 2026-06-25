import { Pressable, View } from 'react-native';

import { colors, radius, shadow } from '@/theme/design';

import { SystemIcon } from './SystemIcon';
import { Typography } from './Typography';

// Sticky multi-select action bar (FE#39). The shared primitive for bulk-edit
// flows: it renders a selection count + a row of caller-supplied actions over a
// floating bar. The screen owns the multi-select state and what each action does
// — this is presentational so the same bar serves wardrobe bulk-edit and any
// future multi-select surface.
//
// v1: the primitive ships, but wardrobe multi-select state is a deliberate seam
// (see WardrobeListScreen) — wiring it is out of v1 scope per FE#39 priority.

export interface BulkAction {
  key: string;
  label: string;
  onPress: () => void;
  /** Optional SystemIcon name rendered before the label. */
  icon?: 'sparkle' | 'check' | 'trash';
  tone?: 'default' | 'danger';
}

interface Props {
  visible: boolean;
  /** Localized selection summary, e.g. "3 selected". */
  countLabel: string;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({ visible, countLabel, actions, onClear }: Props) {
  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: radius.lg,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.separator,
        ...shadow.elevated,
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onClear}
        hitSlop={10}
        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <SystemIcon name="x" size={18} color={colors.tertiaryLabel} />
      </Pressable>
      <Typography variant="footnote" color="label" style={{ flex: 1, fontWeight: '600' }}>
        {countLabel}
      </Typography>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {actions.map((a) => (
          <Pressable
            key={a.key}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={a.onPress}
            style={({ pressed }) => ({
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              backgroundColor: a.tone === 'danger' ? colors.dangerBg : colors.label,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {a.icon ? (
              <SystemIcon
                name={a.icon}
                size={14}
                color={a.tone === 'danger' ? colors.danger : colors.inverse}
                strokeWidth={1.9}
              />
            ) : null}
            <Typography
              variant="caption"
              color={a.tone === 'danger' ? 'danger' : 'inverse'}
              style={{ fontWeight: '600' }}
            >
              {a.label}
            </Typography>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
