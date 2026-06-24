import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { loginWithApple } from '@/api/auth';
import { APP_ENV } from '@/api/client';
import { GarmentSvg } from '@/components/ui/GarmentSvg';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useTrack } from '@/hooks/useTrack';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { useToastStore } from '@/store/toast';
import { colors, shadow } from '@/theme/design';
import type { OnboardingStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

const T = {
  bg: colors.groupedBackground,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  ink4: colors.quaternaryLabel,
  accent: colors.accent,
  card: colors.elevated,
  cardInner: colors.background,
  divider: colors.separator,
  shadowSm: shadow.soft,
};

const HERO_PIECES: {
  kind: 'blazer' | 'shirt' | 'trousers' | 'loafer';
  x: number;
  y: number;
  scale: number;
  rot: number;
}[] = [
  { kind: 'blazer', x: 30, y: 0, scale: 1.2, rot: -6 },
  { kind: 'shirt', x: 175, y: 30, scale: 1.0, rot: 4 },
  { kind: 'trousers', x: 90, y: 110, scale: 0.95, rot: 0 },
  { kind: 'loafer', x: 200, y: 175, scale: 0.7, rot: 8 },
];

const BENEFITS: {
  icon: 'clock' | 'sparkle' | 'wardrobe';
  title: string;
  body: string;
}[] = [
  { icon: 'clock', title: '省时间', body: '出门前直接看 3 套方案' },
  { icon: 'sparkle', title: '少纠结', body: '稳妥、省时、有风格各一套' },
  { icon: 'wardrobe', title: '能落地', body: '只用你找得到、能穿的衣服' },
];

export function WelcomeScreen({ navigation }: Props) {
  const [signingIn, setSigningIn] = useState(false);
  const setCompleted = useOnboardingStore((state) => state.setCompleted);
  const setTokens = useAuthStore((state) => state.setTokens);
  const showToast = useToastStore((state) => state.show);
  const track = useTrack();

  useEffect(() => {
    track('onboarding_started');
  }, [track]);

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
      await setTokens(tokens);
      track('apple_login_completed');
      navigation.navigate('Permission');
    } catch (error) {
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        showToast({ message: 'Apple 登录失败，请稍后重试', kind: 'error' });
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Progress dots */}
      <View
        style={{
          flexDirection: 'row',
          gap: 6,
          paddingHorizontal: 24,
          paddingTop: 60,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i === 1 ? T.ink : T.divider,
            }}
          />
        ))}
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 28,
          paddingTop: 32,
          paddingBottom: 36,
          justifyContent: 'space-between',
        }}
      >
        {/* Copy */}
        <View>
          <Text
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              letterSpacing: 1.2,
              color: T.accent,
              marginBottom: 16,
            }}
          >
            AIDROBE · 01
          </Text>
          <Text
            style={{
              fontSize: 36,
              fontWeight: '600',
              color: T.ink,
              lineHeight: 44,
              letterSpacing: -0.5,
            }}
          >
            不是更多衣服，{'\n'}而是每天{'\n'}更快穿对。
          </Text>
          <Text style={{ marginTop: 20, fontSize: 14, color: T.ink2, lineHeight: 23 }}>
            基于你真实拥有、现在能穿、找得到、来得及拿的衣服，给出 3 套穿搭决策。
          </Text>
          <View style={{ marginTop: 18, gap: 8 }}>
            {BENEFITS.map((item) => (
              <View
                key={item.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.72)',
                  borderWidth: 1,
                  borderColor: T.divider,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SystemIcon name={item.icon} size={17} color={T.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: T.ink }}>{item.title}</Text>
                  <Text style={{ marginTop: 2, fontSize: 11, color: T.ink3 }}>{item.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Hero illustration */}
        <View style={{ height: 220, position: 'relative', marginHorizontal: -20 }}>
          {HERO_PIECES.map((p, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                transform: [{ scale: p.scale }, { rotate: `${p.rot}deg` }],
              }}
            >
              <GarmentSvg kind={p.kind} size={100} />
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={{ gap: 10 }}>
          {APP_ENV === 'production' ? (
            <Pressable
              onPress={signInWithApple}
              disabled={signingIn}
              android_ripple={signingIn ? undefined : { color: 'rgba(255,255,255,0.14)' }}
              style={{
                height: 54,
                borderRadius: 14,
                backgroundColor: T.ink,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: signingIn ? 0.75 : 1,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inverse }}>
                使用 Apple 登录
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => navigation.navigate('Permission')}
              android_ripple={{ color: 'rgba(255,255,255,0.14)' }}
              style={{
                height: 54,
                borderRadius: 14,
                backgroundColor: T.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inverse }}>开始使用</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setCompleted(true)}
            style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 12, color: T.ink3 }}>了解隐私政策</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
