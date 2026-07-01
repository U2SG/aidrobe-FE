import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { enableMvpV2Ui } from '@/lib/featureFlags';
import { useOnboardingStore } from '@/store/onboarding';
import { useDevUserStore } from '@/store/devUser';
import { useAuthStore } from '@/store/auth';
import type { RootStackParamList } from '@/types/navigation';

import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabs } from './MainTabs';
import { MainTabsV2 } from './MainTabsV2';
import { BootSplash } from '@/components/layout/BootSplash';

// V2 opts into the redesigned four-tab IA (Today / Wardrobe / Ask / Profile);
// flag off keeps the existing MainTabs unchanged.
const MainComponent = enableMvpV2Ui ? MainTabsV2 : MainTabs;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);
  const onboardingCompleted = useOnboardingStore((s) => s.completed);

  const devUserHydrated = useDevUserStore((s) => s.hydrated);
  const hydrateDevUser = useDevUserStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateDevUser();
    void hydrateAuth();
  }, [hydrateDevUser, hydrateAuth]);

  if (!onboardingHydrated || !devUserHydrated || !authHydrated) {
    return <BootSplash />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {onboardingCompleted ? (
          <Stack.Screen name="Main" component={MainComponent} />
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
