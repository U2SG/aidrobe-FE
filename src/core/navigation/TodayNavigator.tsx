import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FeedbackSheetScreen } from '@/screens/today/FeedbackSheetScreen';
import { OutfitDetailScreen } from '@/screens/today/OutfitDetailScreen';
import { TodayScreen } from '@/screens/today/TodayScreen';
import type { TodayStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<TodayStackParamList>();

export function TodayNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#f7f3ec' },
        headerShadowVisible: false,
        headerTintColor: '#1c1c1a',
      }}
    >
      <Stack.Screen name="Today" component={TodayScreen} options={{ title: '今日' }} />
      <Stack.Screen
        name="OutfitDetail"
        component={OutfitDetailScreen}
        options={{ title: '搭配详情' }}
      />
      <Stack.Screen
        name="FeedbackSheet"
        component={FeedbackSheetScreen}
        options={{
          presentation: 'modal',
          title: '反馈',
        }}
      />
    </Stack.Navigator>
  );
}
