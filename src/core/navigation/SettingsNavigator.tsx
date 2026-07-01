import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { ProfileV2Screen } from '@/screens/profile-v2/ProfileV2Screen';
import { DataTrustScreen } from '@/screens/profile-v2/DataTrustScreen';
import { MemoryManagementScreen } from '@/screens/profile-v2/MemoryManagementScreen';
import { useT } from '@/hooks/useT';
import { enableMvpV2Ui } from '@/lib/featureFlags';
import { colors } from '@/theme/design';
import type { SettingsStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

// Under V2 the Profile tab opens the trust surface (ProfileV2); the existing
// Settings screen becomes a reachable sub-page. Flag off keeps Settings as the
// entry, unchanged.
export function SettingsNavigator() {
  const { t } = useT();
  return (
    <Stack.Navigator
      initialRouteName={enableMvpV2Ui ? 'ProfileV2' : 'Settings'}
      screenOptions={{
        headerStyle: { backgroundColor: colors.groupedBackground },
        headerShadowVisible: false,
        headerTintColor: colors.label,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '设置', headerShown: false }} />
      {enableMvpV2Ui ? (
        <>
          <Stack.Screen name="ProfileV2" component={ProfileV2Screen} options={{ headerShown: false }} />
          {/* Sub-pages keep a native header so there is always a visible back
              control (web / Android hardware back / no gesture). */}
          <Stack.Screen
            name="DataTrust"
            component={DataTrustScreen}
            options={{ headerShown: true, title: t('profile.row.dataTrust') }}
          />
          <Stack.Screen
            name="Memory"
            component={MemoryManagementScreen}
            options={{ headerShown: true, title: t('profile.row.memory') }}
          />
        </>
      ) : null}
    </Stack.Navigator>
  );
}
