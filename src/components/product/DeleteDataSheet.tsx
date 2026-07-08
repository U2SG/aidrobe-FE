import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { Typography } from '@/components/ui/Typography';
import { useT } from '@/hooks/useT';
import { colors, radius, type } from '@/theme/design';

// Bullet item displayed inside the warning list.
function BulletRow({ iconName, textKey }: { iconName: Parameters<typeof SystemIcon>[0]['name']; textKey: string }) {
  const { t } = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <SystemIcon name={iconName} size={16} color={colors.tertiaryLabel} />
      <Text style={{ ...type.footnote, color: colors.secondaryLabel, flex: 1 }}>{t(textKey as never)}</Text>
    </View>
  );
}

interface Props {
  visible: boolean;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Styled bottom-sheet confirmation for the destructive "clear all data" action.
// Mirrors aidrobe-v2-19-delete-data-confirmation.png:
//   - Trash icon in a danger-tinted badge
//   - Title + warning body
//   - Three bullet rows (clothing, activity, preferences)
//   - Filled danger confirm button + ghost cancel
//   - "This action cannot be undone" footer note
export function DeleteDataSheet({ visible, loading, onConfirm, onClose }: Props) {
  const { t } = useT();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        {/* Icon badge */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.lg,
            backgroundColor: colors.dangerBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SystemIcon name="trash" size={26} color={colors.danger} />
        </View>

        {/* Title */}
        <Typography variant="title2" align="center">
          {t('deleteData.sheet.title' as never)}
        </Typography>

        {/* Warning body */}
        <Text
          style={{
            ...type.footnote,
            color: colors.secondaryLabel,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          {t('deleteData.sheet.body' as never)}
        </Text>

        {/* Bullet list */}
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: colors.groupedBackground,
            borderRadius: radius.md,
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 10,
          }}
        >
          <BulletRow iconName="wardrobe" textKey="deleteData.sheet.bullet.clothing" />
          <BulletRow iconName="bookmark" textKey="deleteData.sheet.bullet.activity" />
          <BulletRow iconName="heart" textKey="deleteData.sheet.bullet.preferences" />
        </View>

        {/* Confirm (destructive) */}
        <Pressable
          onPress={onConfirm}
          disabled={loading}
          android_ripple={{ color: colors.dangerBg }}
          accessibilityRole="button"
          style={{
            alignSelf: 'stretch',
            backgroundColor: loading ? colors.danger + 'CC' : colors.danger,
            borderRadius: radius.md,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ ...type.callout, color: colors.inverse, fontWeight: '600' }}>
            {t('deleteData.sheet.confirm' as never)}
          </Text>
        </Pressable>

        {/* Cancel */}
        <Pressable
          onPress={onClose}
          disabled={loading}
          android_ripple={{ color: colors.fill }}
          accessibilityRole="button"
          style={{ alignSelf: 'stretch', paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ ...type.callout, color: colors.secondaryLabel }}>
            {t('common.cancel' as never)}
          </Text>
        </Pressable>

        {/* Footer note */}
        <Text style={{ ...type.caption, color: colors.tertiaryLabel, textAlign: 'center' }}>
          {t('deleteData.sheet.irreversible' as never)}
        </Text>
      </View>
    </BottomSheet>
  );
}
