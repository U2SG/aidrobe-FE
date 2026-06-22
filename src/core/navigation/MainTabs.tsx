import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { useLocaleSync } from '@/hooks/useLocaleSync';
import { useLocationSync } from '@/hooks/useLocationSync';
import { colors, type } from '@/theme/design';
import type { MainTabsParamList } from '@/types/navigation';
import { DiscoverNavigator } from './DiscoverNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { TodayNavigator } from './TodayNavigator';
import { WardrobeNavigator } from './WardrobeNavigator';

const Tabs = createBottomTabNavigator<MainTabsParamList>();

function TabIcon({
  name,
  active,
}: {
  name: 'home' | 'wardrobe' | 'compass' | 'person';
  active: boolean;
}) {
  return (
    <SystemIcon
      name={name}
      size={24}
      color={active ? colors.label : colors.tertiaryLabel}
      strokeWidth={active ? 2.2 : 1.8}
    />
  );
}

export function MainTabs() {
  useLocaleSync();
  useLocationSync();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.separatorSoft,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 26,
          paddingTop: 9,
        },
        tabBarActiveTintColor: colors.label,
        tabBarInactiveTintColor: colors.tertiaryLabel,
        tabBarLabelStyle: {
          ...type.caption,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="TodayTab"
        component={TodayNavigator}
        options={{
          title: '今日',
          tabBarIcon: ({ focused }) => <TabIcon name="home" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="WardrobeTab"
        component={WardrobeNavigator}
        options={{
          title: '衣橱',
          tabBarIcon: ({ focused }) => <TabIcon name="wardrobe" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="DiscoverTab"
        component={DiscoverNavigator}
        options={{
          title: '发现',
          tabBarIcon: ({ focused }) => <TabIcon name="compass" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <TabIcon name="person" active={focused} />,
        }}
      />
    </Tabs.Navigator>
  );
}
