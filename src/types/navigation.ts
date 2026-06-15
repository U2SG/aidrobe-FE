import type { NavigatorScreenParams } from '@react-navigation/native';

// ---------------------------------------------------------------------------
// Onboarding stack
// ---------------------------------------------------------------------------

export type OnboardingStackParamList = {
  Welcome: undefined;
  Permission: undefined;
  DepartureTime: undefined;
};

// ---------------------------------------------------------------------------
// Tabs & inner stacks
// ---------------------------------------------------------------------------

export type TodayStackParamList = {
  Today: undefined;
  OutfitDetail: { outfitId: string };
  FeedbackSheet: { outfitId: string };
  OotdPoster: { outfitId?: string } | undefined;
};

export type WardrobeStackParamList = {
  WardrobeList: undefined;
  ItemDetail: { itemId: string };
  AddItem: undefined;
  ImportConfirm: { taskId: string };
  ImportFailure: {
    reason:
      | 'upload_failed'
      | 'unsupported_format'
      | 'too_large'
      | 'recognition_failed'
      | 'network_error';
  };
};

export type SettingsStackParamList = {
  Settings: undefined;
  DepartureTime: undefined;
};

export type MainTabsParamList = {
  TodayTab: NavigatorScreenParams<TodayStackParamList>;
  WardrobeTab: NavigatorScreenParams<WardrobeStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabsParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
