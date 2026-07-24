import type { NavigatorScreenParams } from '@react-navigation/native';

import type { ImportFailureReason } from './api';

// ---------------------------------------------------------------------------
// Onboarding stack
// ---------------------------------------------------------------------------

export type OnboardingStackParamList = {
  Welcome: undefined;
  Permission: undefined;
  // Full 6-step onboarding (prototype v2). AddWardrobe/StyleMemory are
  // onboarding-native; ImportConfirm/ImportFailure/FirstOutfit are the same
  // components re-hosted from the wardrobe stack, driven by `onboarding: true`
  // so their "next" continues onboarding instead of the main app.
  AddWardrobe: undefined;
  ImportConfirm: { taskId: string; queue?: string[]; queueIndex?: number; onboarding?: boolean };
  ImportFailure: {
    reason: ImportFailureReason;
    onboarding?: boolean;
  };
  FirstOutfit: { onboarding?: boolean } | undefined;
  StyleMemory: undefined;
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
  // onboarding: true when this screen is re-hosted inside the onboarding stack,
  // so its "next" branches continue onboarding instead of the wardrobe flow.
  ImportConfirm: { taskId: string; queue?: string[]; queueIndex?: number; onboarding?: boolean };
  ImportFailure: {
    reason: ImportFailureReason;
    onboarding?: boolean;
  };
  // V2: after the last import confirm, land on the First Outfit activation
  // gate instead of popping back to the list (gated by enableMvpV2Ui).
  FirstOutfit: { onboarding?: boolean } | undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  // V2 Profile trust surface (brief §10). The existing Settings screen stays
  // reachable from ProfileV2 for language / departure / city / notifications.
  ProfileV2: undefined;
  DataTrust: undefined;
  Memory: undefined;
  // Style inspirations demoted from a primary tab in V2 (no Discover tab); it
  // stays reachable from the Profile trust surface. AddInspiration is its own
  // push target, so both mount here.
  StyleInspirations: undefined;
  AddInspiration: undefined;
  // Tools section: packing list / sense-check / wardrobe report reachable from
  // Profile as a persistent entry point (user-reported entry gap 2026-07-24).
  // Param shapes mirror AskStackParamList so the same screens mount in both stacks.
  PackingList: undefined;
  PackingListDetail: { id: string };
  CreatePackingList: { durationDays?: number } | undefined;
  SenseCheck: undefined;
  WardrobeReport: { period?: string } | undefined;
};

// Ask promoted to a primary tab in V2 (redesign brief v0.9 §3.1). Params mirror
// the Discover-hosted `AskAidrobe` entry so the same screen mounts in both the
// V1 Discover stack and this V2 stack. `focusedItemId` scopes to one item
// (scope=item); `scope: 'today'` flows from Today; absent → global.
export type AskStackParamList = {
  AskAidrobe: { focusedItemId?: string; scope?: 'today' } | undefined;
  SenseCheck: undefined;
  PackingList: undefined;
  PackingListDetail: { id: string };
  // `durationDays` prefills the trip length (Ask trip-intent handoff, BE#115).
  CreatePackingList: { durationDays?: number } | undefined;
  Insights: undefined;
  WardrobeReport: { period?: string } | undefined;
};

// V4 — Discover hub: wardrobe tools + seasonal insights.
export type DiscoverStackParamList = {
  DiscoverHub: undefined;
  Insights: undefined;
  WardrobeReport: { period?: string } | undefined;
  PackingList: undefined;
  PackingListDetail: { id: string };
  CreatePackingList: { durationDays?: number } | undefined;
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
