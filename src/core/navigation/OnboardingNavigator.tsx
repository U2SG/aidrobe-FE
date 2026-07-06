import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '@/types/navigation';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { PermissionScreen } from '@/screens/onboarding/PermissionScreen';
import { AddWardrobeScreen } from '@/screens/onboarding/AddWardrobeScreen';
import { StyleMemoryScreen } from '@/screens/onboarding/StyleMemoryScreen';
import { DepartureTimeScreen } from '@/screens/onboarding/DepartureTimeScreen';
import { ImportConfirmScreen } from '@/screens/wardrobe/ImportConfirmScreen';
import { ImportFailureScreen } from '@/screens/wardrobe/ImportFailureScreen';
import { FirstOutfitScreen } from '@/screens/onboarding-v2/FirstOutfitScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

// Full 6-step first-run flow (prototype v2):
//   Welcome(1) → Permission → AddWardrobe(2) → ImportConfirm(3) → FirstOutfit(4)
//   → StyleMemory(5) → DepartureTime(6, calls setCompleted).
// ImportConfirm / ImportFailure / FirstOutfit are the SAME components used in
// the wardrobe stack, re-hosted here and driven by `onboarding: true` so their
// "next" branches continue onboarding instead of the main app. They are typed
// against WardrobeStackParamList; cast per the repo's cross-stack convention
// (their params carry an identical optional `onboarding` flag in both lists).
export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Permission" component={PermissionScreen} />
      <Stack.Screen name="AddWardrobe" component={AddWardrobeScreen} />
      <Stack.Screen name="ImportConfirm" component={ImportConfirmScreen as never} />
      <Stack.Screen name="ImportFailure" component={ImportFailureScreen as never} />
      <Stack.Screen name="FirstOutfit" component={FirstOutfitScreen as never} />
      <Stack.Screen name="StyleMemory" component={StyleMemoryScreen} />
      <Stack.Screen name="DepartureTime" component={DepartureTimeScreen} />
    </Stack.Navigator>
  );
}
