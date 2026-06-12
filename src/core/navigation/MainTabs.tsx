import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import type { MainTabsParamList } from '@/types/navigation';
import { SettingsNavigator } from './SettingsNavigator';
import { TodayNavigator } from './TodayNavigator';
import { WardrobeNavigator } from './WardrobeNavigator';

const Tabs = createBottomTabNavigator<MainTabsParamList>();

const T = {
  bg: '#F5EFE6',
  ink: '#1A1714',
  ink3: '#807468',
  divider: '#EBE3D5',
};

function TabIcon({ name, active }: { name: 'home' | 'closet' | 'me'; active: boolean }) {
  const c = active ? T.ink : T.ink3;
  if (name === 'home') {
    return (
      <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: active ? 22 : 20, color: c }}>⌂</Text>
      </View>
    );
  }
  if (name === 'closet') {
    return (
      <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, color: c }}>🗂</Text>
      </View>
    );
  }
  return (
    <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, color: c }}>👤</Text>
    </View>
  );
}

export function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.bg,
          borderTopColor: T.divider,
          borderTopWidth: 1,
          height: 83,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarActiveTintColor: T.ink,
        tabBarInactiveTintColor: T.ink3,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
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
          tabBarIcon: ({ focused }) => <TabIcon name="closet" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <TabIcon name="me" active={focused} />,
        }}
      />
    </Tabs.Navigator>
  );
}
