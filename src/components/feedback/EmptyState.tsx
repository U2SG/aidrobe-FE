import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, spacing, type } from '@/theme/design';

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  // 'center' (default) fills the column and vertically centers — the historical
  // behavior every existing caller relies on. 'top' hugs the header with natural
  // top spacing (FE#53: fixes the over-empty "floating in the middle" look).
  align?: 'center' | 'top';
  // Back-compat alias for `subtitle` — still used by un-migrated callers.
  description?: string;
}

export function EmptyState({
  title,
  subtitle,
  icon,
  primaryAction,
  secondaryAction,
  align = 'center',
  description,
}: Props) {
  const resolvedSubtitle = subtitle ?? description;
  const layout =
    align === 'top'
      ? { paddingTop: 40, paddingBottom: 32 }
      : { flex: 1, justifyContent: 'center' as const, paddingVertical: 48 };

  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: spacing.screen,
        ...layout,
      }}
    >
      {icon ? <View style={{ marginBottom: 16 }}>{icon}</View> : null}
      <Text style={{ ...type.headline, color: colors.label, textAlign: 'center' }}>{title}</Text>
      {resolvedSubtitle ? (
        <Text
          style={{
            ...type.callout,
            marginTop: 8,
            color: colors.tertiaryLabel,
            textAlign: 'center',
            maxWidth: 340,
          }}
        >
          {resolvedSubtitle}
        </Text>
      ) : null}
      {primaryAction || secondaryAction ? (
        <View style={{ marginTop: 24, width: '100%', maxWidth: 320, gap: 10 }}>
          {primaryAction ? (
            <Button
              variant="primary"
              label={primaryAction.label}
              onPress={primaryAction.onPress}
            />
          ) : null}
          {secondaryAction ? (
            <Button
              variant="ghost"
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
