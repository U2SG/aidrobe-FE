import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CreatePackingListScreen } from '@/screens/discover/CreatePackingListScreen';
import { DiscoverHubScreen } from '@/screens/discover/DiscoverHubScreen';
import { InsightsScreen } from '@/screens/discover/InsightsScreen';
import { PackingListDetailScreen } from '@/screens/discover/PackingListDetailScreen';
import { PackingListScreen } from '@/screens/discover/PackingListScreen';
import { SenseCheckScreen } from '@/screens/discover/SenseCheckScreen';
import { WardrobeReportScreen } from '@/screens/discover/WardrobeReportScreen';
import { colors } from '@/theme/design';
import type { DiscoverStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export function DiscoverNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.groupedBackground },
        headerShadowVisible: false,
        headerTintColor: colors.label,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="DiscoverHub" component={DiscoverHubScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Insights" component={InsightsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="WardrobeReport"
        component={WardrobeReportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="PackingList" component={PackingListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="PackingListDetail"
        component={PackingListDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreatePackingList"
        component={CreatePackingListScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen name="SenseCheck" component={SenseCheckScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
