# Aidrobe P0 Release Trust Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the redesign P0 release gate with truthful feedback, date-correct Today/Tomorrow refresh, server-correct Wardrobe query/pagination, honest recoverable waits, Safe Area coverage, and synchronized contract/smoke documentation.

**Architecture:** Reuse existing Daily Recommendation revisions, persistent `outfit_id`, Import task IDs, and React Query keys. Add only thin contract fields (`target_date`, Wardrobe `query`/filters) and deterministic pagination; do not create a Recommendation Session or another frontend state machine. Unsupported feedback note/swap UI is removed instead of simulated.

**Tech Stack:** Expo/React Native 0.85, TypeScript, TanStack React Query 5, FastAPI, SQLAlchemy/PostgreSQL, pytest contract tests in GitHub CI.

---

## Model Reuse Spike Conclusion

Decision: **thin adapter; no new entity and no ADR required**.

| P0 need | Existing identity/lifecycle | Conclusion |
|---|---|---|
| Feedback attribution | Persistent `outfit_id`; archived recommendation revisions remain addressable | Reuse directly |
| Today/Tomorrow refresh | `DailyRecommendation(recommendation_date, revision, is_current)` | Add `target_date` to refresh contract |
| Long-wait recovery | Persisted Daily Recommendation + stable React Query keys; First Outfit reads the same daily | Re-fetch existing result on focus/re-entry |
| Wardrobe query | Existing server filters, offset/limit, filtered total | Add free-text query, deterministic tie-break order, FE infinite query |
| Import/First Outfit | Existing `task_id` and `firstOutfitGate` | Reuse directly |

## Task 1: Freeze and Implement Target-Date Refresh

**Files:**
- Modify: `D:/project/Python/aidrobe/app/presentation/api/v1/routers/recommendations.py`
- Modify: `D:/project/Python/aidrobe/app/presentation/api/v1/schemas/recommendations.py`
- Modify: `D:/project/Python/aidrobe/app/application/recommendations/refresh_today.py`
- Modify: `D:/project/Python/aidrobe/app/infrastructure/persistence/repositories/recommendation_repo.py`
- Modify: `D:/project/Python/aidrobe/tests/api/test_today_refresh.py`
- Modify: `D:/project/Python/aidrobe/tests/services/test_refresh_concurrency.py`
- Modify: `src/api/recommendations.ts`
- Modify: `src/api/settings.ts`
- Modify: `src/types/api.ts`
- Modify: `src/screens/today-v2/TodayV2Screen.tsx`

**Step 1:** Add a backend contract test that posts `/today/refresh?target_date=<tomorrow>` and asserts `recommendation_date` and `mode` are tomorrow while today's revision remains current for today.

**Step 2:** Add validation coverage for dates outside `[local today, local tomorrow]` when date-aware Today is enabled.

**Step 3:** Add `target_date: date | None` to the refresh query parameters. Reuse the same local-date bounds as GET Today, pass the chosen date into quota/revision generation, and set response `mode` to `today` or `tomorrow`. Serialize the lock-scoped quota check before any override/generation spend.

**Step 4:** Extend `refreshTodayRecommendation(scene, override, targetDate)` to pass `target_date` as a query parameter.

**Step 5:** Update Today V2 so swap and context overrides refresh the displayed date, use the server timezone and concrete date React Query keys, update on focus/AppState/time boundaries, and write mutation results by the response date.

**Step 6:** Expose `can_refresh` / `can_context_override` from the server and render only actions the active date can execute under the current flags/quota.

**Step 7:** Do not run tests locally. Expected GitHub CI coverage: `tests/api/test_today_refresh.py`, `tests/services/test_refresh_concurrency.py`, Ruff, mypy, and frontend typecheck/regression suite.

## Task 2: Complete the Wardrobe Query Contract

**Files:**
- Modify: `D:/project/Python/aidrobe/app/application/wardrobe/list_items.py`
- Modify: `D:/project/Python/aidrobe/app/infrastructure/persistence/repositories/wardrobe_repo.py`
- Modify: `D:/project/Python/aidrobe/app/presentation/api/v1/routers/wardrobe.py`
- Modify: `D:/project/Python/aidrobe/tests/api/test_v2_gap_fill.py`
- Modify: `D:/project/Python/aidrobe/tests/api/test_wardrobe.py`

**Step 1:** Add failing contract coverage for free-text query across title, canonical name, color, and category; combine it with status/season/color and assert filtered `total`.

**Step 2:** Add a response-mapping test proving season/style/material/secondary-color fields reflect persisted values rather than schema defaults.

**Step 3:** Thread bounded `query` through router → use case → repository. Escape `%`, `_`, and `\\`, then apply case-insensitive contains filters with an explicit SQL escape character.

**Step 4:** Make offset pagination deterministic with `ORDER BY created_at DESC, id DESC`.

**Step 5:** Map the existing extended Wardrobe model fields in `item_response()`, extracting `{ "tags": [...] }` JSONB into API lists.

**Step 6:** Defer execution to GitHub CI; do not add a cursor or a new endpoint.

## Task 3: Wire Frontend Wardrobe Types and API

**Files:**
- Modify: `src/types/api.ts`
- Modify: `src/api/wardrobe.ts`
- Modify: `src/i18n/domainLabels.ts`

**Step 1:** Extend `ListWardrobeItemsQuery` with `query`, `status`, `season`, and `color`.

**Step 2:** Pass these fields verbatim to `GET /v1/wardrobe-items`, omitting `all`/blank values.

**Step 3:** Export a canonical color-filter value list from the existing localization table and remove the duplicate `grey` alias. Keep custom colors searchable; do not derive incomplete facets from loaded pages.

## Task 4: Replace the 50-Item Client Filter with Server Pagination

**Files:**
- Modify: `src/screens/wardrobe/WardrobeListScreen.tsx`

**Step 1:** Replace `useQuery(limit: 50)` with `useInfiniteQuery` using a small fixed page size and `offset = pageParam`.

**Step 2:** Put category, debounced search, status, season, and color in the query key and query function.

**Step 3:** Flatten pages, use server `total`, fetch the next page from `onEndReached`, and keep pull-to-refresh/focus refetch/cutout polling.

**Step 4:** Distinguish whole-wardrobe empty from current-query empty using whether search/category/filters are active.

**Step 5:** Render a footer state for next-page loading/failure without replacing already loaded items.

## Task 5: Make Feedback Truthful

**Files:**
- Modify: `src/screens/today/FeedbackSheetScreen.tsx`
- Modify: `src/i18n/zh-CN.ts`
- Modify: `src/i18n/en-US.ts`

**Step 1:** Remove the free-text note input and “submit and swap” action because neither contract exists.

**Step 2:** Make reason selection optional, submit an empty `reason_tags` list when omitted, and keep one primary “submit feedback” action.

**Step 3:** Use the existing `Button` component (`minHeight`, loading/disabled semantics) and the honest `feedback.submitted` toast.

**Step 4:** Remove obsolete feedback i18n keys and rewrite the subtitle so it does not promise an immediate swap or guaranteed next-day improvement.

## Task 6: Honest Recoverable Waits and Safe Area

**Files:**
- Modify: `src/screens/today-v2/TodayV2Screen.tsx`
- Modify: `src/screens/onboarding-v2/FirstOutfitScreen.tsx`
- Modify: `src/screens/wardrobe/WardrobeListScreen.tsx`
- Modify: `src/screens/today/FeedbackSheetScreen.tsx`
- Modify: `src/i18n/zh-CN.ts`
- Modify: `src/i18n/en-US.ts`

**Step 1:** Wrap Today, First Outfit, and Wardrobe in the existing `ScreenContainer(padded=false)` and replace fixed top safe-area padding with content spacing.

**Step 2:** Replace Today's cold `LoadingBlock` with branded `LoadingState` and honest long-wait copy.

**Step 3:** Remove First Outfit's unverifiable three-stage list; show one honest message that the user may leave and return, plus a back/later action when navigation permits.

**Step 4:** Keep refresh results recoverable through persisted Daily Recommendation + React Query invalidation; add no frontend-only job state.

**Step 5:** Use bottom safe-area insets for the feedback action bar and preserve Dynamic Type via `minHeight` buttons.

## Task 7: Contract and Acceptance Documentation

**Files:**
- Modify: `docs/qa/aidrobe-v2-internal-smoke-test-v0.1.md`
- Modify: `docs/engineering/aidrobe-fe-v2-gap-analysis-v0.1.md`
- Modify as generated/maintained by the backend workflow: `D:/project/Python/aidrobe/docs/ios-api-v3plus-update.md`
- Inspect/update only if project tooling supports deterministic generation: frontend/backend `docs/openapi.{json,yaml}`

**Step 1:** Update smoke cases for real Ask destinations, optional feedback reason with no note/swap UI, Tomorrow refresh, 50+ Wardrobe pagination/filter/search, and leave/re-enter recovery.

**Step 2:** Update gap analysis so closed gaps and remaining real-device/CI requirements match the implementation.

**Step 3:** Document the two additive backend query parameters and offset/stable-order semantics.

**Step 4:** Run local static checks only: `git diff --check`, targeted `rg` assertions, and manual diff review. Do not execute test/build/lint commands locally.

**Step 5:** Request an independent code review with the `requesting-code-review` skill before handoff. Report GitHub CI commands as the required next verification step.
