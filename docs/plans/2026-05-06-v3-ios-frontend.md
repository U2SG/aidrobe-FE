# V3 iOS Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the Expo React Native iOS client for the completed Aidrobe V3 backend and the four prototype screens in `docs/design/prototype`.

**Architecture:** Keep the current Expo + React Navigation + TanStack Query structure, but upgrade the client from V1 page/API coverage to V3 feature coverage. Add a small V3 API adapter layer first, then rebuild the main tabs around Today, Wardrobe, Add, and Profile while preserving the existing upload/import and development auth flows.

**Tech Stack:** Expo 51, React Native 0.74, TypeScript, NativeWind, React Navigation, TanStack Query, Axios, Zustand, `expo-image-picker`, `expo-image-manipulator`, `react-native-svg`, optional `lucide-react-native` for icons.

---

## Source Inputs

- Backend repo: `D:\project\Python\aidrobe`
- Frontend repo: `D:\project\Python\aidrobe-frontend`
- Backend V3 implementation:
  - `D:\project\Python\aidrobe\app\presentation\api\v1\routers\style.py`
  - `D:\project\Python\aidrobe\app\presentation\api\v1\routers\insights.py`
  - `D:\project\Python\aidrobe\app\presentation\api\v1\routers\outfit_history.py`
  - `D:\project\Python\aidrobe\app\presentation\api\v1\routers\outfit_visual.py`
  - `D:\project\Python\aidrobe\app\presentation\api\v1\routers\fit.py`
  - `D:\project\Python\aidrobe\app\presentation\api\v1\schemas\recommendations.py`
  - `D:\project\Python\aidrobe\app\presentation\api\v1\schemas\wardrobe.py`
- Existing frontend foundation:
  - `D:\project\Python\aidrobe-frontend\src\api`
  - `D:\project\Python\aidrobe-frontend\src\core\navigation`
  - `D:\project\Python\aidrobe-frontend\src\screens`
  - `D:\project\Python\aidrobe-frontend\src\components`
- Prototype images:
  - `D:\project\Python\aidrobe-frontend\docs\design\prototype\ChatGPT Image 2026年5月6日 12_07_28 (1).png` 今日
  - `D:\project\Python\aidrobe-frontend\docs\design\prototype\ChatGPT Image 2026年5月6日 12_07_28 (2).png` 衣橱
  - `D:\project\Python\aidrobe-frontend\docs\design\prototype\ChatGPT Image 2026年5月6日 12_07_28 (3).png` 添加
  - `D:\project\Python\aidrobe-frontend\docs\design\prototype\ChatGPT Image 2026年5月6日 12_07_28 (4).png` 风格画像

## Product Scope

- Today tab: greeting/countdown, three recommendation modes, large outfit board, secondary outfit cards, wear action, V3 style context.
- Wardrobe tab: search/filter/category chips, weekly insights strip, two-column item grid, V3 extended item fields.
- Add tab: camera, album, link, share-style entry points; keep unsupported backend paths visibly disabled or route to image flow until backend path is verified.
- Profile tab: style profile summary, inspiration grid, add inspiration by link/image, recent learning result.
- Supporting V3 pages: wardrobe insights detail, outfit history/calendar, OOTD upload, fit feedback where it naturally appears.

## Known Risks

- Some existing TSX Chinese strings are mojibake. Treat visible copy as untrusted and replace all touched screen copy with clean UTF-8 Chinese.
- `GET /v1/insights/*` and `GET /v1/outfit-history*` return raw JSON models, while many V1 endpoints return `{ code, message, data }`. The current Axios interceptor already tolerates both, but tests must cover both response shapes. When `code !== 0`, display a localised toast and propagate the error through `useQuery`/`useMutation`'s `onError`; do not silently swallow non-zero codes.
- Backend recommendation item schemas currently expose item id/title/category but not full image URLs in `RecommendationItemResponse`. Use outfit board/image asset URLs when available; otherwise hydrate item images from wardrobe item detail or local placeholders. `outfitBoardUrl` is not present on `TodayRecommendationResponse`; it must be sourced from outfit-history or visual-assets endpoints when available.
- Prototype includes link/share import. Backend V1 Slim previously only guaranteed image import; implement UI affordances, but keep link/share guarded behind backend verification.
- `InsightsSummaryResponse` has no `wearable_count` field. The Wardrobe header subtitle must use only `total` from `WardrobeListResponse`. Do not invent a "today wearable" count.
- `departure_time` is stored in `UserSettings` and exposed via `GET /v1/user/settings`. The frontend must load it from that endpoint (not hardcode it) and allow editing via `PATCH /v1/user/settings`.

---

### Task 1: Baseline Static Verification

**Files:**
- Read: `D:\project\Python\aidrobe-frontend\package.json`
- Read: `D:\project\Python\aidrobe-frontend\src\types\api.ts`
- Read: `D:\project\Python\aidrobe-frontend\src\api\client.ts`
- Modify: none

**Step 1: Run TypeScript**

Run:

```powershell
pnpm typecheck
```

Expected: capture current errors. Do not fix unrelated errors yet unless they block later tasks.

**Step 2: Run ESLint**

Run:

```powershell
pnpm lint
```

Expected: capture current lint failures and note whether they are pre-existing.

**Step 2b: Run Prettier check**

Run:

```powershell
pnpm format --check
```

Expected: record any pre-existing formatting violations so they are not confused with new ones introduced in later tasks.

**Step 3: Commit checkpoint if clean**

Only if no files were changed:

```powershell
git status --short
```

Expected: no new frontend changes from verification.

---

### Task 2: Add V3 API Types and Endpoint Modules

**Files:**
- Modify: `D:\project\Python\aidrobe-frontend\src\types\api.ts`
- Modify: `D:\project\Python\aidrobe-frontend\src\api\recommendations.ts`
- Modify: `D:\project\Python\aidrobe-frontend\src\api\wardrobe.ts`
- Create: `D:\project\Python\aidrobe-frontend\src\api\style.ts`
- Create: `D:\project\Python\aidrobe-frontend\src\api\insights.ts`
- Create: `D:\project\Python\aidrobe-frontend\src\api\outfitHistory.ts`
- Create: `D:\project\Python\aidrobe-frontend\src\api\outfitVisual.ts`
- Create: `D:\project\Python\aidrobe-frontend\src\api\fit.ts`
- Create: `D:\project\Python\aidrobe-frontend\src\api\userSettings.ts`

> **File naming convention:** all API modules use camelCase (`outfitHistory.ts`, `outfitVisual.ts`). Do not mix with kebab-case.

**Step 1: Extend `api.ts` with V3 DTOs**

Add server/client types for:

```ts
// Maps to OutfitResponse.type from the backend
export type OutfitVariant = 'safe' | 'fast' | 'stylish';

export interface StyleContext {
  templateId: string;
  activeTags: string[];
  confidence: number;
}

export interface ServerStyleContext {
  template_id: string;
  active_tags?: string[];
  confidence?: number;
}

export interface StyleInspiration {
  id: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceType: string;
  learnStatus: string;
  createdAt: string;
}

export interface InsightsSummary {
  totalItems: number;
  activeRate: number;
  idleCount: number;
  idleThresholdDays: number;
  mostWornCategory: string | null;
  favoriteColor: string | null;
  // NOTE: no wearableCount — backend does not expose this field
}

export interface OutfitHistoryEntry {
  wearHistoryId: string;
  wornDate: string;
  outfit: {
    outfitId: string;
    outfitType: OutfitVariant | string;
    title: string;
    reasonText: string;
    // outfitBoardUrl is not on TodayRecommendationResponse; only available via outfit-visual-assets
    outfitBoardUrl?: string | null;
    items?: unknown[];
  } | null;
  feedbackType: string | null;
  reasonTags: string[];
  ootdImageUrl: string | null;
  selectedAt: string;
}

export interface UserSettings {
  departureTime: string | null; // "HH:MM:SS"
  pushEnabled: boolean | null;
  location: string | null;
}

export interface ServerUserSettings {
  departure_time: string | null;
  push_enabled: boolean | null;
  location: string | null;
}
```

Also extend `WardrobeItem` and `ServerWardrobeItem` with:

```ts
subCategory?: string | null;
colorSecondary?: string | null;
material?: string | null;
seasonTags?: string[] | null;
styleTags?: string[] | null;
formalityScore?: number | null;
timeCostLevel?: string | null;
purchasePrice?: number | null;
wearCount?: number;
fitIntent?: string | null;
fitStatus?: string | null;
comfortScore?: number | null;
```

**Step 2: Update mappers**

Update existing mappers to convert snake_case to camelCase:

```ts
styleContext: data.style_context
  ? {
      templateId: data.style_context.template_id,
      activeTags: data.style_context.active_tags ?? [],
      confidence: data.style_context.confidence ?? 0,
    }
  : null
```

For wardrobe items, preserve current fields and add V3 fields. Do not rename public client fields that existing screens already use.

**Step 3: Create API modules**

Implement thin wrappers:

```ts
export function listStyleInspirations(limit = 20, offset = 0) {
  return apiGet<ServerInspirationListResponse>('/v1/style/inspirations', { limit, offset });
}

export function addStyleInspiration(body: { imageUrl?: string; sourceUrl?: string }) {
  return apiPost<ServerInspirationResponse>('/v1/style/inspirations', {
    image_url: body.imageUrl,
    source_url: body.sourceUrl,
  });
}
```

Cover these endpoints:

- `POST /v1/style/inspirations` → `style.ts`
- `POST /v1/style/sources/batch` → `style.ts`
- `GET /v1/style/inspirations` → `style.ts`
- `DELETE /v1/style/inspirations/{id}` → `style.ts`
- `PATCH /v1/style/tags` → `style.ts`
- `GET /v1/insights/summary` → `insights.ts`
- `GET /v1/insights/top-items` → `insights.ts`
- `GET /v1/insights/idle-items` → `insights.ts`
- `GET /v1/insights/color-palette` → `insights.ts`
- `GET /v1/insights/style-trend` → `insights.ts`
- `GET /v1/insights/cost-per-wear` → `insights.ts`
- `GET /v1/outfit-history` → `outfitHistory.ts`
- `GET /v1/outfit-history/calendar?year={year}&month={month}` → `outfitHistory.ts`
- `GET /v1/outfit-history/{date}` → `outfitHistory.ts`
- `POST /v1/outfit-history/{wear_history_id}/ootd` → `outfitHistory.ts`
- `GET /v1/outfit-visual-assets/{asset_id}` → `outfitVisual.ts`
- `GET /v1/wardrobe-items/{item_id}/images` → `wardrobe.ts` (belongs with wardrobe, not outfitVisual)
- `PATCH /v1/wardrobe-items/{item_id}/fit` → `fit.ts`
- `POST /v1/fit-feedback` → `fit.ts`
- `GET /v1/user/settings` → `userSettings.ts`
- `PATCH /v1/user/settings` → `userSettings.ts`

**Step 4: Verify**

Run:

```powershell
pnpm typecheck
```

Expected: PASS or only documented pre-existing unrelated errors.

**Step 5: Commit**

```powershell
git add src/types/api.ts src/api
git commit -m "feat: add v3 api adapters"
```

---

### Task 3: Install Icon Dependency and Shared UI Primitives

**Files:**
- Modify: `D:\project\Python\aidrobe-frontend\package.json`
- Modify: `D:\project\Python\aidrobe-frontend\pnpm-lock.yaml`
- Create: `D:\project\Python\aidrobe-frontend\src\components\ui\IconButton.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\ui\SegmentedControl.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\ui\SearchBar.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\ui\MetricPill.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\ui\PrototypeShell.tsx`

**Step 1: Add icons**

Run:

```powershell
pnpm add lucide-react-native
```

Expected: package and lockfile update. `react-native-svg` is already installed.

**Step 2: Build primitives**

Implement reusable components with stable dimensions:

- `IconButton`: 44x44, circular or subtle rounded square, `accessibilityRole="button"`.
- `SegmentedControl`: equal-width modes for Today's `最稳妥 / 最省时 / 更有风格`.
- `SearchBar`: non-jumping 48px search field with optional filter button.
- `MetricPill`: small icon + label/value chip.
- `PrototypeShell`: safe-area-aware screen wrapper. Background color: `#F5F0E8` (cream, sampled from prototype). Add this as a NativeWind token `bg-cream` in `tailwind.config.js` so all screens share the same value. Horizontal padding: 16px, top padding: 8px.

**Step 3: Replace any touched mojibake copy**

When editing existing screens, replace visible garbled strings with clean UTF-8 Chinese. Do not sweep untouched files in this task.

**Step 4: Verify**

Run:

```powershell
pnpm typecheck
pnpm lint
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add package.json pnpm-lock.yaml src/components/ui
git commit -m "feat: add v3 ui primitives"
```

---

### Task 4: Rework Main Tab Navigation to Match Prototype

**Files:**
- Modify: `D:\project\Python\aidrobe-frontend\src\types\navigation.ts`
- Modify: `D:\project\Python\aidrobe-frontend\src\core\navigation\MainTabs.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\core\navigation\ProfileNavigator.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\core\navigation\WardrobeNavigator.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\core\navigation\SettingsNavigator.tsx`

**Step 1: Add Profile stack types**

Add:

```ts
export type ProfileStackParamList = {
  StyleProfile: undefined;
  AddStyleInspiration: undefined;
  Insights: undefined;
  OutfitHistory: undefined;
  Settings: undefined;
  DepartureTime: undefined;
};
```

Update `MainTabsParamList` to include:

```ts
AddTab: undefined;
ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
```

Keep `SettingsStackParamList` only if existing code still imports it during migration; remove it once no screen imports it. Also add the root modal route:

```ts
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  AddItemModal: undefined;
};
```

**Step 2: Build four-tab shell plus central Add**

Use `TodayTab`, `WardrobeTab`, `AddTab`, `ProfileTab`. The `AddTab` must **not** intercept tab press and push into another Tab's stack — that breaks Android back behavior and React Navigation's internal state. Instead:

- Register a minimal placeholder screen for `AddTab` that renders `null`.
- In `MainTabs`, use the `tabPress` listener on the Add tab to immediately call `navigation.navigate('AddItemModal')` and `e.preventDefault()`.
- Register `AddItemScreen` as a **modal stack** at the root navigator level (outside the Tab navigator), so it can be dismissed back to whichever tab was active.

Expected tab labels:

- 今日
- 衣橱
- 添加
- 我的

**Step 3: Use icons**

Use `Home`, `PanelTop`, `Plus`, `User`, `Bell` as appropriate. Keep icon labels accessible.

**Step 4: Verify navigation types**

Run:

```powershell
pnpm typecheck
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/types/navigation.ts src/core/navigation
git commit -m "feat: align tabs with v3 prototype"
```

---

### Task 5: Implement Today Prototype and Outfit Board

**Files:**
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\today\TodayScreen.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\today\OutfitDetailScreen.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\components\cards\OutfitCard.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\outfit\OutfitBoard.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\outfit\OutfitBoardRail.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\outfit\RecommendationModeCard.tsx`

**Step 1: Replace Today layout**

Implement prototype hierarchy:

- Header: `早上好，Mia`, countdown from `UserSettings.departureTime` loaded via `GET /v1/user/settings`. If `departureTime` is null (not yet set), hide the countdown row rather than showing a blank or broken timer. Notification icon in top-right.
- Section title: `今日穿搭`.
- Segmented modes: `最稳妥`, `最省时`, `更有风格`.
- Primary card: left rail with mode summaries, right outfit board, CTA `今天穿这套`.
- Secondary outfit cards below.

**Step 2: Wire V3 data**

Use:

```ts
const selectedOutfit =
  query.data?.outfits.find((item) => item.variant === selectedMode) ?? query.data?.outfits[0];
```

Map backend `OutfitVariant` values (defined in Task 2) to display labels:

- `safe` → `最稳妥`
- `fast` → `最省时`
- `stylish` → `更有风格`

If `styleContext` exists, show short text such as `延续你的黑白灰通勤偏好`.

**Step 3: Build `OutfitBoard` fallback strategy**

Render in order:

1. `outfitBoardUrl` if available in future detail/history data.
2. Item `thumbUrl`/hydrated wardrobe image URLs.
3. Existing local showcase assets from `src\data\wardrobeShowcase.ts`.

Use fixed aspect ratio and `resizeMode="contain"` to avoid layout jumps.

**Step 4: Preserve actions**

Keep:

- `markOutfitWorn(outfitId)`
- `sendOutfitFeedback`
- Navigation to `OutfitDetail`
- Pull-to-refresh

**Step 5: Verify states**

Manually test these states by temporarily forcing query data:

- ready with 3 outfits
- ready with 1 outfit
- insufficient_items
- error
- loading with local showcase fallback

**Step 6: Run checks**

```powershell
pnpm typecheck
pnpm lint
```

Expected: PASS.

**Step 7: Commit**

```powershell
git add src/screens/today src/components/outfit src/components/cards/OutfitCard.tsx
git commit -m "feat: implement v3 today outfit board"
```

---

### Task 6: Implement Wardrobe Prototype and Insights Strip

**Files:**
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\wardrobe\WardrobeListScreen.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\wardrobe\ItemDetailScreen.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\components\cards\WardrobeItemCard.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\wardrobe\WardrobeInsightsStrip.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\screens\profile\InsightsScreen.tsx`

**Step 1: Rebuild list header**

Match prototype:

- Title `我的衣橱`
- Subtitle `已收纳 {total} 件` — use `total` from `WardrobeListResponse`. Do NOT add a "今日可穿" count; `InsightsSummaryResponse` has no `wearable_count` field.
- Search input
- Filter icon button
- Category chips: `全部`, `上衣`, `下装`, `外套`, `鞋`, `可穿`

**Step 2: Add insights strip**

Use `getInsightsSummary()` and optional `getColorPalette()` to display:

- `本周穿搭洞察`
- `黑白灰使用较多`
- `衬衫最常穿`
- `周三穿搭最多`

If endpoint returns insufficient data, show `继续记录穿搭后生成洞察`.

**Step 3: Render backend items first**

Use backend `query.data.items`. Only use showcase assets when backend returns empty and app is in development. Do not hide real empty state in production.

**Step 4: Update item detail**

Show V3 fields:

- sub category
- material
- season tags
- style tags
- formality score
- time cost level
- wear count
- purchase price
- fit status/comfort score

Support PATCH for editable fields already exposed by backend.

**Step 5: Verify**

```powershell
pnpm typecheck
pnpm lint
```

Expected: PASS.

**Step 6: Commit**

```powershell
git add src/screens/wardrobe src/components/wardrobe/WardrobeInsightsStrip.tsx src/components/cards/WardrobeItemCard.tsx src/screens/profile/InsightsScreen.tsx
git commit -m "feat: implement v3 wardrobe view"
```

---

### Task 7: Implement Add Item Prototype

**Files:**
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\wardrobe\AddItemScreen.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\wardrobe\ImportConfirmScreen.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\wardrobe\ImportFailureScreen.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\api\importTasks.ts`
- Modify: `D:\project\Python\aidrobe-frontend\src\store\importDraft.ts`

**Step 1: Rebuild add screen**

Match prototype cards:

- `拍照添加`
- `从相册导入`
- `粘贴商品链接`
- `从其他 App 分享`
- Tips row: `单件拍摄更准`, `尽量纯色背景`, `光线充足更好`
- Smart mode segmented control: `快速入库`, `精细识别`

**Step 2: Preserve working image path**

Camera/album path stays:

```text
pick/take image -> compress -> presign -> PUT -> create import task -> poll -> confirm
```

**Step 3: Guard link/share path**

Before enabling real link/share import, verify backend accepts:

```ts
input_type: 'url'
source_type: 'link'
source_url: string
```

If not verified, show a toast: `链接导入即将开放，当前请先用拍照或相册添加`.

**Step 4: Extend confirm screen fields**

Keep required fields prominent:

- title
- category
- color_main

Add collapsed advanced fields:

- sub_category
- material
- season_tags
- style_tags
- formality_score
- time_cost_level
- size_label
- fit_status

**Step 5: Verify**

Use a real small JPEG and local backend:

```powershell
pnpm typecheck
pnpm lint
```

Manual expected result: image import reaches `ImportConfirm`, save creates a wardrobe item, wardrobe query invalidates.

**Step 6: Commit**

```powershell
git add src/screens/wardrobe/AddItemScreen.tsx src/screens/wardrobe/ImportConfirmScreen.tsx src/screens/wardrobe/ImportFailureScreen.tsx src/api/importTasks.ts src/store/importDraft.ts
git commit -m "feat: implement v3 add item flow"
```

---

### Task 8: Implement Profile / Style Portrait Prototype

**Files:**
- Create: `D:\project\Python\aidrobe-frontend\src\screens\profile\StyleProfileScreen.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\screens\profile\AddStyleInspirationScreen.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\profile\StylePreferenceCard.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\profile\InspirationGrid.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\core\navigation\ProfileNavigator.tsx`

**Step 1: Build style profile screen**

Match prototype:

- Title `风格画像`
- Subtitle `系统正在学习你的偏好`
- Card `你的风格偏好`
- Chips: `极简通勤`, `黑白灰`, `干净利落`, `低饱和`
- Inspiration grid 2 columns, 6 slots.
- Add tile `添加灵感`.
- Rows: `粘贴链接学习`, `上传截图或杂志`, `最近学习结果`.

**Step 2: Wire style inspirations**

Use:

- `GET /v1/style/inspirations`
- `POST /v1/style/inspirations`
- `POST /v1/style/sources/batch`
- `DELETE /v1/style/inspirations/{id}`
- `PATCH /v1/style/tags`

**Step 3: Add image inspiration upload**

Reuse existing upload flow:

```text
pick image -> presign -> PUT -> POST /v1/style/inspirations { image_url }
```

For URL inspiration:

```text
input URL -> POST /v1/style/inspirations { source_url }
```

**Step 4: Verify**

Manual expected result:

- Profile screen loads with empty inspirations.
- Adding URL creates a source with learn status.
- Adding image creates a source.
- Deleting a source removes it from the grid.

Run:

```powershell
pnpm typecheck
pnpm lint
```

Expected: PASS.

**Step 5: Implement DepartureTime settings screen**

Add `src/screens/profile/DepartureTimeScreen.tsx`:

- Simple time picker (use `@react-native-community/datetimepicker` which is already bundled in Expo, or a plain text input for `HH:MM`).
- On confirm: `PATCH /v1/user/settings { departure_time: "HH:MM:SS" }` via `userSettings.ts`.
- Invalidate the `userSettings` query so `TodayScreen` picks up the change immediately.
- Route is already declared in `ProfileStackParamList.DepartureTime`.

**Step 6: Verify**

Run:

```powershell
pnpm typecheck
pnpm lint
```

Expected: PASS.

**Step 7: Commit**

```powershell
git add src/screens/profile src/components/profile src/core/navigation/ProfileNavigator.tsx
git commit -m "feat: implement style profile screen"
```

---

### Task 9: Add Outfit History, Calendar, and OOTD Upload

**Files:**
- Create: `D:\project\Python\aidrobe-frontend\src\screens\profile\OutfitHistoryScreen.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\screens\profile\OutfitHistoryDetailScreen.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\history\CalendarStrip.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\history\OutfitHistoryCard.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\types\navigation.ts`
- Modify: `D:\project\Python\aidrobe-frontend\src\core\navigation\ProfileNavigator.tsx`

**Step 1: Add navigation routes**

Extend `ProfileStackParamList`:

```ts
OutfitHistory: undefined;
OutfitHistoryDetail: { date: string };
```

**Step 2: Implement list**

Use:

- `GET /v1/outfit-history?page=1&page_size=20`
- `GET /v1/outfit-history/calendar?year={year}&month={month}` — `year` is a 4-digit number, `month` is 1–12. `CalendarStrip` must support previous/next month navigation; changing month re-fetches with the new `year`/`month` values as TanStack Query key parameters.

Display date, outfit title, feedback, and OOTD thumbnail if present.

**Step 3: Implement OOTD upload**

Use existing presign image upload, then:

```ts
POST /v1/outfit-history/{wear_history_id}/ootd
{ ootd_image_url: fileUrl }
```

Invalidate outfit history queries after upload.

**Step 4: Verify**

Run:

```powershell
pnpm typecheck
pnpm lint
```

Manual expected result: after marking an outfit worn, it appears in history; OOTD upload updates the row.

**Step 5: Commit**

```powershell
git add src/screens/profile/OutfitHistoryScreen.tsx src/screens/profile/OutfitHistoryDetailScreen.tsx src/components/history src/types/navigation.ts src/core/navigation/ProfileNavigator.tsx
git commit -m "feat: add outfit history"
```

---

### Task 10: Add Fit Feedback and Fit Editing

**Files:**
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\today\FeedbackSheetScreen.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\today\OutfitDetailScreen.tsx`
- Modify: `D:\project\Python\aidrobe-frontend\src\screens\wardrobe\ItemDetailScreen.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\fit\FitFeedbackPanel.tsx`
- Create: `D:\project\Python\aidrobe-frontend\src\components\fit\FitEditForm.tsx`

**Step 1: Add item fit edit form**

Expose:

- size_label
- size_region
- fit_intent
- fit_status
- comfort_score

Call:

```ts
PATCH /v1/wardrobe-items/{item_id}/fit
```

**Step 2: Add post-wear fit feedback**

After user marks outfit worn or opens feedback, allow selecting:

- too_tight
- too_loose
- fits_well
- uncomfortable

Call:

```ts
POST /v1/fit-feedback
```

Include `item_id`, optional `outfit_id`, `feedback_type`, and `scene`.

**Step 3: Verify**

Run:

```powershell
pnpm typecheck
pnpm lint
```

Expected: PASS.

**Step 4: Commit**

```powershell
git add src/components/fit src/screens/today src/screens/wardrobe/ItemDetailScreen.tsx
git commit -m "feat: add fit feedback UI"
```

---

### Task 11: Clean Copy, Encoding, and Empty/Error States

**Files:**
- Modify: all touched files under `D:\project\Python\aidrobe-frontend\src\screens`
- Modify: all touched files under `D:\project\Python\aidrobe-frontend\src\components`

**Step 1: Replace mojibake**

Search with PowerShell for both the Unicode replacement character and common GBK-decoded-as-Latin2 sequences:

```powershell
Get-ChildItem -Path .\src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern '\x{FFFD}|鎴|琛|浠|锛|銆|涓|鍥|å|æ|ä|ç|è|é|ê' -Encoding UTF8
```

Fix each match by replacing the garbled string with the correct UTF-8 Chinese. Expected: zero results after cleanup in all touched files.

**Step 2: Validate state coverage**

For each main screen, confirm:

- loading
- success
- empty
- error
- mutation pending

Screens:

- Today
- Outfit detail
- Wardrobe list
- Item detail
- Add item
- Import confirm
- Profile
- Insights
- Outfit history

**Step 3: Run formatter**

```powershell
pnpm format
```

Expected: Prettier updates only frontend source files.

**Step 4: Run checks**

```powershell
pnpm typecheck
pnpm lint
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add src
git commit -m "chore: clean v3 frontend copy and states"
```

---

### Task 12: Backend Integration Smoke Test

**Files:**
- Modify: none unless defects are found
- Read: `D:\project\Python\aidrobe-frontend\.env.development.example`
- Read: `D:\project\Python\aidrobe\.env.example`

**Step 1: Start backend**

In backend repo:

```powershell
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Expected: backend listens on `http://127.0.0.1:8000`.

**Step 2: Verify frontend env**

In frontend repo:

```powershell
Get-Content .env.development
```

Expected:

```env
APP_ENV=development
API_BASE_URL=http://127.0.0.1:8000
DEV_USER_ID=00000000-0000-4000-8000-000000000001
```

**Step 3: Start Expo**

```powershell
pnpm start -- --host localhost
```

Expected: Metro starts and serves the app.

**Step 4: Manual smoke checklist**

- Launch app.
- Today loads or shows actionable insufficient items state.
- Add image item succeeds.
- Wardrobe item appears.
- Today recommendation can be refreshed.
- Mark outfit worn succeeds.
- Profile inspiration URL can be added.
- Insights page handles empty data.
- Outfit history shows the worn outfit.

**Step 5: Run final checks**

```powershell
pnpm typecheck
pnpm lint
```

Expected: PASS.

**Step 6: Commit fixes**

Only if smoke testing required code changes:

```powershell
git add src
git commit -m "fix: polish v3 integration"
```

---

## Final Acceptance Criteria

- The app's first-level navigation matches the prototype: 今日 / 衣橱 / 添加 / 我的.
- Today screen visually matches the V3 prototype and remains functional with backend recommendation APIs.
- Wardrobe screen uses real backend data, shows V3 insights and extended item fields.
- Add item screen keeps the proven image import path and clearly guards unverified link/share paths.
- Profile screen supports style inspiration sources and displays learned style tags.
- Outfit history, OOTD upload, wardrobe insights, and fit feedback are reachable from natural user flows.
- `pnpm typecheck` passes.
- `pnpm lint` passes.
- `pnpm format --check` passes (run `pnpm format` first to auto-fix, then verify with `--check`).
- No touched UI file contains visible mojibake (verified by the Step 1 search in Task 11).
- Wardrobe header shows only `已收纳 {total} 件`; no fabricated "today wearable" count.
- `departure_time` is loaded from `GET /v1/user/settings` and editable via the DepartureTime settings screen; Today countdown is hidden when the value is null.
- AddItem is presented as a root-level modal, not a nested Tab navigation push.

