import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { colors, radius, type } from '@/theme/design';

type IconName = 'camera' | 'photo' | 'sparkle' | 'link' | 'bag';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onAlbum: () => void;
  onOutfit: () => void;
  onLink: () => void;
  onShoppingScreenshot: () => void;
}

export function AddSourceSheet({
  visible,
  onClose,
  onCamera,
  onAlbum,
  onOutfit,
  onLink,
  onShoppingScreenshot,
}: Props) {
  const { t } = useT();

  const options: Array<{
    icon: IconName;
    label: string;
    hint: string;
    onPress: () => void;
  }> = [
    {
      icon: 'camera',
      label: t('addSource.camera.label'),
      hint: t('addSource.camera.hint'),
      onPress: onCamera,
    },
    {
      icon: 'photo',
      label: t('addSource.album.label'),
      hint: t('addSource.album.hint'),
      onPress: onAlbum,
    },
    {
      icon: 'sparkle',
      label: t('addSource.outfit.label'),
      hint: t('addSource.outfit.hint'),
      onPress: onOutfit,
    },
    {
      icon: 'link',
      label: t('addSource.link.label'),
      hint: t('addSource.link.hint'),
      onPress: onLink,
    },
    {
      icon: 'bag',
      label: t('addSource.shoppingScreenshot.label'),
      hint: t('addSource.shoppingScreenshot.hint'),
      onPress: onShoppingScreenshot,
    },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('addSource.title')}</Text>
        <Text style={styles.subtitle}>{t('addSource.subtitle')}</Text>
      </View>

      <View style={styles.list}>
        {options.map((option, index) => (
          <SourceRow
            key={option.icon}
            icon={option.icon}
            label={option.label}
            hint={option.hint}
            onPress={option.onPress}
            showDivider={index < options.length - 1}
          />
        ))}
      </View>

      <Pressable
        onPress={onClose}
        style={styles.cancelButton}
        accessibilityRole="button"
      >
        <Text style={styles.cancelLabel}>{t('addSource.cancel')}</Text>
      </Pressable>
    </BottomSheet>
  );
}

function SourceRow({
  icon,
  label,
  hint,
  onPress,
  showDivider,
}: {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
  showDivider: boolean;
}) {
  return (
    <>
      <Pressable
        onPress={onPress}
        style={styles.row}
        accessibilityRole="button"
      >
        <View style={styles.iconWrap}>
          <SystemIcon name={icon} size={22} color={colors.label} strokeWidth={1.9} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowHint}>{hint}</Text>
        </View>
        <SystemIcon name="chevronRight" size={18} color={colors.tertiaryLabel} strokeWidth={2} />
      </Pressable>
      {showDivider ? <View style={styles.divider} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
  },
  title: {
    ...type.title2,
    color: colors.label,
  },
  subtitle: {
    ...type.callout,
    color: colors.tertiaryLabel,
  },
  list: {
    borderRadius: radius.lg,
    backgroundColor: colors.groupedBackground,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...type.body,
    fontWeight: '600',
    color: colors.label,
  },
  rowHint: {
    ...type.footnote,
    color: colors.tertiaryLabel,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: 74,
  },
  cancelButton: {
    minHeight: 54,
    borderRadius: radius.xl,
    backgroundColor: colors.groupedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...type.body,
    fontWeight: '600',
    color: colors.label,
  },
  pressed: {
    opacity: 0.72,
  },
});
