import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AskAidrobeScreen } from '@/screens/discover/AskAidrobeScreen';
import type { AskStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<AskStackParamList>();

// Ask promoted to its own primary-tab stack in V2 (redesign brief v0.9 §3.1).
// Reuses the existing AskAidrobeScreen; the V1 Discover stack still hosts the
// same screen so the flag-off experience is unchanged.
export function AskNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AskAidrobe" component={AskAidrobeScreen} />
    </Stack.Navigator>
  );
}
