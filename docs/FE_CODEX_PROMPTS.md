# Aidrobe FE Codex Prompt 手册

> 用法：每次只把一个任务块复制给 Codex。不要一次性把全部任务交给 Codex。  
> 推荐顺序：从基础 UI/UX 与状态系统开始，再做 i18n、Ask、Import、Today 分享。

---

## FE 总约束，所有任务都要带上

```text
Repo: U2SG/aidrobe-FE

General constraints:
- Keep changes scoped to the linked GitHub issue.
- Do not rewrite unrelated screens.
- Preserve existing navigation and API behavior unless the issue explicitly requires a change.
- Prefer reusable components over inline Pressable/Text styles.
- If backend support is missing, do not fake a permanent solution; mark it with API_GAP[issue-or-untracked].
- Run `npm run typecheck` and `npm run lint`.
- If a command fails because of pre-existing issues or environment limits, report the exact failure.
- Keep UI accessible: avoid low contrast text, support disabled/loading/error/retry states.
- Do not introduce new heavy dependencies unless clearly justified.
```

---

# FE-01｜Button System 与按钮对比度

Related issue: U2SG/aidrobe-FE#20

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#20 Button System and fix low-contrast button text.

Goal:
Build a unified Button component and stop using white text on beige/light backgrounds.

Context:
The theme uses many light beige backgrounds:
- background #FAF7F0
- groupedBackground #F1ECE2
- secondaryElevated #F5EFE6
- fill #EEE6DA
- accentSoft #F4E8D1

Existing components:
- src/components/forms/PrimaryButton.tsx
- src/components/forms/SecondaryButton.tsx
- src/theme/design.ts

Scope:
1. Add or upgrade a unified Button component.
   Suggested path:
   - src/components/ui/Button.tsx
   or upgrade forms buttons and re-export a common Button.

2. Support variants:
   - primary
   - secondary
   - ghost
   - tonal
   - destructive
   - glass, only if safe and readable

3. Support states:
   - default
   - pressed
   - loading
   - disabled

4. Add a contrast helper:
   - src/theme/contrast.ts
   It should provide a simple readable foreground choice for known theme colors.
   It does not need to be a perfect WCAG engine in this task, but it should prevent obvious white-on-beige cases.

5. Replace inline CTA buttons in these screens first:
   - src/screens/settings/SettingsScreen.tsx
   - src/screens/discover/AskAidrobeScreen.tsx
   - src/screens/wardrobe/AddItemScreen.tsx
   - src/screens/wardrobe/ImportConfirmScreen.tsx

Non-goals:
- Do not redesign full page layouts.
- Do not migrate every single Pressable in the app.
- Do not change navigation.
- Do not change backend APIs.

Acceptance:
- Core CTA buttons no longer use white text on light beige backgrounds.
- Button variants have consistent disabled/loading/pressed behavior.
- Existing PrimaryButton and SecondaryButton usage remains compatible, or is migrated safely.
- No random `color: '#fff'` on light backgrounds in touched screens.
- `npm run typecheck` passes.
- `npm run lint` passes or failures are clearly reported.
```

---

# FE-02｜Operation State 与反馈状态系统

Related issue: U2SG/aidrobe-FE#17

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#17 minimal operation state and feedback components.

Goal:
Create a consistent feedback model for pending/success/error/retry/dirty states.

Scope:
1. Add a small operation state model:
   Suggested path:
   - src/state/operationState.ts
   or
   - src/components/feedback/operationState.ts

   Type:
   type OperationPhase =
     | 'idle'
     | 'validating'
     | 'uploading'
     | 'processing'
     | 'saving'
     | 'succeeded'
     | 'failed'
     | 'retrying';

2. Add reusable components:
   - src/components/feedback/OperationBanner.tsx
   - src/components/feedback/InlineRetry.tsx
   - src/components/feedback/ProcessingOverlay.tsx
   - src/components/feedback/SaveBar.tsx

3. Integrate first into:
   - AskAidrobeScreen: failed answer should show retry action.
   - ImportConfirmScreen: save/import failure should not lose edited form state.
   - SettingsScreen: location/time save should show pending/success/error clearly.

4. Add or centralize mutation invalidation helpers where safe.
   At minimum document mapping in code comments:
   - confirm import → wardrobeItems, todayRecommendation
   - update departure time → userSettings, todayRecommendation
   - update location → userSettings, todayRecommendation
   - wear outfit → todayRecommendation, outfitHistory, wardrobeItems

Non-goals:
- Do not introduce XState or a heavy state machine library.
- Do not rewrite all screens.
- Do not replace React Query for server state.
- Do not change backend APIs.

Acceptance:
- Touched async operations have visible pending/error/retry states.
- Retry does not require retyping the user's input where applicable.
- Save failure preserves user-edited content.
- Operation components are reusable.
- `npm run typecheck` passes.
- `npm run lint` passes or failures are clearly reported.
```

---

# FE-03｜Settings 出门时间 Bottom Sheet

Related issue: U2SG/aidrobe-FE#14

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#14 departure time bottom sheet in Settings.

Goal:
Settings should edit departure time with a bottom sheet, not navigate to the onboarding DepartureTime screen.

Files to inspect:
- src/screens/settings/SettingsScreen.tsx
- src/screens/onboarding/DepartureTimeScreen.tsx
- src/types/navigation.ts
- src/api/settings.ts or equivalent settings API file

Scope:
1. Add reusable time picker components:
   - src/components/forms/WheelTimePicker.tsx
   - src/components/settings/DepartureTimeSheet.tsx

2. SettingsScreen:
   - Replace `navigation.navigate('DepartureTime')` with opening a bottom sheet.
   - Use current user setting as initial value.
   - Save through existing settings API.
   - After save, update/invalidate userSettings and todayRecommendation queries.
   - Show success/error feedback using the operation feedback system if already available; otherwise use a small inline/toast fallback.

3. Onboarding:
   - Keep existing onboarding flow working.
   - If practical, reuse the low-level WheelTimePicker only, not the onboarding page container.

Non-goals:
- Do not implement weekday/weekend schedules.
- Do not add reminders.
- Do not change backend settings contract unless necessary.
- Do not redesign full SettingsScreen.

Acceptance:
- Settings departure time no longer opens onboarding screen.
- User can choose a reasonable arbitrary time, not only 5 hardcoded chips.
- Save updates visible settings immediately.
- Today recommendation query is invalidated after time update.
- Onboarding still works.
- `npm run typecheck` passes.
- `npm run lint` passes or failures are clearly reported.
```

---

# FE-04｜i18n 基础设施与语言切换

Related issue: U2SG/aidrobe-FE#19  
Related BE issue: U2SG/aidrobe-BE#30

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#19 minimal bilingual i18n foundation and language setting.

Goal:
Support zh-CN / en-US / system language selection and stop hardcoding new user-facing strings.

Scope:
1. Add i18n foundation:
   - src/i18n/index.ts
   - src/i18n/zh-CN.ts
   - src/i18n/en-US.ts
   - src/hooks/useT.ts
   - src/i18n/domainLabels.ts

2. Add language setting in SettingsScreen:
   Options:
   - 简体中文 zh-CN
   - English en-US
   - 跟随系统 system

3. Localize core screens first:
   - TodayScreen
   - Wardrobe list/detail if present
   - AddItemScreen
   - ImportConfirmScreen
   - AskAidrobeScreen
   - SettingsScreen

4. Localize domain enum labels:
   - category: top/bottom/outerwear/shoes/accessory
   - status: wearable/laundry/repair/unavailable
   - fitStatus
   - recommendation variant: safe/fast/stylish

5. Add API_GAP comments where backend does not yet support locale:
   - import task create should include locale or backend should read user settings
   - Ask request should include locale or backend should read user settings
   - Vision result should return display_name/localized_names

Data model expectation:
- UI should display user custom name first.
- If no custom name, display localized displayName.
- If no localized name, fall back to current name.

Non-goals:
- Do not translate every historical item.
- Do not force existing user-created item names to change.
- Do not add a heavy i18n dependency unless justified.
- Do not block on BE#30; mark API_GAP and add fallbacks.

Acceptance:
- Settings has language selection.
- Core screens no longer add new hardcoded user-facing strings.
- Domain enum values are not shown raw to users.
- Chinese mode does not show raw enum labels like `top`, `safe`, `wearable`.
- Typecheck and lint pass.
```

---

# FE-05｜AskAidrobe 上下文、历史隔离与 Retry

Related issue: U2SG/aidrobe-FE#12  
Related BE issue: U2SG/aidrobe-BE#29

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#12 AskAidrobe context cleanup and scoped history behavior.

Goal:
Remove hardcoded commute context, separate focused-item Ask behavior, and improve loading/error/retry UX.

Files to inspect:
- src/screens/discover/AskAidrobeScreen.tsx
- src/api/ask.ts
- src/types/navigation.ts
- src/hooks/useWardrobeItemNames.ts

Scope:
1. Remove hardcoded:
   context: { scene: 'commute' }

2. Build context based on entrypoint:
   - global/discover: no forced scene, or selected scene if available
   - item detail/focused item: scope=item and focusedItemId
   - today entrypoint if present: scope=today and today context

3. History:
   - If BE#29 endpoint exists, call history with focused_item_id/scope.
   - If not, mark API_GAP[BE#29] and avoid showing misleading global history in focused item mode.
   - Use query key that includes scope/focusedItemId.

4. Loading:
   - Replace bare ActivityIndicator with AskThinkingBubble or current SiriOrb-based thinking state.
   - Keep UI readable and not overly animated.

5. Error:
   - Keep failed question visible.
   - Add retry action.
   - Do not lose user input.

Non-goals:
- Do not change backend prompt.
- Do not add image input.
- Do not implement full chat sessions.
- Do not redesign the entire Discover tab.

Acceptance:
- Ask no longer always sends scene=commute.
- Focused item Ask does not show unrelated global history by default.
- Failed Ask response has retry.
- Loading uses shared AI/motion component or a clear fallback.
- Analytics/event naming distinguishes global/item/today Ask if analytics exists.
- Typecheck/lint pass.
```

---

# FE-06｜Ask item refs，避免 N+1 并显示缩略图

Related issue: U2SG/aidrobe-FE#13  
Related BE issue: U2SG/aidrobe-BE#29

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#13 item refs row with snapshots/fallback and no large N+1.

Goal:
Render related wardrobe items in Ask answers with thumbnails/summaries without triggering many detail requests.

Files to inspect:
- src/screens/discover/AskAidrobeScreen.tsx
- src/hooks/useWardrobeItemNames.ts
- src/api/ask.ts
- src/types/api.ts
- wardrobe item card components if present

Scope:
1. Extend API types to support optional:
   itemRefSnapshots?: Array<{
     itemId: string
     title: string
     category: string
     colorMain: string
     thumbnailUrl?: string | null
   }>

2. Add reusable components:
   - src/components/wardrobe/ItemRefCard.tsx
   - src/components/wardrobe/ItemRefsRow.tsx

3. Rendering:
   - Prefer itemRefSnapshots from BE.
   - If not present, limit fallback detail fetching to first 6 refs.
   - If refs are empty, hide section.
   - Show thumbnail if available; otherwise use a readable category/color fallback.

4. Avoid large N+1:
   - Do not use useQueries for dozens of ids.
   - Add visible cap and “还有 N 件” if needed.

Non-goals:
- Do not change BE in this task.
- Do not implement a full wardrobe bulk endpoint.
- Do not change Ask answer generation.

Acceptance:
- Item refs row shows real thumbnail or meaningful fallback, not empty gray boxes only.
- It never fires dozens of detail requests from one Ask answer.
- Component is reusable outside Ask.
- Typecheck/lint pass.
```

---

# FE-07｜API_GAP 标注清单

Related issue: U2SG/aidrobe-FE#18

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#18 API_GAP tracking document and annotations.

Goal:
Systematically track frontend API gaps instead of hiding them in ad-hoc TODOs or mock logic.

Scope:
1. Add:
   - docs/api-gaps.md

2. Include current known gaps:
   Ask:
   - focused history filter: BE#29
   - item_ref_snapshots: BE#29
   - richer Ask context

   Import:
   - candidate_items: BE#24
   - confirm-items: BE#25
   - progress steps / candidate count
   - batch upload session id

   Today/share:
   - outfit visual asset in today response
   - create/share outfit board without selfie
   - OOTD poster support outfit_id

   Settings:
   - departure time update response with refresh hint, optional

   Feedback/state:
   - display_message/retryable/retry_after
   - async task progress_percent/step_label

3. Add code comments only at fallback boundaries:
   Format:
   // API_GAP[BE#29]: focused Ask history filter is not available yet.
   // Fallback: hide unrelated history in focused item mode.

4. Do not spam comments across every call site.

Non-goals:
- Do not implement the backend APIs.
- Do not block existing UI behavior.
- Do not add stale mock data as permanent code.

Acceptance:
- docs/api-gaps.md exists.
- Key current gaps are documented with FE file, needed API, fallback, BE issue, priority.
- At least Ask and Import fallback boundaries are annotated.
- Typecheck/lint pass.
```

---

# FE-08｜单图多件 ImportConfirm UI

Related issue: U2SG/aidrobe-FE#11  
Related BE issues: U2SG/aidrobe-BE#24, U2SG/aidrobe-BE#25

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#11 ImportConfirm support for candidate_items.

Goal:
Support one import task returning multiple clothing candidates while keeping existing single-item and multi-photo flows.

Files to inspect:
- src/api/importTasks.ts
- src/types/api.ts
- src/screens/wardrobe/AddItemScreen.tsx
- src/screens/wardrobe/ImportConfirmScreen.tsx

Scope:
1. Types:
   Add ImportCandidateItem and ImportTask.candidateItems.

2. API mapping:
   - Map backend `candidate_items`.
   - If backend only returns `candidate_item`, construct candidateItems length 1.
   - Add confirmImportTaskItems(taskId, body) for POST /v1/import-tasks/{task_id}/confirm-items.
   - If BE not ready, add API_GAP[BE#25] and keep UI fallback safe.

3. UI:
   - candidateItems.length <= 1: keep current single item form.
   - candidateItems.length > 1: show multi-candidate confirm UI.
   - Default select candidates where shouldImport !== false.
   - User can edit name/category/color/location/size/fit if fields exist.
   - User can save selected items.

4. Multi-photo queue:
   Keep existing behavior:
   - multiple photos → multiple import tasks → confirm serially.
   - one photo with multiple candidates → one task → batch confirm.

Non-goals:
- Do not implement style source/OOTD import.
- Do not implement crop editing UI.
- Do not rewrite AddItemScreen full flow.

Acceptance:
- Single item confirm still works.
- Existing multi-photo queue still works.
- Multiple candidate task displays multi-confirm UI.
- User can save only selected candidates.
- Save success invalidates wardrobeItems and todayRecommendation.
- Typecheck/lint pass.
```

---

# FE-09｜Today/OOTD 分享与 OutfitBoard 组件化

Related issue: U2SG/aidrobe-FE#15

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#15 first-step outfit visual component extraction and share flow alignment.

Goal:
Separate Today outfit visual logic from TodayScreen and fix OotdPoster outfitId disconnect.

Files to inspect:
- src/screens/today/TodayScreen.tsx
- src/screens/today/OotdPosterScreen.tsx
- src/api/ootdPosters.ts
- src/types/navigation.ts
- src/types/api.ts

Scope:
1. Extract reusable components:
   - src/components/outfit/OutfitBoard.tsx
   - src/components/outfit/OutfitPiece.tsx
   - src/components/outfit/WeatherBackdrop.tsx
   - src/components/outfit/OutfitShareCard.tsx, if feasible

2. TodayScreen:
   - Keep existing visual output as close as possible.
   - Move board/layout visual logic into components.
   - Do not change recommendation algorithm.

3. OotdPoster outfitId:
   - If route has outfitId, do not ignore it.
   - If backend API cannot accept outfitId, add API_GAP and show flow wording clearly.
   - Distinguish:
     A. Basic share: real outfit board, no selfie required.
     B. AI poster: selfie/consent-based.

4. Add share entry if safe:
   - “分享这套”
   - If share asset API is missing, API_GAP and local placeholder only if useful.

Non-goals:
- Do not implement full native image export if dependencies are missing.
- Do not change BE provider.
- Do not redesign entire Today tab.

Acceptance:
- TodayScreen is smaller and delegates board visual to reusable components.
- OotdPoster no longer silently ignores outfitId; it either uses it or marks API_GAP.
- Basic outfit share and AI poster concepts are separated in UI/code.
- Typecheck/lint pass.
```

---

# FE-10｜UI/UX + Motion System 样板

Related issue: U2SG/aidrobe-FE#16

```text
Repo: U2SG/aidrobe-FE
Task: Implement FE#16 first UI/Motion System foundation, not full app redesign.

Goal:
Create the foundation for Aidrobe's visual and motion language using existing Skia/Reanimated stack.

Important context:
The project already has:
- @shopify/react-native-skia
- react-native-reanimated
- SiriOrb implemented with Skia RuntimeEffect shader

Files to inspect:
- src/components/ui/SiriOrb.tsx
- src/theme/design.ts
- src/screens/discover/AskAidrobeScreen.tsx
- src/screens/wardrobe/AddItemScreen.tsx
- src/screens/today/TodayScreen.tsx

Scope:
1. Add theme modules:
   - src/theme/tokens.ts or extend src/theme/design.ts carefully
   - src/theme/motion.ts
   - src/theme/glass.ts

2. Upgrade SiriOrb into AIOrb without breaking existing imports.
   Suggested API:
   - variant: ink | vivid | glass | rainbow | thinking | success | error
   - intensity: low | medium | high
   - size presets
   - reduceMotion fallback

3. Add reusable screen states:
   - src/components/states/LoadingState.tsx
   - src/components/states/EmptyState.tsx
   - src/components/states/ErrorState.tsx
   - src/components/states/ProcessingState.tsx

4. Apply only to 2-3 sample surfaces:
   - Ask thinking state
   - Import processing state
   - Today recommendation refresh/loading state

5. Respect accessibility:
   - reduce motion fallback
   - do not place body text over strong animated/rainbow background
   - keep contrast readable

Non-goals:
- Do not rewrite all screens.
- Do not add WebGL for native app in this task.
- Do not turn every background into glass/rainbow.
- Do not sacrifice readability for effects.

Acceptance:
- AIOrb or equivalent exists and keeps SiriOrb compatibility.
- Ask/Import/Today use consistent motion language in at least one state each.
- Reduce motion path exists.
- Typecheck/lint pass.
```

---

## Suggested FE execution order

1. FE-01 Button System
2. FE-02 Operation State
3. FE-03 Departure Time Sheet
4. FE-04 i18n foundation
5. FE-05 Ask context/history/retry
6. FE-06 Ask item refs
7. FE-07 API_GAP docs
8. FE-08 Import candidate_items UI
9. FE-09 Today/OOTD share componentization
10. FE-10 Motion system sample

