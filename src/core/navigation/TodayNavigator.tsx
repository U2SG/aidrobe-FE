import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FeedbackSheetScreen } from '@/screens/today/FeedbackSheetScreen';
import { OotdPosterScreen } from '@/screens/today/OotdPosterScreen';
import { OutfitDetailScreen } from '@/screens/today/OutfitDetailScreen';
import { TodayScreen } from '@/screens/today/TodayScreen';
import { colors } from '@/theme/design';
import type { TodayStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<TodayStackParamList>();

export function TodayNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.groupedBackground },
        headerShadowVisible: false,
        headerTintColor: colors.label,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Today" component={TodayScreen} options={{ title: '今日', headerShown: false }} />
      <Stack.Screen
        name="OutfitDetail"
        component={OutfitDetailScreen}
        options={{ title: '搭配详情', headerShown: false }}
      />
      <Stack.Screen
        name="FeedbackSheet"
        component={FeedbackSheetScreen}
        options={{
          presentation: 'modal',
          title: '反馈',
        }}
      />
      <Stack.Screen
        name="OotdPoster"
        component={OotdPosterScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
