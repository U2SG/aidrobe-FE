import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FeedbackSheetScreen } from '@/screens/today/FeedbackSheetScreen';
import { OotdPosterScreen } from '@/screens/today/OotdPosterScreen';
import { OutfitCalendarScreen } from '@/screens/today/OutfitCalendarScreen';
import { OutfitDetailScreen } from '@/screens/today/OutfitDetailScreen';
import { OutfitPlanPickerScreen } from '@/screens/today/OutfitPlanPickerScreen';
import { TodayScreen } from '@/screens/today/TodayScreen';
import { TodayV2Screen } from '@/screens/today-v2/TodayV2Screen';
import { useT } from '@/hooks/useT';
import { enableMvpV2Ui } from '@/lib/featureFlags';
import { colors } from '@/theme/design';
import type { TodayStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<TodayStackParamList>();

// V2 swaps the Today screen for the redesigned single-outfit decision surface;
// the rest of the stack (detail, calendar, poster) is shared. Flag off → V1.
const TodayHome = enableMvpV2Ui ? TodayV2Screen : TodayScreen;

export function TodayNavigator() {
  const { t } = useT();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.groupedBackground },
        headerShadowVisible: false,
        headerTintColor: colors.label,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Today" component={TodayHome} options={{ title: '今日', headerShown: false }} />
      <Stack.Screen
        name="OutfitDetail"
        component={OutfitDetailScreen}
        options={{ title: '搭配详情', headerShown: false }}
      />
      <Stack.Screen
        name="OutfitCalendar"
        component={OutfitCalendarScreen}
        options={{ title: '穿搭日历', headerShown: false }}
      />
      <Stack.Screen
        name="FeedbackSheet"
        component={FeedbackSheetScreen}
        options={{
          presentation: 'modal',
          title: t('nav.today.feedback'),
        }}
      />
      <Stack.Screen
        name="OutfitPlanPicker"
        component={OutfitPlanPickerScreen}
        options={{
          presentation: 'modal',
          title: '计划穿搭',
          headerShown: false,
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
