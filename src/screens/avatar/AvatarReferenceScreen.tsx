import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import {
  deleteAvatarProfile,
  getAvatarProfile,
  replaceAvatarVersion,
} from '@/api/avatarProfile';
import { avatarReferenceControls, type AvatarProfile } from '@/api/avatarProfileMapping';
import type { HttpErrorLike } from '@/api/purchaseDecisionMapping';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT, type UseT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { enableV3Avatar } from '@/lib/featureFlags';
import { colors, radius, shadow, spacing, type } from '@/theme/design';
import type { SettingsStackParamList } from '@/types/navigation';
import {
  AVATAR_REFERENCE_CONFIRMS,
  controlAsked,
  controlCancelled,
  controlConfirmed,
  controlFailed,
  controlsEnabled,
  deletionSettled,
  initialAvatarReferenceState,
  profileLoaded,
  profileReadFailed,
  referenceRetryTarget,
  referenceStatusKeySuffix,
  replacementSettled,
  type AvatarReferenceControl,
  type AvatarReferenceState,
} from './avatarReference';

type Props = NativeStackScreenProps<SettingsStackParamList, 'AvatarReference'>;

// V3-021 — Profile's 形象参考 controls (V3_SPEC §4.4 + §15, contract §4.2).
//
// A settings sub-page, reached from one Profile row. Not a tab, not an identity
// page: it renders what the reference is used for, its authorization state, its
// current version, and the four controls §15 requires — 查看 / 替换 /
// 停止用于生成 / 删除形象参考及派生结果. The frozen scope-exclusion table names
// the anti-goal directly ("Avatar identity homepage → Profile exposes data
// controls only"), so there is nothing here to tend, complete or come back to.
//
// EVERY RULE LIVES IN `avatarReference.ts` / `avatarProfileMapping.ts`. This file
// decides nothing about which control is offered or what a response means — that
// is what makes those rules testable in Node, and it is why a control that the
// backend would refuse cannot appear only in the rendering.
//
// THE CONFIRMATION IS INLINE, NOT A DIALOG. `Alert.alert` (ProfileV2's pattern
// for account deactivation) is not reliably renderable on react-native-web, and
// the destructive-control evidence this feature owes has to be *seen*. An inline
// confirm block is also the low-density choice: the consequence sentence is in
// the page, above the button that carries it out, instead of in a layer over it.
//
// NO FE ANALYTICS EVENT IS EMITTED HERE, deliberately. `v3_avatar_deleted` is
// BE-owned (V3-013 emits it inside the DELETE, with `purge_derived`), so
// emitting a second FE copy would double-count the one action and, on this
// build, would send it to a console the dispatcher never registered (V3-020's
// carried risk 1). The durable record of a deletion is the server's.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          ...type.caption,
          color: colors.tertiaryLabel,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          overflow: 'hidden',
          borderRadius: radius.lg,
          backgroundColor: colors.elevated,
          ...shadow.soft,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function ValueRow({
  labelKey,
  value,
  last,
}: {
  labelKey: I18nKey;
  value: string;
  last?: boolean;
}) {
  const { t } = useT();
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.separatorSoft,
      }}
    >
      <Text style={{ ...type.body, color: colors.label, flex: 1 }}>{t(labelKey)}</Text>
      <Text style={{ ...type.callout, color: colors.tertiaryLabel }} testID={`avatarReference.value.${labelKey}`}>
        {value}
      </Text>
    </View>
  );
}

function ControlRow({
  labelKey,
  subKey,
  onPress,
  disabled,
  danger,
  last,
  testID,
}: {
  labelKey: I18nKey;
  subKey?: I18nKey;
  onPress: () => void;
  disabled: boolean;
  danger?: boolean;
  last?: boolean;
  testID: string;
}) {
  const { t } = useT();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID={testID}
      // Layout stays on the inner View: a Pressable whose layout props live in
      // its style FUNCTION loses them on device (FE CLAUDE.md).
      style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
          backgroundColor: colors.elevated,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.separatorSoft,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...type.body, color: danger ? colors.danger : colors.label }}>
            {t(labelKey)}
          </Text>
          {subKey ? (
            <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>{t(subKey)}</Text>
          ) : null}
        </View>
        {danger ? null : (
          <SystemIcon name="chevronRight" size={16} color={colors.quaternaryLabel} />
        )}
      </View>
    </Pressable>
  );
}

/** The two §15 authorization clauses this surface restates.
 *
 *  Deliberately NOT the `avatarConsent.*` keys: those are what a stored
 *  `consent_version` stands for, and reusing them here would silently widen the
 *  meaning of every version already recorded (`avatarConsentCopy.ts` makes that
 *  rule explicit). These are their own keys, saying the same two things §15
 *  requires Profile to say — what it is used for, and that a third-party model
 *  processes it — and they are under the same §4.3 human gate. */
function PurposeBlock({ t }: { t: UseT['t'] }) {
  return (
    <View
      style={{
        backgroundColor: colors.accentSoft,
        borderRadius: radius.md,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 6,
      }}
    >
      <Text style={{ ...type.footnote, color: colors.quietText, lineHeight: 18 }}>
        {t('avatarReference.purpose')}
      </Text>
      <Text style={{ ...type.footnote, color: colors.quietText, lineHeight: 18 }}>
        {t('avatarReference.thirdParty')}
      </Text>
    </View>
  );
}

function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  // Date-only, and never a time: §4.4 asks for 当前版本, and a timestamp to the
  // second reads as provenance detail nobody asked for.
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

const PROBLEM_KEY: Record<NonNullable<AvatarReferenceState['problem']>, I18nKey> = {
  read_failed: 'avatarReference.error.read',
  action_failed: 'avatarReference.error.action',
  unavailable: 'avatarReference.error.unavailable',
};

const OUTCOME_KEY: Record<'stopped' | 'deleted' | 'replacing', I18nKey> = {
  stopped: 'avatarReference.stop.done',
  deleted: 'avatarReference.delete.done',
  replacing: 'avatarReference.replace.started',
};

const CONFIRM_KEY: Record<'stop' | 'delete', I18nKey> = {
  stop: 'avatarReference.stop.confirm',
  delete: 'avatarReference.delete.confirm',
};

export function AvatarReferenceScreen({ navigation }: Props) {
  const { t } = useT();
  const [state, setState] = useState<AvatarReferenceState>(initialAvatarReferenceState);

  const read = useCallback(async () => {
    try {
      const profile = await getAvatarProfile();
      setState((current) => profileLoaded(current, profile));
    } catch (error) {
      setState((current) => profileReadFailed(current, error as HttpErrorLike));
    }
  }, []);

  // Re-read on every focus, not only on mount. The Profile tab is persistent, so
  // returning from the setup screen (or from anywhere that moved the profile)
  // must not leave a stale reference on screen — the same focus-refetch rule the
  // repo's own notes give for persistent tabs.
  useFocusEffect(
    useCallback(() => {
      if (!enableV3Avatar) return;
      void read();
    }, [read]),
  );

  const runControl = useCallback(async (control: AvatarReferenceControl) => {
    try {
      if (control === 'replace') {
        const preparation = await replaceAvatarVersion();
        setState((current) => replacementSettled(current, preparation));
        return;
      }
      // `stop` is 停止用于生成 and `delete` is 删除形象参考及派生结果 — the same
      // endpoint under the two values of the frozen `purge_derived` parameter.
      const deletion = await deleteAvatarProfile(control === 'delete');
      setState((current) => deletionSettled(current, deletion));
    } catch (error) {
      setState((current) => controlFailed(current, error as HttpErrorLike));
    }
  }, []);

  // The request is fired BESIDE the state update, never inside the updater. A
  // `setState` updater must be pure — React is free to call it more than once
  // for one dispatch (StrictMode does exactly that in development), and a
  // side effect in there would send two DELETEs for one tap. This app does not
  // mount `StrictMode` today, which is precisely why the shape has to be right
  // rather than incidentally safe.
  const onControl = useCallback(
    (control: AvatarReferenceControl) => {
      if (control === 'set_up_again') {
        // The frozen `disabled → preparing` path: a new photo and a new consent,
        // through the surface that already owns both (V3-015).
        setState(controlCancelled);
        navigation.navigate('AvatarPhotoSetup');
        return;
      }
      setState((current) => controlAsked(current, control));
      if (!AVATAR_REFERENCE_CONFIRMS.includes(control)) void runControl(control);
    },
    [navigation, runControl],
  );

  const onConfirm = useCallback(() => {
    const control = state.pending;
    if (control === null) return;
    setState(controlConfirmed);
    void runControl(control);
  }, [runControl, state.pending]);

  const retry = referenceRetryTarget(state);
  const onRetry = useCallback(() => {
    if (retry === 'read') {
      setState(initialAvatarReferenceState());
      void read();
      return;
    }
    if (retry) {
      setState(controlConfirmed);
      void runControl(retry);
    }
  }, [read, retry, runControl]);

  // The flag off means this screen is not part of the build's product surface at
  // all. It stays mounted (a navigator cannot conditionally hold a route without
  // making the row's tap a silent no-op) and says the feature is unavailable
  // rather than making a request that would answer 503.
  if (!enableV3Avatar) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
        <ScreenHeader title={t('avatarReference.title')} onBack={() => navigation.goBack()} />
        <View style={{ padding: spacing.screen }}>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>
            {t('avatarReference.error.unavailable')}
          </Text>
        </View>
      </View>
    );
  }

  const profile: AvatarProfile | null = state.profile;
  const controls = profile ? avatarReferenceControls(profile) : null;
  const enabled = controlsEnabled(state);
  // 当前版本 is the version's own creation date; 授权时间 below is the consent
  // record's. They are different facts and a replace moves only the first.
  const versionDate = shortDate(profile?.activeVersion?.createdAt ?? null);
  const consentDate = shortDate(profile?.consentedAt ?? null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.groupedBackground }}>
      <ScreenHeader title={t('avatarReference.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 48,
          paddingTop: 8,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <PurposeBlock t={t} />

        {state.step === 'loading' ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {profile ? (
          <>
            <Section title={t('avatarReference.section.state')}>
              <ValueRow
                labelKey="avatarReference.status"
                value={t(
                  `avatarReference.status.${referenceStatusKeySuffix(profile)}` as I18nKey,
                )}
              />
              {profile.consentVersion && consentDate ? (
                <ValueRow labelKey="avatarReference.consent" value={consentDate} last />
              ) : null}
            </Section>

            {/* 查看当前形象参考 + 当前版本 — the reference itself, or a plain
                sentence when there is none. An empty placeholder frame would
                imply something is still loading. */}
            <Section title={t('avatarReference.version')}>
              <View style={{ padding: 16, gap: 12 }}>
                {controls?.showsReference && profile.activeVersion?.canonicalFrontUrl ? (
                  <>
                    <ReferenceImage
                      uri={profile.activeVersion.canonicalFrontUrl}
                      label={t('avatarReference.referenceAlt')}
                    />
                    {versionDate ? (
                      <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>
                        {t('avatarReference.version.since', { date: versionDate })}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>
                    {t('avatarReference.noReference')}
                  </Text>
                )}
              </View>
            </Section>

            {state.step === 'confirming' && (state.pending === 'stop' || state.pending === 'delete') ? (
              <View
                style={{
                  borderRadius: radius.lg,
                  backgroundColor: colors.elevated,
                  padding: 16,
                  gap: 12,
                  ...shadow.soft,
                }}
                testID="avatarReference.confirm"
              >
                <Text style={{ ...type.footnote, color: colors.label, lineHeight: 19 }}>
                  {t(CONFIRM_KEY[state.pending])}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={onConfirm}
                    accessibilityRole="button"
                    testID="avatarReference.confirm.accept"
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flex: 1 })}
                  >
                    <View
                      style={{
                        minHeight: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: radius.md,
                        backgroundColor: colors.dangerBg,
                      }}
                    >
                      <Text style={{ ...type.headline, color: colors.danger }}>
                        {t('avatarReference.confirm')}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setState(controlCancelled)}
                    accessibilityRole="button"
                    testID="avatarReference.confirm.cancel"
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flex: 1 })}
                  >
                    <View
                      style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ ...type.headline, color: colors.accent }}>
                        {t('common.cancel')}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {controls ? (
              <Section title={t('avatarReference.section.controls')}>
                {controls.replace ? (
                  <ControlRow
                    labelKey={
                      controls.replace === 'consent_offered_photo'
                        ? 'avatarReference.replaceOffered'
                        : 'avatarReference.replace'
                    }
                    subKey="avatarReference.replace.sub"
                    onPress={() => onControl('replace')}
                    disabled={!enabled}
                    testID="avatarReference.control.replace"
                  />
                ) : null}
                {controls.setUpAgain ? (
                  <ControlRow
                    labelKey="avatarReference.setUpAgain"
                    subKey="avatarReference.setUpAgain.sub"
                    onPress={() => onControl('set_up_again')}
                    disabled={!enabled}
                    testID="avatarReference.control.setUpAgain"
                  />
                ) : null}
                {controls.stopGeneration ? (
                  <ControlRow
                    labelKey="avatarReference.stop"
                    subKey="avatarReference.stop.sub"
                    onPress={() => onControl('stop')}
                    disabled={!enabled}
                    danger
                    testID="avatarReference.control.stop"
                  />
                ) : null}
                {controls.deleteEverything ? (
                  <ControlRow
                    labelKey="avatarReference.delete"
                    subKey="avatarReference.delete.sub"
                    onPress={() => onControl('delete')}
                    disabled={!enabled}
                    danger
                    last
                    testID="avatarReference.control.delete"
                  />
                ) : null}
              </Section>
            ) : null}
          </>
        ) : null}

        {state.step === 'working' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}

        {state.outcome ? (
          <Text
            style={{ ...type.footnote, color: colors.quietText }}
            testID="avatarReference.outcome"
          >
            {t(OUTCOME_KEY[state.outcome])}
          </Text>
        ) : null}

        {state.problem ? (
          <View style={{ gap: 10 }} testID="avatarReference.problem">
            <Text style={{ ...type.callout, color: colors.label }}>
              {t(PROBLEM_KEY[state.problem])}
            </Text>
            {retry ? (
              <Pressable
                onPress={onRetry}
                accessibilityRole="button"
                testID="avatarReference.retry"
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <View style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ ...type.headline, color: colors.accent }}>
                    {t('common.retry')}
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * The current reference, rendered from a URL that is re-signed on every read.
 *
 * The URL is never lifted out of the profile response into anything that
 * outlives the render: it is a 30-minute signed URL (contract §3, V3_SPEC
 * §13.5), and a client that kept it would hold a link to a photo of a person
 * after the server stopped vouching for it. `getAvatarProfile` runs on every
 * focus, so what a render shows is always the URL the server just issued — which
 * is also why a deletion cannot leave a working link behind on this screen.
 */
function ReferenceImage({ uri, label }: { uri: string; label: string }) {
  return (
    <View
      style={{
        height: 220,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.fill,
      }}
    >
      <Image
        accessibilityLabel={label}
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        testID="avatarReference.image"
      />
    </View>
  );
}
