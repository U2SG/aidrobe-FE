import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { colors, radius, shadow, spacing, type as typeScale } from '@/theme/design';
import type { WardrobeStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<WardrobeStackParamList, 'ImportFailure'>;

const Tok = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  ink: colors.label,
  muted: colors.tertiaryLabel,
  rail: colors.secondaryLabel,
  separator: colors.separator,
} as const;

export function ImportFailureScreen({ navigation, route }: Props) {
  const { reason, onboarding } = route.params;
  const { t } = useT();

  const reasonLabel = t(`import.failure.label.${reason}` as I18nKey);
  const reasonHint = t(`import.failure.hint.${reason}` as I18nKey);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('import.failure.title')}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.errorStage}>
          <View style={styles.stageRail} />
          <View style={styles.scanFrame}>
            <View style={styles.scanMark}>
              <SystemIcon name="exclamation" size={42} color={Tok.ink} strokeWidth={1.6} />
            </View>
          </View>
          <View style={styles.scanLine} />
          <Text style={styles.title}>{reasonLabel}</Text>
          <Text style={styles.hint}>{reasonHint}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={t('import.failure.retake')}
          onPress={() => navigation.replace(onboarding ? ('AddWardrobe' as never) : 'AddItem')}
          variant="primary"
          style={styles.cta}
        />
        <Button
          label={t('import.failure.backToWardrobe')}
          onPress={() => navigation.popToTop()}
          variant="secondary"
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Tok.bg,
  },
  header: {
    paddingTop: 58,
    paddingHorizontal: spacing.screen + 6,
  },
  headerTitle: {
    ...typeScale.title2,
    color: Tok.ink,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.screen + 2,
    justifyContent: 'center',
  },
  errorStage: {
    minHeight: 420,
    borderRadius: radius.xl + 10,
    backgroundColor: Tok.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    ...shadow.elevated,
  },
  stageRail: {
    position: 'absolute',
    top: 42,
    left: 58,
    right: 58,
    height: 2,
    backgroundColor: Tok.ink,
    opacity: 0.18,
  },
  scanFrame: {
    width: 178,
    height: 178,
    borderRadius: 89,
    borderWidth: 1,
    borderColor: Tok.separator,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  scanMark: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: Tok.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    top: 206,
    left: 48,
    right: 48,
    height: 1,
    backgroundColor: Tok.rail,
    opacity: 0.2,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: Tok.ink,
    textAlign: 'center',
  },
  hint: {
    marginTop: 12,
    maxWidth: 245,
    ...typeScale.callout,
    lineHeight: 22,
    color: Tok.muted,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: spacing.screen + 2,
    paddingBottom: 104,
    gap: 12,
  },
  cta: {
    minHeight: 54,
    borderRadius: radius.xl,
  },
});
