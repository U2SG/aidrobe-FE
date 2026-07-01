# 衣然 / Aidrobe FE Redesign Codex Implementation Brief

**Version:** v0.9-codex  
**Status:** Ready for Codex implementation planning  
**Repo:** `U2SG/aidrobe-FE`  
**Companion Docs:**  
- `aidrobe-mvp-workflow-agent-responsibility-design-v0_8.md`
- `aidrobe-fe-refactor-spec.md`
- `aidrobe-privacy-data-copy-v0_1.md`
- `aidrobe-indoor-commute-climate-supplement-v0.1.md`
- `aidrobe-experience-review-memo-v0.1.md`
- `yiran-brand-product-direction-v0.1.md`

---

## 0. What this document is

This is the implementation handoff for Codex.

It is not another product philosophy document.  
It converts the current Aidrobe / 衣然 product direction into concrete FE work:

```text
IA change
Today v2 state machine
First Outfit activation
Late-night / evening behavior
Indoor-main climate awareness
Passive learning and frequency caps
Copy governance
Profile privacy/data trust
Component boundaries
PR sequencing
Acceptance criteria
```

Use this document to generate issues / PRs and implement incrementally.

---

## 1. Product name and repo naming

Product-facing brand:

```text
衣然 YIRAN
```

Existing codebase and repo name remain:

```text
aidrobe-FE
```

Do **not** rename package name, bundle ID, repo, API paths, or internal namespaces in this implementation pass.

Allowed in this scope:

```text
Update user-facing copy to 衣然 where appropriate
Keep internal names as Aidrobe / aidrobe unless a separate rename task is created
```

Do not do a full brand migration yet.

---

## 2. Non-negotiable product rules

Every PR must preserve these constraints.

```text
MVP core:
导入 → 首套 → Today → 轻反馈 → 下次更懂

First Outfit:
导入完成即出首套
safe over clever
可行性 Gate
没有可行搭配时诚实 fallback，不 fake outfit

Today:
默认只给一套
不显示 safe / fast / stylish 策略切换
不显示三套候选菜单
换一套是兜底，不是菜单

IA:
一级导航必须是 Today / Wardrobe / Ask / Profile
Discover 不再作为一级 tab

Copy:
用户可见业务文案不 hardcode
进入 i18n / copy registry
不出现 demo / mock / sample outfit / local showcase 等生产文案

Tone:
不审判
不催买
不制造身材焦虑
不默认使用显瘦、遮肉、减龄、中年等年龄/身体规训词

Privacy:
Profile 必须有人话版数据说明
数据说明文案来自 privacy copy 文档
```

---

## 3. Target IA

### 3.1 Bottom tabs

Replace current primary tabs with:

```text
Today
Wardrobe
Ask
Profile
```

### 3.2 Contextual entrances only

These are not primary tabs:

```text
Should-I-Buy
Trips / Packing
Wardrobe Health / Insights dashboard
Style Inspiration
Wardrobe Report
Outfit Calendar
```

They should be reachable through context:

```text
Ask prompt
Wardrobe item detail
Today insight
Share-to-Aidrobe / pasted link
Profile secondary section
```

### 3.3 Implementation note

Do not delete existing screens immediately.

Create a V2 shell:

```text
src/core/navigation/MainTabsV2.tsx
src/screens/today-v2/
src/screens/ask-v2/
src/screens/profile-v2/
src/components/product/
src/components/agent/
src/copy/
```

Use a feature flag or config constant:

```ts
const ENABLE_MVP_V2_UI = true;
```

Temporary local flag is acceptable for this redesign branch.

---

## 4. Today v2 State Machine

Today is not a single screen state. It must be time-aware.

### 4.1 State dimensions

Inputs:

```ts
type TodayStateInput = {
  now: Date;
  departureTime?: string | null; // HH:mm:ss or HH:mm
  hasTodayRecommendation: boolean;
  hasTomorrowRecommendation?: boolean;
  firstOutfitState?: 'none' | 'no_outfit' | 'single_outfit' | 'ready';
};
```

Derived mode:

```ts
type TodayMode =
  | 'morning_today'
  | 'daytime_today'
  | 'evening_tomorrow'
  | 'late_night_tomorrow'
  | 'empty_or_cold_start';
```

### 4.2 Suggested thresholds

Use these defaults, centralized in one file for later tuning:

```ts
const EVENING_START_HOUR = 18;
const LATE_NIGHT_START_HOUR = 22;
const MORNING_LOOKAHEAD_MINUTES = 180;
```

Behavior:

```text
morning_today:
  Before departure or within morning prep window.
  Main copy: today / 出门 / 现在可穿.

daytime_today:
  After departure but before evening.
  Main copy: keep today's outfit, allow feedback / swap / ask.

evening_tomorrow:
  18:00–22:00.
  Switch semantic focus to tomorrow.
  Do not show stale "today" copy as if it is still useful.

late_night_tomorrow:
  22:00+.
  Prepare tomorrow, reduce prompts, avoid extra confirmations.
  Tone should be quiet and low-effort.

empty_or_cold_start:
  No usable outfit.
  Show slot-specific gap or first import CTA.
```

### 4.3 User-facing copy intent

Do not hardcode final copy in components. Add i18n keys.

Suggested keys:

```text
today.mode.morning.title
today.mode.morning.subtitle
today.mode.daytime.title
today.mode.daytime.subtitle
today.mode.evening.title
today.mode.evening.subtitle
today.mode.lateNight.title
today.mode.lateNight.subtitle
```

Copy intent examples:

```text
Morning:
今天这套，恰好。

Daytime:
今天这套还在这里。

Evening:
明天可以先这样准备。

Late night:
明天这套，先放这儿。
```

### 4.4 Acceptance

```text
Opening app at 08:00 shows today's recommendation.
Opening app at 19:30 switches to tomorrow-oriented copy/state.
Opening app after 22:00 never triggers heavy feedback prompts.
No stale "today wear this" copy appears at night.
```

---

## 5. Today v2 UI structure

### 5.1 Above the fold

Only show:

```text
Mode-aware headline
One real outfit board
2–3 real reasons
Weather / time hint
Primary actions
Context override chips/input
One optional resurface insight
```

### 5.2 Primary actions

```text
穿这套
换一套
不喜欢
为什么
```

Psychological detail:

```text
Do not imply "you must wear this".
Use soft language: "今天先试这套" / "想换也可以".
```

### 5.3 Remove from above the fold

```text
safe / fast / stylish rail
multi-candidate cards
calendar shortcut
report shortcut
shopping shortcut
packing shortcut
```

If these remain in the code, hide them behind secondary/contextual entry points.

### 5.4 Context override must be suggestions-first

`ContextOverrideBar` should not primarily feel like a blank text input.

Default visible chips:

```text
今天有会
想舒服一点
不想穿裙子
要走很多路
想低调一点
办公室有点冷
不怎么出门
```

Free text is secondary.

Suggested component API:

```ts
type ContextOverrideBarProps = {
  suggestions: Array<{
    id: string;
    labelKey: string;
    payload: string;
  }>;
  onSelectSuggestion: (payload: string) => void;
  onSubmitText: (text: string) => void;
  disabled?: boolean;
};
```

### 5.5 Acceptance

```text
User can use Today without typing.
Clicking a chip submits an override.
Text input is available but secondary.
No strategy selection is visible.
Only one primary outfit is visible by default.
```

---

## 6. First Outfit / Cold Start implementation

### 6.1 First Outfit states

```ts
type FirstOutfitState =
  | 'not_started'
  | 'processing'
  | 'no_outfit'
  | 'single_outfit'
  | 'ready'
  | 'failed';
```

### 6.2 Gate result shape

Use current API if available; otherwise adapt locally until BE contract is ready.

Target contract:

```ts
type FirstOutfitGateResult = {
  state: 'no_outfit' | 'single_outfit' | 'ready';
  feasibleOutfitCount: number;
  missingSlots: Array<'top' | 'bottom' | 'shoes' | 'dress' | 'outerwear'>;
  firstOutfit?: OutfitSummary | null;
  reasoning: RecommendationReason[];
  gateFailures: Array<
    | 'missing_top'
    | 'missing_bottom'
    | 'missing_shoes'
    | 'missing_dress'
    | 'metadata_low_confidence'
    | 'image_unavailable'
    | 'weather_mismatch'
  >;
};
```

### 6.3 UI behavior

```text
processing:
  Progressive loading.
  Do not white-screen.
  Show stages: 识别衣物 → 整理信息 → 试着搭一套.

no_outfit:
  Slot-specific next step.
  Example: 你已经有 3 件上衣和 1 双鞋。再加一条下装，就能生成第一套搭配。

single_outfit:
  Show one outfit.
  De-emphasize or hide "换一套".
  Explain: 现在能先搭出这一套，再加几件后会更灵活。

ready:
  Show first outfit activation card.
  Allow continue to Today.

failed:
  Honest error.
  Never render fake outfit.
```

### 6.4 Late-night import rule

If importing after `LATE_NIGHT_START_HOUR`:

```text
Confirmation question budget = 0–1
Prefer "先收下，之后再慢慢整理"
Do not ask multiple metadata questions
Allow low-confidence fields to be deferred
```

Suggested utility:

```ts
function confirmationBudgetForImport(now: Date): number {
  const hour = now.getHours();
  if (hour >= 22) return 0;
  if (hour >= 20) return 1;
  return 2;
}
```

### 6.5 Acceptance

```text
After import, user lands on First Outfit or slot-specific gap state.
No fake outfit is shown.
Late-night import asks at most one confirmation, ideally zero.
Single-outfit state does not expose a failing swap action.
```

---

## 7. Import onboarding adjustment

### 7.1 First action should feel smaller

Change onboarding entry from task-like:

```text
添加几件衣物
```

toward a lower-friction first step:

```text
先从今天穿的开始
拍一下你现在身上这件
从相册选几件最近常穿的
```

### 7.2 Suggested onboarding choices

```text
拍现在穿的
从相册选几件
粘贴商品链接
```

This lowers the "I need to organize my whole closet" feeling.

### 7.3 Acceptance

```text
Onboarding does not imply full wardrobe import.
User can start from one current item.
Copy avoids "建立数据库 / 完整录入" feeling.
```

---

## 8. Passive learning and prompt frequency caps

### 8.1 Event categories

Track explicit vs implicit vs weak inferred.

```ts
type SignalStrength = 'weak' | 'medium' | 'strong';

type LearningEvent = {
  eventType:
    | 'today_viewed'
    | 'outfit_impression'
    | 'outfit_accepted_intent'
    | 'outfit_swapped'
    | 'outfit_disliked'
    | 'outfit_dislike_reason_selected'
    | 'context_override_submitted'
    | 'reason_expanded'
    | 'resurface_insight_viewed'
    | 'resurface_item_opened'
    | 'first_outfit_generated'
    | 'first_outfit_failed_gate'
    | 'import_batch_completed'
    | 'style_image_added'
    | 'passive_wear_prompt_answered';
  signalStrength: SignalStrength;
  sourceSurface: 'today' | 'ask' | 'wardrobe' | 'profile';
  metadata?: Record<string, unknown>;
};
```

### 8.2 PassiveWearPrompt cap

Hard cap:

```text
Max 2 appearances per rolling 7 days.
If ignored 2 times consecutively, suppress for 7 days.
Never show after 22:00.
Never block main Today experience.
```

### 8.3 ResurfaceInsight cap

Hard cap:

```text
Max 1 resurface insight per day.
Same item cooldown: 14 days.
Do not show if user dismissed same item recently.
Do not stack multiple insights.
```

### 8.4 Acceptance

```text
Frequency caps are centralized constants.
Repeated ignores reduce prompts.
No repeated same-item resurface within cooldown window.
No passive prompt appears late-night.
```

---

## 9. Indoor-main commute climate awareness

This is P1.5, not a new tab and not a new workflow.

### 9.1 Product principle

Weather is not one variable.

Split:

```text
commute exposure:
  short, sometimes extreme, solved by removable outer layer.

main stay environment:
  long, stable, often indoor, determines body comfort.
```

### 9.2 Passive inference signals

Strong signal:

```text
User says in Ask / override:
办公室很冷
我开车不用穿太厚
我们公司暖气很足
今天不怎么出门
```

Medium signal:

```text
Repeated mismatch:
"太冷" feedback when outdoor temperature >= 22°C
"太热" feedback when outdoor temperature <= 10°C
```

Weak signal:

```text
Short prep time
No outdoor-walking overrides
Wardrobe mostly office pieces, few outdoor pieces
```

### 9.3 RecommendationReason source

Add:

```ts
type RecommendationReasonSource =
  | 'weather_rule'
  | 'wardrobe_history'
  | 'preference_memory'
  | 'style_memory'
  | 'indoor_climate_inference'
  | 'llm';
```

### 9.4 User-facing reason examples

Good:

```text
室外很热，不过你们公司空调一直很足，带上这件薄开衫，中午应该用得上。
今天外面挺冷，但办公室应该有暖气，这件薄针织衫比厚毛衣更合适，出门套上外套就行。
```

Bad:

```text
系统检测到你是室内通勤用户，已切换室内推荐模式。
```

### 9.5 DepartureTime optional micro-question

Only allowed active question:

```text
出门通勤主要是：
多接触室外 / 少接触室外 / 跳过
```

Do not create a new onboarding page for this.  
Only attach it to an existing departure/time context if already present.

### 9.6 Acceptance

```text
No new tab/page/workflow.
Temperature mismatch feedback can be tracked.
Reason source supports indoor_climate_inference.
UI never labels user as "室内通勤用户".
```

---

## 10. Profile privacy/data trust

Implement Profile as a trust surface, not just settings.

### 10.1 Required sections

```text
你的数据
隐私与数据说明
衣然记住的关于你
权限与天气
删除衣物 / 清空数据 / 注销账号
语言
出门时间
账号
```

### 10.2 Copy source

Use privacy document copy. Do not rewrite inside components.

Required primary copy:

```text
你的衣橱，只属于你
```

### 10.3 Memory correction

Expose learned preferences as reviewable entries where API supports it.

If API is unavailable, build read-only placeholder only if explicitly marked as unavailable; do not fake learned data.

### 10.4 Acceptance

```text
Profile has "你的数据" entry.
Privacy copy comes from i18n/copy registry.
No fake memory entries.
Delete/clear/account deletion actions are clearly separated.
```

---

## 11. Copy governance implementation

### 11.1 Required structure

Add or extend:

```text
src/i18n/zh-CN.ts
src/i18n/en-US.ts
src/copy/productCopy.ts
src/copy/privacyCopy.ts
src/copy/recommendationCopy.ts
src/copy/emptyStateCopy.ts
src/copy/feedbackCopy.ts
src/copy/onboardingCopy.ts
```

If the repo already uses only `src/i18n`, do not over-engineer.  
At minimum, all new user-visible strings must go into i18n.

### 11.2 Denylist

Add a lightweight script:

```text
scripts/check-copy-denylist.ts
```

Denylist examples:

```text
demo
mock
sample outfit
local showcase
placeholder outfit
雨天通勤
银蓝冷调
显瘦
遮肉
减龄
中年
```

Exception mechanism:

```text
Allow test fixture files if explicitly excluded.
Allow docs.
Do not allow production src screens/components.
```

### 11.3 Acceptance

```text
npm test includes copy denylist check.
New v2 screens do not hardcode business copy.
No user-visible production copy uses forbidden words.
```

---

## 12. Component system additions

Create product and agent components rather than bloating screens.

### 12.1 Product components

```text
src/components/product/DecisionOutfitCard.tsx
src/components/product/OutfitCanvas.tsx
src/components/product/RecommendationReasonList.tsx
src/components/product/ContextOverrideBar.tsx
src/components/product/FeedbackChipGroup.tsx
src/components/product/ResurfaceInsightCard.tsx
src/components/product/FirstOutfitActivationCard.tsx
src/components/product/SlotGapEmptyState.tsx
src/components/product/StyleMemoryCard.tsx
src/components/product/PassiveWearPrompt.tsx
src/components/product/WardrobeImportDock.tsx
src/components/product/ContextualEntrySheet.tsx
```

### 12.2 Agent components

```text
src/components/agent/AgentThinkingState.tsx
src/components/agent/AgentMemoryNotice.tsx
src/components/agent/AgentConfidenceNotice.tsx
src/components/agent/AgentFallbackNotice.tsx
src/components/agent/AgentQuestionCard.tsx
```

### 12.3 Rule

```text
Foundation components handle shape.
Product components handle workflow.
Agent components handle intelligent state.
Screens compose components; screens do not own all logic.
```

---

## 13. Styling/token rules

Existing tokens are a base. Do not keep adding local screen palettes.

### 13.1 Rule

```text
No new screen-level P/T palette constants.
Use semantic tokens.
If a new color is needed, add to theme with meaning.
```

### 13.2 Suggested experience tokens

```text
morningBackground
warmSurface
decisionSurface
quietText
softAccent
trustGreen
cautionAmber
agentGlow
```

### 13.3 Acceptance

```text
Today v2 and onboarding v2 do not define large local palettes.
New colors are in theme.
No hardcoded #fff in new code unless tokenized exception.
```

---

## 14. Implementation phases

### Phase 0 — Docs and flag

PR goal:

```text
Add this implementation brief to docs.
Add ENABLE_MVP_V2_UI flag.
No UX behavior change.
```

Acceptance:

```text
Docs committed.
Flag exists.
App still runs existing UI when flag off.
```

---

### Phase 1 — V2 shell / IA

PR goal:

```text
Create MainTabsV2 with Today / Wardrobe / Ask / Profile.
Remove Discover from primary tabs under V2 flag.
Keep existing Discover screens reachable only through contextual navigation later.
```

Touched likely:

```text
src/core/navigation/RootNavigator.tsx
src/core/navigation/MainTabsV2.tsx
src/types/navigation.ts
```

Acceptance:

```text
V2 flag on shows four tabs.
No Discover primary tab.
Ask is primary.
Profile replaces Settings label.
```

---

### Phase 2 — Today mode state machine

PR goal:

```text
Add pure Today mode derivation utility and tests.
No major visual redesign yet.
```

Files:

```text
src/screens/today-v2/todayMode.ts
src/screens/today-v2/__tests__/todayMode.test.ts
```

Acceptance:

```text
08:00 -> morning_today
14:00 -> daytime_today
19:00 -> evening_tomorrow
23:00 -> late_night_tomorrow
No stale Today copy after evening threshold.
```

---

### Phase 3 — Today v2 UI

PR goal:

```text
Build TodayV2Screen with one primary outfit, reasons, actions, context override, resurface insight placeholder.
Hide strategy rail and multi-candidates.
```

Files:

```text
src/screens/today-v2/TodayV2Screen.tsx
src/components/product/DecisionOutfitCard.tsx
src/components/product/RecommendationReasonList.tsx
src/components/product/ContextOverrideBar.tsx
src/components/product/FeedbackChipGroup.tsx
src/components/product/ResurfaceInsightCard.tsx
```

Acceptance:

```text
Only one primary outfit visible.
No safe/fast/stylish UI.
Override chips visible.
Reasons rendered from API/context, not hardcoded.
No fake outfit when no outfit exists.
```

---

### Phase 4 — First Outfit activation

PR goal:

```text
After import completion, route to First Outfit state instead of only import success/list.
Implement processing/no_outfit/single_outfit/ready UI states.
```

Files:

```text
src/screens/onboarding-v2/FirstOutfitScreen.tsx
src/components/product/FirstOutfitActivationCard.tsx
src/components/product/SlotGapEmptyState.tsx
src/screens/wardrobe/AddItemScreen.tsx or import confirm flow
```

Acceptance:

```text
Import completion can lead to FirstOutfitScreen.
Slot gap state is specific.
Single outfit state does not expose failing swap.
Processing is progressive, not blank.
```

---

### Phase 5 — Late-night import and prompt caps

PR goal:

```text
Add confirmation budget utility.
Add PassiveWearPrompt / ResurfaceInsight frequency caps.
```

Files:

```text
src/utils/timeUX.ts
src/state/promptFrequency.ts
src/components/product/PassiveWearPrompt.tsx
```

Acceptance:

```text
22:00+ import asks <= 0 confirmation by default.
20:00–22:00 asks <= 1 confirmation.
Passive prompt capped at 2/week.
Ignored prompts suppress for 7 days.
Resurface same item cooldown 14 days.
```

---

### Phase 6 — Copy governance

PR goal:

```text
Move v2 user-visible copy to i18n/copy registry.
Add denylist script.
```

Files:

```text
src/i18n/zh-CN.ts
src/i18n/en-US.ts
scripts/check-copy-denylist.ts
package.json
```

Acceptance:

```text
npm test runs denylist check.
V2 screens pass.
No forbidden production copy.
```

---

### Phase 7 — Profile privacy/data trust

PR goal:

```text
Build Profile v2 trust surface.
Use privacy copy.
```

Files:

```text
src/screens/profile-v2/ProfileV2Screen.tsx
src/screens/profile-v2/DataTrustScreen.tsx
src/copy/privacyCopy.ts or i18n keys
```

Acceptance:

```text
Profile contains "你的数据".
Data explanation uses copy registry.
Delete item / clear data / account deletion are separated.
No fake learned preference entries.
```

---

### Phase 8 — Indoor climate P1.5

PR goal:

```text
Add telemetry/reason source support for indoor climate inference.
Do not build new UI page.
```

Files:

```text
src/types/api.ts
src/components/product/RecommendationReasonList.tsx
src/state/telemetry.ts
```

Acceptance:

```text
RecommendationReasonList supports indoor_climate_inference.
Temperature mismatch events can be sent/tracked.
UI copy does not label user as indoor-commute type.
```

---

### Phase 9 — Backlog only: Widget / Notification

Do not implement now.

Add backlog item:

```text
P2: Lock screen / notification / widget as true 0-step end state.
```

Why deferred:

```text
Privacy on lock screen
iOS/Android implementation cost
Notification fatigue
Recommendation timing complexity
```

---

## 15. Codex execution prompt

Use this prompt when handing a specific phase to Codex.

```text
You are working in U2SG/aidrobe-FE.

Follow docs:
- aidrobe-mvp-workflow-agent-responsibility-design-v0_8.md
- aidrobe-fe-refactor-spec.md
- aidrobe-privacy-data-copy-v0_1.md
- aidrobe-indoor-commute-climate-supplement-v0.1.md
- aidrobe-experience-review-memo-v0.1.md
- yiran-brand-product-direction-v0.1.md
- aidrobe-fe-redesign-codex-implementation-brief-v0.9.md

Implement only Phase <N>: <phase name>.

Hard constraints:
- Do not create a new production repo.
- Do not rename package/bundle/repo.
- Do not expose Discover as a primary V2 tab.
- Today defaults to one primary outfit only.
- Do not show safe/fast/stylish strategy rail in Today v2.
- Do not render fake outfits.
- No new hardcoded user-facing business copy.
- Use i18n/copy registry.
- Do not use body/age anxiety words like 显瘦、遮肉、减龄、中年.
- Keep changes incremental and testable.

Before coding:
1. Inspect existing files.
2. Identify reusable components.
3. List touched files.
4. Implement minimal version.
5. Add or update tests where practical.
6. Run typecheck/lint/test if available.

Return:
- Summary
- Files changed
- Behavior changed
- Tests run
- Risks / follow-up
```

---

## 16. Definition of Done for this redesign track

The redesign is not done when screens look new.  
It is done when this flow works:

```text
New user opens app
→ starts from current outfit or a few recent clothes
→ imports with minimal confirmation
→ sees first real outfit or honest slot gap
→ next morning sees one outfit, not a menu
→ can lightly override or reject
→ system learns without relying on daily check-in
→ Profile explains data in human language
```

Final acceptance:

```text
Four primary tabs: Today / Wardrobe / Ask / Profile
Discover removed from primary navigation
Today has one primary outfit
No strategy rail
Evening mode switches toward tomorrow
Late-night import asks less
Passive prompts capped
Resurface insight capped
Context override is suggestions-first
Privacy/data trust screen exists
No fake outfit
No hardcoded demo/mock copy
No body/age anxiety language
```

---

## 17. One-line implementation north star

```text
Do not build a prettier wardrobe toolbox.
Build the shortest trustworthy path from "I have clothes" to "I know what to wear today or tomorrow".
```
