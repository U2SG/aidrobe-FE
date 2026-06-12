import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { OnboardingStackParamList } from '@/types/navigation';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { PermissionScreen } from '@/screens/onboarding/PermissionScreen';
import { DepartureTimeScreen } from '@/screens/onboarding/DepartureTimeScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Permission" component={PermissionScreen} />
      <Stack.Screen name="DepartureTime" component={DepartureTimeScreen} />
    </Stack.Navigator>
  );
}
