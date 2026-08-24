import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AskAidrobeScreen } from '@/screens/discover/AskAidrobeScreen';
import { SenseCheckScreen } from '@/screens/discover/SenseCheckScreen';
import { AvatarPhotoSetupScreen } from '@/screens/avatar/AvatarPhotoSetupScreen';
import { ShouldIBuyScreen } from '@/screens/discover/ShouldIBuyScreen';
import { PackingListScreen } from '@/screens/discover/PackingListScreen';
import { PackingListDetailScreen } from '@/screens/discover/PackingListDetailScreen';
import { CreatePackingListScreen } from '@/screens/discover/CreatePackingListScreen';
import { InsightsScreen } from '@/screens/discover/InsightsScreen';
import { WardrobeReportScreen } from '@/screens/discover/WardrobeReportScreen';
import type { AskStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<AskStackParamList>();

// Ask promoted to its own primary-tab stack in V2 (redesign brief v0.9 §3.1).
// Reuses the existing AskAidrobeScreen; the V1 Discover stack still hosts the
// same screen so the flag-off experience is unchanged.
// Contextual-entry targets (SenseCheck, PackingList, Insights, WardrobeReport)
// are typed against DiscoverStackParamList — cast as never per the repo
// cross-stack convention (see SettingsNavigator StyleInspirations).
export function AskNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AskAidrobe" component={AskAidrobeScreen} />
      <Stack.Screen name="SenseCheck" component={SenseCheckScreen as never} />
      <Stack.Screen name="ShouldIBuy" component={ShouldIBuyScreen as never} options={{ headerShown: false }} />
      {/* `ShouldIBuy` navigates here when a decision needs a visual and no usable
          reference exists; a host that registers the card must register its
          destinations too (codex review, FE#154). */}
      <Stack.Screen name="AvatarPhotoSetup" component={AvatarPhotoSetupScreen as never} options={{ headerShown: false }} />
      <Stack.Screen name="PackingList" component={PackingListScreen as never} />
      <Stack.Screen name="PackingListDetail" component={PackingListDetailScreen as never} />
      <Stack.Screen
        name="CreatePackingList"
        component={CreatePackingListScreen as never}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="Insights" component={InsightsScreen as never} />
      <Stack.Screen name="WardrobeReport" component={WardrobeReportScreen as never} />
    </Stack.Navigator>
  );
}
