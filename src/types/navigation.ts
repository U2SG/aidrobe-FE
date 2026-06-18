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
  OutfitCalendar: undefined;
  OutfitPlanPicker: { plannedDate: string };
  OotdPoster: { outfitId?: string } | undefined;
};

export type WardrobeStackParamList = {
  WardrobeList: undefined;
  ItemDetail: { itemId: string };
  AddItem: undefined;
  // queue/queueIndex set for multi-image batch import: confirm one task, then
  // advance to the next. Absent for a single import.
  ImportConfirm: { taskId: string; queue?: string[]; queueIndex?: number };
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

// V4 — Discover hub: wardrobe tools + seasonal insights.
export type DiscoverStackParamList = {
  DiscoverHub: undefined;
  Insights: undefined;
  WardrobeReport: { period?: string } | undefined;
  PackingList: undefined;
  PackingListDetail: { id: string };
  CreatePackingList: undefined;
  SenseCheck: undefined;
  StyleInspirations: undefined;
  AddInspiration: undefined;
  AskAidrobe: { focusedItemId?: string } | undefined;
};

export type MainTabsParamList = {
  TodayTab: NavigatorScreenParams<TodayStackParamList>;
  WardrobeTab: NavigatorScreenParams<WardrobeStackParamList>;
  DiscoverTab: NavigatorScreenParams<DiscoverStackParamList>;
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
