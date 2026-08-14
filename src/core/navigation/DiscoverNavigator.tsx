import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AvatarPhotoSetupScreen } from '@/screens/avatar/AvatarPhotoSetupScreen';
import { CreatePackingListScreen } from '@/screens/discover/CreatePackingListScreen';
import { DiscoverHubScreen } from '@/screens/discover/DiscoverHubScreen';
import { InsightsScreen } from '@/screens/discover/InsightsScreen';
import { PackingListDetailScreen } from '@/screens/discover/PackingListDetailScreen';
import { PackingListScreen } from '@/screens/discover/PackingListScreen';
import { AddInspirationScreen } from '@/screens/discover/AddInspirationScreen';
import { AskAidrobeScreen } from '@/screens/discover/AskAidrobeScreen';
import { SenseCheckScreen } from '@/screens/discover/SenseCheckScreen';
import { ShouldIBuyScreen } from '@/screens/discover/ShouldIBuyScreen';
import { StyleInspirationsScreen } from '@/screens/discover/StyleInspirationsScreen';
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
      {/* V3-009 — no new tab and no new navigator: one more screen on the
          existing Discover stack, entered from the existing tool card. */}
      <Stack.Screen name="ShouldIBuy" component={ShouldIBuyScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="StyleInspirations"
        component={StyleInspirationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddInspiration"
        component={AddInspirationScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen name="AskAidrobe" component={AskAidrobeScreen} options={{ headerShown: false }} />
      {/* V3-015 — the on-demand photo setup. Registered here rather than behind
          the flag so the flag stays a property of the ENTRY (which self-hides);
          the screen itself renders its unavailable state if it is ever reached
          with the flag off. */}
      <Stack.Screen
        name="AvatarPhotoSetup"
        component={AvatarPhotoSetupScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
