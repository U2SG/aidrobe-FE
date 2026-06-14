import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DepartureTimeScreen } from '@/screens/onboarding/DepartureTimeScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { colors } from '@/theme/design';
import type { SettingsStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.groupedBackground },
        headerShadowVisible: false,
        headerTintColor: colors.label,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '设置', headerShown: false }} />
      <Stack.Screen
        name="DepartureTime"
        component={DepartureTimeScreen}
        options={{ title: '出门时间' }}
      />
    </Stack.Navigator>
  );
}
