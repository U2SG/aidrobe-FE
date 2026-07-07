import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import { colors, radius, type } from '@/theme/design';
import type { OnboardingStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Permission'>;

// Onboarding permission rationale (design handoff aidrobe-v2-17): a single,
// non-threatening "why we ask" card — icon + title + benefit copy + allow / skip
// + footnote. Keeps the existing camera + photo-library request; permissions are
// requested only when the user taps allow.
export function PermissionScreen({ navigation }: Props) {
  const { t } = useT();
  const [requesting, setRequesting] = useState(false);

  const requestAll = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      // Continue regardless — permissions can be enabled later in settings.
      void cam;
      void lib;
      navigation.navigate('AddWardrobe');
    } finally {
      setRequesting(false);
    }
  };

  const skip = () => navigation.navigate('AddWardrobe');

  return (
    <ScreenContainer>
      <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 36 }}>
        {/* 3-segment onboarding progress — step 2 of 3 */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < 1 ? colors.label : colors.separator }}
            />
          ))}
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radius.pill,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SystemIcon name="camera" size={30} color={colors.accent} strokeWidth={1.8} />
          </View>
          <Text style={{ ...type.title1, color: colors.label, textAlign: 'center' }}>{t('permission.title')}</Text>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel, textAlign: 'center', lineHeight: 22 }}>
            {t('permission.body')}
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            onPress={requestAll}
            disabled={requesting}
            style={({ pressed }) => ({
              height: 54,
              borderRadius: radius.md,
              backgroundColor: colors.label,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: requesting || pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ ...type.headline, color: colors.inverse }}>{t('permission.cta')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={skip}
            disabled={requesting}
            style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>{t('permission.skip')}</Text>
          </Pressable>
          <Text style={{ ...type.footnote, color: colors.quaternaryLabel, textAlign: 'center' }}>
            {t('permission.footnote')}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
