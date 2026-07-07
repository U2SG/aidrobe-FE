import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { addInspiration } from '@/api/style';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { useToastStore } from '@/store/toast';
import { colors, radius, shadow, type as typeTokens } from '@/theme/design';
import type { OnboardingStackParamList } from '@/types/navigation';
import { pickAndUploadImage, uploadErrorMessage } from '@/utils/imageUpload';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'StyleMemory'>;

const TOTAL_STEPS = 6;
const CURRENT_STEP = 5;

const T = {
  bg: colors.groupedBackground,
  card: colors.elevated,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
  accent: colors.accent,
  inverse: colors.inverse,
  divider: colors.separator,
} as const;

// The three benefit chips mirroring the prototype.
// Icons chosen from the valid SystemIcon union:
//   - 理解色调 → 'wardrobe' (closest available wardrobe-context metaphor; no color/palette icon exists)
//   - 理解廓形 → 'suitcase' (body/silhouette shape context)
//   - 影响以后推荐 → 'sparkle' (AI / recommendation)
// Deviation from exact prototype icons is noted in the PR: no color/silhouette icon
// in the SystemIcon union.
const BENEFIT_CHIPS = [
  { titleKey: 'onboarding.styleMemory.benefit1.title', hintKey: 'onboarding.styleMemory.benefit1.hint', icon: 'wardrobe' as const },
  { titleKey: 'onboarding.styleMemory.benefit2.title', hintKey: 'onboarding.styleMemory.benefit2.hint', icon: 'suitcase' as const },
  { titleKey: 'onboarding.styleMemory.benefit3.title', hintKey: 'onboarding.styleMemory.benefit3.hint', icon: 'sparkle' as const },
];

// Placeholder for the large image-pick card shown before a photo is chosen.
function InspirationCardPlaceholder({ hint }: { hint: string }) {
  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 0.85,
        borderRadius: radius.xl,
        backgroundColor: colors.fill,
        borderWidth: 1,
        borderColor: colors.separator,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        overflow: 'hidden',
      }}
    >
      {/* Subtle background tone bars to suggest a fashion-photo context */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '55%',
          backgroundColor: colors.secondaryElevated,
        }}
      />
      <SystemIcon name="photo" size={32} color={colors.tertiaryLabel} strokeWidth={1.4} />
      <Text style={{ ...typeTokens.callout, color: T.ink2 }}>{hint}</Text>
    </View>
  );
}

export function StyleMemoryScreen({ navigation }: Props) {
  const { t } = useT();
  const showToast = useToastStore((state) => state.show);
  const [uploading, setUploading] = useState(false);

  const skip = () => {
    navigation.navigate('DepartureTime');
  };

  const pickInspiration = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const picked = await pickAndUploadImage('inspo');
      if (!picked) {
        // User cancelled — stay on screen.
        return;
      }
      await addInspiration({ imageUrl: picked.url });
      navigation.navigate('DepartureTime');
    } catch (e) {
      showToast({ message: uploadErrorMessage(e), kind: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* ── Header: back arrow + step indicator ── */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 56,
          paddingBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <SystemIcon name="chevronLeft" size={24} color={T.ink} strokeWidth={2.2} />
        </Pressable>

        <Text style={{ ...typeTokens.caption, color: T.ink3, letterSpacing: 0.4 }}>
          {t('onboarding.styleMemory.stepFraction')}
        </Text>
      </View>

      {/* ── Progress bar ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6, gap: 6 }}>
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
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title + subtitle ── */}
        <Text style={{ ...typeTokens.largeTitle, color: T.ink }}>
          {t('onboarding.styleMemory.title')}
        </Text>
        <Text
          style={{
            ...typeTokens.callout,
            color: T.ink2,
            marginTop: 12,
            lineHeight: 22,
          }}
        >
          {t('onboarding.styleMemory.subtitle')}
        </Text>

        {/* ── Large image pick card ── */}
        <Pressable
          onPress={pickInspiration}
          disabled={uploading}
          style={({ pressed }) => ({
            marginTop: 24,
            opacity: uploading || pressed ? 0.8 : 1,
          })}
        >
          <InspirationCardPlaceholder hint={t('onboarding.styleMemory.cardHint')} />
        </Pressable>

        {/* ── Three benefit chips ── */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginTop: 20,
          }}
        >
          {BENEFIT_CHIPS.map((chip) => (
            <View
              key={chip.titleKey}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 10,
                backgroundColor: T.card,
                borderRadius: radius.md,
                alignItems: 'center',
                gap: 6,
                ...shadow.soft,
              }}
            >
              <SystemIcon name={chip.icon} size={20} color={T.accent} strokeWidth={1.6} />
              <Text
                style={{
                  ...typeTokens.footnote,
                  fontWeight: '600',
                  color: T.ink,
                  textAlign: 'center',
                }}
              >
                {t(chip.titleKey as Parameters<typeof t>[0])}
              </Text>
              <Text
                style={{
                  ...typeTokens.caption,
                  color: T.ink3,
                  textAlign: 'center',
                  lineHeight: 16,
                }}
              >
                {t(chip.hintKey as Parameters<typeof t>[0])}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Primary CTA: pick photo ── */}
        <Pressable
          onPress={pickInspiration}
          disabled={uploading}
          style={({ pressed }) => ({
            height: 54,
            borderRadius: radius.md,
            backgroundColor: T.ink,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            marginTop: 28,
            opacity: uploading || pressed ? 0.72 : 1,
          })}
        >
          {uploading ? (
            <ActivityIndicator color={T.inverse} size="small" />
          ) : (
            <Text style={{ ...typeTokens.headline, color: T.inverse }}>
              {t('onboarding.styleMemory.cta.pick')}
            </Text>
          )}
        </Pressable>

        {/* ── Skip link ── */}
        <Pressable
          onPress={skip}
          disabled={uploading}
          style={({ pressed }) => ({
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
            opacity: uploading || pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ ...typeTokens.callout, color: T.ink2 }}>
            {t('onboarding.styleMemory.skip')}
          </Text>
        </Pressable>

        {/* ── Footnote ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 6,
            marginTop: 8,
          }}
        >
          <SystemIcon name="shield" size={13} color={T.ink3} strokeWidth={1.6} />
          <Text
            style={{
              ...typeTokens.caption,
              color: T.ink3,
              flex: 1,
              lineHeight: 18,
            }}
          >
            {t('onboarding.styleMemory.footnote')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
