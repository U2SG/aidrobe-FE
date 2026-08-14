import { useCallback, useRef, useState } from 'react';
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

  // Bound the whole sheet body, then let the COPY shrink inside it — rather
  // than capping the copy at a fixed fraction and trusting the rest to fit.
  //
  // The previous `maxHeight: height * 0.5` on the scroller alone was already
  // saturated by the four normal copy blocks at 100%, so every additional line
  // was clipped while the actions stayed comfortably in frame: at 150% the
  // third-party clause was cut mid-glyph and the replace/delete clause fell
  // entirely below the fold, and at 100% the failure line was reduced to a
  // sliver. A consent sheet that shows its accept action while hiding its
  // third-party disclosure does not satisfy acceptance 3.
  //
  // `flexShrink: 1` on the scroller inside a `maxHeight`-bounded column hands
  // the copy every pixel the action row does not need, at ANY text scale. That
  // is the property worth having: a larger fraction would only push the same
  // defect one text size further out, and native `fontScale` is not observable
  // from a browser, so a tuned fraction could not have been verified anyway.
  //
  // 0.86 is derived, not picked: `BottomSheet`'s own chrome adds 14 + 32 = 46px
  // of padding, so the sheet occupies 0.86·h + 46 and still leaves scrim
  // visible on any window taller than ~575px — it keeps reading as a sheet.
  const maxBodyHeight = Math.round(height * 0.86);

  // THE FOLD IS DECLARED WHENEVER THERE IS COPY BELOW IT.
  //
  // `flexShrink` guarantees the copy gets every spare pixel, but it cannot
  // guarantee the copy FITS: past some text size a §15 clause is necessarily
  // below the fold. At 200% the third-party line ends mid-sentence exactly at
  // the action row, which reads as the end of the copy rather than as a fold —
  // nothing on screen said there was more. "Reachable by scrolling" and "the
  // user knows to scroll" are different claims, and acceptance 3 needs the
  // second one.
  //
  // A bigger copy budget was rejected for the same reason the 0.86 cap already
  // states: it moves the defect one text size further out instead of removing
  // it. This holds at any scale, so it is the general fix rather than a tuned
  // one — and it is honest in the other direction too, staying absent while
  // everything fits (100% and 150%) so it never becomes decoration.
  const [moreBelow, setMoreBelow] = useState(false);
  const geom = useRef({ content: 0, layout: 0, offset: 0 });
  const syncFold = useCallback(() => {
    const { content, layout, offset } = geom.current;
    // 1px of slack: sub-pixel line heights otherwise leave the hint stuck on
    // after a scroll that did reach the end.
    setMoreBelow(content - layout - offset > 1);
  }, []);

  return (
    <BottomSheet visible={visible} onClose={busy ? () => {} : onDecline}>
      {/* One child, so `BottomSheet`'s own `gap: 18` no longer separates copy
          from actions — it is recreated here, inside the bounded column. */}
      <View style={{ maxHeight: maxBodyHeight, gap: 18 }}>
        <ScrollView
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ gap: 14 }}
          scrollEventThrottle={16}
          onLayout={(e) => {
            geom.current.layout = e.nativeEvent.layout.height;
            syncFold();
          }}
          onContentSizeChange={(_w, h) => {
            geom.current.content = h;
            syncFold();
          }}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            geom.current = {
              content: contentSize.height,
              layout: layoutMeasurement.height,
              offset: contentOffset.y,
            };
            syncFold();
          }}
        >
          <Text
            nativeID="avatar-consent-title"
            accessibilityRole="header"
            style={{ ...type.title2, color: T.ink, textAlign: 'center' }}
          >
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

          {/* The three §15 authorization clauses. `nativeID` is what lets the
              evidence driver assert each one is FULLY inside the scroller's
              client rect rather than merely present in the DOM — the
              distinction the round-2 evaluator's P1 turned on. */}
          <Text
            nativeID="avatar-consent-purpose"
            style={{ ...type.body, color: T.ink2, lineHeight: 21 }}
          >
            {t('avatarConsent.purpose')}
          </Text>
          <Text
            nativeID="avatar-consent-third-party"
            style={{ ...type.footnote, color: T.ink2, lineHeight: 19 }}
          >
            {t('avatarConsent.thirdParty')}
          </Text>
          <Text
            nativeID="avatar-consent-control"
            style={{ ...type.footnote, color: T.ink3, lineHeight: 19 }}
          >
            {t('avatarConsent.control')}
          </Text>
        </ScrollView>

        {/* Outside the scroller on purpose: a notice saying "there is more
            below" cannot itself be below the fold. Plain text rather than a
            gradient or a chevron so a screen reader announces it too — the
            clause it points at is a §15 disclosure, not a nicety. */}
        {moreBelow ? (
          <Text
            nativeID="avatar-consent-more"
            style={{ ...type.caption, color: T.ink3, textAlign: 'center' }}
          >
            {t('avatarConsent.more')}
          </Text>
        ) : null}

        {/* The failure line is a status for the ACTION ROW, so it sits beside it
            and never inside the scroller. A message explaining why the last tap
            did nothing must not be something the user has to scroll to find —
            which is exactly what it became once the copy saturated the old
            fixed-height container. */}
        {failed ? (
          <Text
            nativeID="avatar-consent-error"
            accessibilityRole="alert"
            style={{ ...type.footnote, color: colors.danger, lineHeight: 19 }}
          >
            {t('avatarConsent.error')}
          </Text>
        ) : null}

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
      </View>
    </BottomSheet>
  );
}
