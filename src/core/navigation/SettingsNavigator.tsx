import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { AvatarReferenceScreen } from '@/screens/avatar/AvatarReferenceScreen';
import { AvatarPhotoSetupScreen } from '@/screens/avatar/AvatarPhotoSetupScreen';
import { ProfileV2Screen } from '@/screens/profile-v2/ProfileV2Screen';
import { AskAidrobeScreen } from '@/screens/discover/AskAidrobeScreen';
import { ShouldIBuyScreen } from '@/screens/discover/ShouldIBuyScreen';
import { DataTrustScreen } from '@/screens/profile-v2/DataTrustScreen';
import { MemoryManagementScreen } from '@/screens/profile-v2/MemoryManagementScreen';
import { StyleInspirationsScreen } from '@/screens/discover/StyleInspirationsScreen';
import { AddInspirationScreen } from '@/screens/discover/AddInspirationScreen';
import { PackingListScreen } from '@/screens/discover/PackingListScreen';
import { PackingListDetailScreen } from '@/screens/discover/PackingListDetailScreen';
import { CreatePackingListScreen } from '@/screens/discover/CreatePackingListScreen';
import { SenseCheckScreen } from '@/screens/discover/SenseCheckScreen';
import { WardrobeReportScreen } from '@/screens/discover/WardrobeReportScreen';
import { useT } from '@/hooks/useT';
import { enableMvpV2Ui } from '@/lib/featureFlags';
import { colors } from '@/theme/design';
import type { SettingsStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

// Under V2 the Profile tab opens the trust surface (ProfileV2); the existing
// Settings screen becomes a reachable sub-page. Flag off keeps Settings as the
// entry, unchanged.
export function SettingsNavigator() {
  const { t } = useT();
  return (
    <Stack.Navigator
      initialRouteName={enableMvpV2Ui ? 'ProfileV2' : 'Settings'}
      screenOptions={{
        headerStyle: { backgroundColor: colors.groupedBackground },
        headerShadowVisible: false,
        headerTintColor: colors.label,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '设置', headerShown: false }} />
      {/* V3-021 — mounted OUTSIDE the V2 conditional, because the 形象参考
          controls have to be reachable from whichever Profile the build ships:
          `SettingsScreen` under the V1 default and `ProfileV2Screen` under
          `ENABLE_MVP_V2_UI`. Both entry rows are gated by `enableV3Avatar`, so a
          default build mounts two routes nothing can navigate to — which is the
          same shape as every other flag-off V3 surface. Own header, so this page
          always has a visible back control. */}
      <Stack.Screen
        name="AvatarReference"
        component={AvatarReferenceScreen}
        options={{ headerShown: false }}
      />
      {/* The re-enable path after 停止用于生成. Typed against the Discover stack
          (its first home) and cast per the repo's cross-stack convention; it only
          ever navigates back, so nothing it can reach is missing here. */}
      <Stack.Screen
        name="AvatarPhotoSetup"
        component={AvatarPhotoSetupScreen as never}
        options={{ headerShown: false }}
      />
      {enableMvpV2Ui ? (
        <>
          <Stack.Screen name="ProfileV2" component={ProfileV2Screen} options={{ headerShown: false }} />
          <Stack.Screen name="ShouldIBuy" component={ShouldIBuyScreen as never} options={{ headerShown: false }} />
          {/* `style_with_existing` hands off to an item-scoped Ask thread, so the
              card's destination must exist in this host too (codex review,
              FE#154). */}
          <Stack.Screen name="AskAidrobe" component={AskAidrobeScreen as never} />
          {/* Sub-pages keep a native header so there is always a visible back
              control (web / Android hardware back / no gesture). */}
          <Stack.Screen
            name="DataTrust"
            component={DataTrustScreen}
            options={{ headerShown: true, title: t('profile.row.dataTrust') }}
          />
          <Stack.Screen
            name="Memory"
            component={MemoryManagementScreen}
            options={{ headerShown: true, title: t('profile.row.memory') }}
          />
          {/* Reachable from ProfileV2 「风格灵感」. Screens are typed against the
              Discover stack but only navigate within {StyleInspirations,
              AddInspiration}, both mounted here — cast per the repo's cross-stack
              convention. */}
          <Stack.Screen
            name="StyleInspirations"
            component={StyleInspirationsScreen as never}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddInspiration"
            component={AddInspirationScreen as never}
            options={{ headerShown: false }}
          />
          {/* Tools section: persistent entry from Profile → same screens that
              mount in AskNavigator. Cast as never per the cross-stack convention. */}
          <Stack.Screen name="PackingList" component={PackingListScreen as never} options={{ headerShown: false }} />
          <Stack.Screen
            name="PackingListDetail"
            component={PackingListDetailScreen as never}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreatePackingList"
            component={CreatePackingListScreen as never}
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen name="SenseCheck" component={SenseCheckScreen as never} options={{ headerShown: false }} />
          <Stack.Screen
            name="WardrobeReport"
            component={WardrobeReportScreen as never}
            options={{ headerShown: false }}
          />
        </>
      ) : null}
    </Stack.Navigator>
  );
}
