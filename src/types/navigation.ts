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
  // outfitId/outfitTitle identify the look the user came from. The poster API
  // is selfie-based and does NOT consume the outfit itself (API_GAP[FE#15]);
  // they're used for context wording + analytics so the param is not silently
  // dropped.
  OotdPoster: { outfitId?: string; outfitTitle?: string } | undefined;
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
  // V2: after the last import confirm, land on the First Outfit activation
  // gate instead of popping back to the list (gated by enableMvpV2Ui).
  FirstOutfit: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
};

// Ask promoted to a primary tab in V2 (redesign brief v0.9 §3.1). Params mirror
// the Discover-hosted `AskAidrobe` entry so the same screen mounts in both the
// V1 Discover stack and this V2 stack. `focusedItemId` scopes to one item
// (scope=item); `scope: 'today'` flows from Today; absent → global.
export type AskStackParamList = {
  AskAidrobe: { focusedItemId?: string; scope?: 'today' } | undefined;
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
  // `focusedItemId` scopes the Ask to one wardrobe item (scope=item). `scope`
  // lets other entrypoints (e.g. today) flow through; absent → global.
  AskAidrobe: { focusedItemId?: string; scope?: 'today' } | undefined;
};

export type MainTabsParamList = {
  TodayTab: NavigatorScreenParams<TodayStackParamList>;
  WardrobeTab: NavigatorScreenParams<WardrobeStackParamList>;
  DiscoverTab: NavigatorScreenParams<DiscoverStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// V2 primary tabs (redesign brief v0.9 §3.1): Discover is demoted out of the
// primary bar (its tools become contextual entrances later), Ask is promoted,
// and Profile replaces the Settings label. Gated by `enableMvpV2Ui`.
export type MainTabsV2ParamList = {
  TodayTab: NavigatorScreenParams<TodayStackParamList>;
  WardrobeTab: NavigatorScreenParams<WardrobeStackParamList>;
  AskTab: NavigatorScreenParams<AskStackParamList>;
  ProfileTab: NavigatorScreenParams<SettingsStackParamList>;
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
