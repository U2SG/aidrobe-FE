import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { inviteLogin, loginWithApple } from '@/api/auth';
import { APP_ENV } from '@/api/client';
import { OutfitBoard } from '@/components/outfit/OutfitBoard';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useT } from '@/hooks/useT';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type as typeTokens } from '@/theme/design';
import type { OnboardingStackParamList } from '@/types/navigation';
import type { GarmentPiece } from '@/components/outfit/garments';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

const PRIVACY_POLICY_URL = 'https://aidrobe.app/privacy';

// Bridge to design tokens — no local hex.
const T = {
  bg: colors.groupedBackground,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
  divider: colors.separator,
  inverse: colors.inverse,
  shadowSm: shadow.soft,
};

// Onboarding has 3 screens: Welcome → Permission → DepartureTime.
const TOTAL_STEPS = 3;
const CURRENT_STEP = 1;

// Hero flat-lay using real wardrobe cutout assets (no loafer PNG in assets;
// shoes-white-canvas used as substitute for the brown loafer in the prototype).
const HERO_PIECES: GarmentPiece[] = [
  { kind: 'shirt',    x: 28,  y: 18,  scale: 1.05, rotate: '-5deg' },
  { kind: 'sweater',  x: 165, y: 8,   scale: 0.98, rotate: '4deg'  },
  { kind: 'trousers', x: 88,  y: 110, scale: 0.95, rotate: '0deg'  },
  { kind: 'sneaker',  x: 195, y: 195, scale: 0.65, rotate: '6deg'  },
];

// True when we should show the invite-code flow instead of Apple Sign-In.
// Android production only — web is excluded because token persistence relies
// on expo-secure-store, which is unavailable on web (docs/web-dev-setup.md);
// a "successful" web login would fail at setTokens and dead-end the user.
const USE_INVITE_CODE = APP_ENV === 'production' && Platform.OS === 'android';

export function WelcomeScreen({ navigation }: Props) {
  const [signingIn, setSigningIn] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const setTokens = useAuthStore((state) => state.setTokens);
  const showToast = useToastStore((state) => state.show);
  const { t } = useT();
  const track = useTrack();

  useEffect(() => {
    track('onboarding_started');
  }, [track]);

  // Shared post-login steps (token persist + navigate to Permission).
  const afterLogin = async (tokens: Awaited<ReturnType<typeof loginWithApple>>) => {
    await setTokens(tokens);
    navigation.navigate('Permission');
  };

  const signInWithApple = async () => {
    setSigningIn(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      if (!credential.identityToken) {
        showToast({ message: 'Apple 登录没有返回身份令牌', kind: 'error' });
        return;
      }
      const tokens = await loginWithApple(credential.identityToken);
      track('apple_login_completed');
      await afterLogin(tokens);
    } catch (error) {
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        showToast({ message: 'Apple 登录失败，请稍后重试', kind: 'error' });
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithInviteCode = async () => {
    const code = inviteCode.trim();
    if (!code) return;
    setInviteError('');
    setSigningIn(true);
    try {
      const tokens = await inviteLogin(code);
      track('invite_login_completed');
      await afterLogin(tokens);
    } catch {
      // 401 (invalid/disabled code) or network error — show inline error.
      setInviteError(t('welcome.inviteCode.error'));
    } finally {
      setSigningIn(false);
    }
  };

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      showToast({ message: t('onboarding.privacyPolicyOpenFailed'), kind: 'error' });
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ flexGrow: 1 }}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Progress bar ── */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 60,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 2,
                backgroundColor: i < CURRENT_STEP ? T.ink : T.divider,
              }}
            />
          ))}
        </View>
        <Text
          style={{
            ...typeTokens.caption,
            color: T.ink3,
            letterSpacing: 0.4,
          }}
        >
          {String(CURRENT_STEP).padStart(2, '0')}
        </Text>
      </View>

      {/* ── Main content ── */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: 36,
          justifyContent: 'space-between',
        }}
      >
        {/* Title + subtitle */}
        <View>
          <Text
            style={{
              ...typeTokens.largeTitle,
              color: T.ink,
            }}
          >
            {t('welcome.title')}
          </Text>
          <Text
            style={{
              ...typeTokens.callout,
              color: T.ink2,
              marginTop: 14,
              lineHeight: 22,
            }}
          >
            {t('welcome.subtitle')}
          </Text>
        </View>

        {/* Hero outfit board */}
        <View style={{ height: 280, marginHorizontal: -4, marginTop: 28, marginBottom: 8 }}>
          <OutfitBoard pieces={HERO_PIECES} />
        </View>

        {/* Sparkle hint row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            marginBottom: 28,
          }}
        >
          <SystemIcon name="sparkle" size={15} color={T.accent} />
          <Text style={{ ...typeTokens.footnote, color: T.ink3, flex: 1 }}>
            {t('welcome.sparkleHint')}
          </Text>
        </View>

        {/* CTAs */}
        <View style={{ gap: 4 }}>
          {USE_INVITE_CODE ? (
            /* ── Invite-code flow (non-iOS production) ── */
            <>
              {/* Invite code input */}
              <View>
                <TextInput
                  value={inviteCode}
                  onChangeText={(text) => {
                    setInviteCode(text);
                    if (inviteError) setInviteError('');
                  }}
                  placeholder={t('welcome.inviteCode.placeholder')}
                  placeholderTextColor={T.ink3}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!signingIn}
                  style={{
                    height: 54,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: inviteError ? colors.danger : T.divider,
                    paddingHorizontal: 16,
                    // Locked at 16 to prevent iOS auto-zoom on focus.
                    fontSize: 16,
                    color: T.ink,
                    backgroundColor: T.bg,
                  }}
                />
                {inviteError ? (
                  <Text
                    style={{
                      ...typeTokens.caption,
                      color: colors.danger,
                      marginTop: 6,
                      marginLeft: 4,
                    }}
                  >
                    {inviteError}
                  </Text>
                ) : null}
              </View>

              {/* Primary: "使用邀请码登录" */}
              <Pressable
                onPress={signInWithInviteCode}
                disabled={signingIn || inviteCode.trim().length === 0}
                android_ripple={
                  signingIn || inviteCode.trim().length === 0
                    ? undefined
                    : { color: 'rgba(255,255,255,0.14)' }
                }
                style={{
                  height: 54,
                  borderRadius: radius.md,
                  backgroundColor: T.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: signingIn || inviteCode.trim().length === 0 ? 0.5 : 1,
                  marginTop: 4,
                }}
              >
                <Text style={{ ...typeTokens.headline, color: T.inverse }}>
                  {t('welcome.inviteCode.cta')}
                </Text>
              </Pressable>
            </>
          ) : APP_ENV === 'production' ? (
            /* ── Apple Sign-In (iOS production) ── */
            <Pressable
              onPress={signInWithApple}
              disabled={signingIn}
              android_ripple={signingIn ? undefined : { color: 'rgba(255,255,255,0.14)' }}
              style={{
                height: 54,
                borderRadius: radius.md,
                backgroundColor: T.ink,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: signingIn ? 0.75 : 1,
              }}
            >
              <Text style={{ ...typeTokens.headline, color: T.inverse }}>
                {t('welcome.cta')}
              </Text>
            </Pressable>
          ) : (
            /* ── Dev skip button ── */
            <Pressable
              onPress={() => navigation.navigate('Permission')}
              android_ripple={{ color: 'rgba(255,255,255,0.14)' }}
              style={{
                height: 54,
                borderRadius: radius.md,
                backgroundColor: T.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...typeTokens.headline, color: T.inverse }}>
                {t('welcome.cta')}
              </Text>
            </Pressable>
          )}

          {/* Secondary: "登录已有账号" — hidden on non-iOS production (invite flow covers it) */}
          {!USE_INVITE_CODE && (
            <Pressable
              onPress={signInWithApple}
              disabled={signingIn}
              style={{
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...typeTokens.callout, color: T.ink2 }}>
                {t('welcome.loginExisting')}
              </Text>
            </Pressable>
          )}

          {/* Privacy link */}
          <Pressable
            onPress={openPrivacyPolicy}
            style={{
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ ...typeTokens.caption, color: T.ink3 }}>
              {t('onboarding.privacyPolicy')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
