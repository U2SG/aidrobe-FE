import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { SystemIcon } from '@/components/ui/SystemIcon';
import { useLocaleSync } from '@/hooks/useLocaleSync';
import { useLocationSync } from '@/hooks/useLocationSync';
import { useT } from '@/hooks/useT';
import { colors, type } from '@/theme/design';
import type { MainTabsV2ParamList } from '@/types/navigation';
import { AskNavigator } from './AskNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { TodayNavigator } from './TodayNavigator';
import { WardrobeNavigator } from './WardrobeNavigator';

const Tabs = createBottomTabNavigator<MainTabsV2ParamList>();

function TabIcon({
  name,
  active,
}: {
  name: 'home' | 'wardrobe' | 'sparkle' | 'person';
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

// V2 primary navigation: Today / Wardrobe / Ask / Profile (redesign brief v0.9
// §3.1). No Discover primary tab; the Profile tab reuses the existing settings
// stack until the Phase 7 trust surface lands. Mounted by RootNavigator only
// when `enableMvpV2Ui` is on — the V1 MainTabs is otherwise unchanged.
export function MainTabsV2() {
  const { t } = useT();
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
          title: t('tabs.today'),
          tabBarIcon: ({ focused }) => <TabIcon name="home" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="WardrobeTab"
        component={WardrobeNavigator}
        options={{
          title: t('tabs.wardrobe'),
          tabBarIcon: ({ focused }) => <TabIcon name="wardrobe" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="AskTab"
        component={AskNavigator}
        options={{
          title: t('tabs.ask'),
          tabBarIcon: ({ focused }) => <TabIcon name="sparkle" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="ProfileTab"
        component={SettingsNavigator}
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => <TabIcon name="person" active={focused} />,
        }}
      />
    </Tabs.Navigator>
  );
}
