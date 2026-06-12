import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DepartureTimeScreen } from '@/screens/onboarding/DepartureTimeScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import type { SettingsStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#f7f3ec' },
        headerShadowVisible: false,
        headerTintColor: '#1c1c1a',
      }}
    >
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
      <Stack.Screen
        name="DepartureTime"
        component={DepartureTimeScreen}
        options={{ title: '出门时间' }}
      />
    </Stack.Navigator>
  );
}
