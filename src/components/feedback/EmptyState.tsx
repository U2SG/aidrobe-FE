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
  // Back-compat for existing callers.
  description?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({
  title,
  subtitle,
  icon,
  primaryAction,
  secondaryAction,
  description,
  ctaLabel,
  onCtaPress,
}: Props) {
  const resolvedSubtitle = subtitle ?? description;
  const resolvedPrimaryAction =
    primaryAction ??
    (ctaLabel && onCtaPress ? { label: ctaLabel, onPress: onCtaPress } : undefined);

  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: spacing.screen,
        paddingTop: 40,
        paddingBottom: 32,
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
      {resolvedPrimaryAction || secondaryAction ? (
        <View style={{ marginTop: 24, width: '100%', maxWidth: 320, gap: 10 }}>
          {resolvedPrimaryAction ? (
            <Button
              variant="primary"
              label={resolvedPrimaryAction.label}
              onPress={resolvedPrimaryAction.onPress}
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
