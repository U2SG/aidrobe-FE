import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { useT } from '@/hooks/useT';
import { colors, radius, type } from '@/theme/design';

// V3-014 — the one-time contextual consent sheet (V3_SPEC §9.3).
//
// Presentation only: it renders copy and reports the two answers. Eligibility,
// one-time gating, the network calls and the analytics emit all live in
// `AvatarCandidatePromptHost`, so this file can be read as "what the user is
// actually told" without chasing behavior through it.
//
// The four copy blocks are the §15 authorization clauses — purpose, third-party
// model use, and replace/delete control (including what happens to derived
// results). They are separate keys rather than one paragraph so
// `AVATAR_CONSENT_COPY_KEYS` can enumerate exactly what the recorded
// `consent_version` stands for.

const T = {
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  divider: colors.separator,
};

interface Props {
  visible: boolean;
  /** Short-lived signed URL; null when the server sent no preview. */
  previewUrl: string | null;
  /** True while the consent POST is in flight — both actions lock, so a double
   *  tap cannot send accept and decline for the same candidate. */
  busy: boolean;
  /** Set after a failed answer: the sheet stays open with a retry affordance
   *  rather than closing on an outcome the user did not get. */
  failed: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AvatarCandidateSheet({
  visible,
  previewUrl,
  busy,
  failed,
  onAccept,
  onDecline,
}: Props) {
  const { t } = useT();
  const { height } = useWindowDimensions();

  // The copy scrolls; the actions never do. At a 150% font scale four blocks of
  // CJK copy plus a preview can exceed a bottom-anchored sheet's height, and a
  // consent sheet whose "暂不用" has been pushed off-screen is a trap rather
  // than a declinable prompt. Half the window leaves both actions in frame on
  // every phone size at every supported text size.
  const maxCopyHeight = Math.round(height * 0.5);

  return (
    <BottomSheet visible={visible} onClose={busy ? () => {} : onDecline}>
      <ScrollView
        style={{ maxHeight: maxCopyHeight }}
        contentContainerStyle={{ gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...type.title2, color: T.ink, textAlign: 'center' }}>
          {t('avatarConsent.title')}
        </Text>

        {previewUrl ? (
          <View
            style={{
              alignSelf: 'center',
              width: 132,
              height: 176,
              borderRadius: radius.md,
              overflow: 'hidden',
              backgroundColor: colors.secondaryElevated,
            }}
          >
            <Image
              accessibilityLabel={t('avatarConsent.previewAlt')}
              source={{ uri: previewUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        ) : null}

        <Text style={{ ...type.body, color: T.ink2, lineHeight: 21 }}>
          {t('avatarConsent.purpose')}
        </Text>
        <Text style={{ ...type.footnote, color: T.ink2, lineHeight: 19 }}>
          {t('avatarConsent.thirdParty')}
        </Text>
        <Text style={{ ...type.footnote, color: T.ink3, lineHeight: 19 }}>
          {t('avatarConsent.control')}
        </Text>

        {failed ? (
          <Text style={{ ...type.footnote, color: colors.danger, lineHeight: 19 }}>
            {t('avatarConsent.error')}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={failed ? t('avatarConsent.retry') : t('avatarConsent.accept')}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onAccept}
          // Layout lives on the plain style array, never in a style FUNCTION —
          // on the RN new arch a function's output is dropped on device, which
          // would leave white label text on a vanished background.
          style={{
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 14,
            borderRadius: radius.md,
            backgroundColor: colors.label,
            opacity: busy ? 0.45 : 1,
          }}
        >
          <Text style={{ ...type.callout, fontWeight: '600', color: colors.inverse }}>
            {failed ? t('avatarConsent.retry') : t('avatarConsent.accept')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('avatarConsent.decline')}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onDecline}
          style={{
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 14,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: T.divider,
            backgroundColor: 'transparent',
            opacity: busy ? 0.45 : 1,
          }}
        >
          <Text style={{ ...type.callout, fontWeight: '600', color: T.ink2 }}>
            {t('avatarConsent.decline')}
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
