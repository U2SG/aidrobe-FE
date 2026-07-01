# Aidrobe UI/UX Spec

**Version:** v0.1
**Status:** Draft
**Derived from:** `docs/product/aidrobe-mvp-workflow-agent-responsibility-design-v0.8.md`（主方案）、`docs/design/aidrobe-fe-refactor-spec.md`（工程伴随文档）、`docs/product/aidrobe-privacy-data-copy-v0.1.md`（隐私/信任文案）
**Audience:** 前端 / 产品 / 设计
**Companion specs:** `aidrobe-design-language-v0.1.md`（设计语言/token）、`aidrobe-component-spec-v0.1.md`（组件体系）、`docs/engineering/aidrobe-fe-redesign-implementation-plan.md`（落地排期）

---

## 关于本文档

本文档是 V2 改版的**体验流程规范**：把主方案的产品意图和 refactor spec 的 IA/Today/Onboarding/Import 方向，落成可实现的屏幕级流程与状态机。

分工边界：

- 本文档**是**：IA 映射、Today v2 流程、Onboarding v2 流程、Import → First Outfit 流程、First Outfit 状态机、屏幕级改动清单、体验验收。
- 本文档**不是**：设计 token / 色值（见 `aidrobe-design-language-v0.1.md`）、组件 props/状态（见 `aidrobe-component-spec-v0.1.md`）、产品 why / 用户模型（见主方案）、落地排期（见 implementation plan）。

所有产品判断以主方案为准；所有用户可见信任文案以 `aidrobe-privacy-data-copy-v0.1.md` 为准，本文档只引用、不重写。

---

## 0. 现状基线（真实代码）

当前一级导航在 `src/core/navigation/MainTabs.tsx`：

| Tab | route | navigator | 主要 screen |
|---|---|---|---|
| 今日 | `TodayTab` | `TodayNavigator` | `TodayScreen` / `OutfitDetailScreen` / `OutfitCalendarScreen` / `FeedbackSheetScreen` / `OutfitPlanPickerScreen` / `OotdPosterScreen` |
| 衣橱 | `WardrobeTab` | `WardrobeNavigator` | `WardrobeListScreen` / `AddItemScreen` / `ImportConfirmScreen` / `ImportFailureScreen` / `ItemDetailScreen` |
| 发现 | `DiscoverTab` | `DiscoverNavigator` | `DiscoverHubScreen` / `InsightsScreen` / `WardrobeReportScreen` / `PackingListScreen` / `PackingListDetailScreen` / `CreatePackingListScreen` / `SenseCheckScreen` / `StyleInspirationsScreen` / `AddInspirationScreen` / `AskAidrobeScreen` |
| 我的 | `SettingsTab` | `SettingsNavigator` | `SettingsScreen` |

Onboarding（`src/core/navigation/OnboardingNavigator.tsx`，由 `RootNavigator` 在 `onboardingCompleted=false` 时挂载）：`WelcomeScreen` / `PermissionScreen` / `DepartureTimeScreen`。

关键观察（与 refactor spec §1 一致）：
- `AskAidrobeScreen` 被埋在 `DiscoverNavigator` 内，不是一级入口。
- `DiscoverHubScreen` 是一个工具箱聚合页，把 Insights / Report / Packing / SenseCheck(Should-I-Buy) / StyleInspirations 平铺为并列工具。
- Today 仍承载多候选 + 计划 + 日历等二级能力在主路径上（`OutfitPlanPickerScreen` / `OutfitCalendarScreen`）。

---

## 1. 新 IA Spec

一级入口冻结为四个（refactor spec §2）：

```text
Today / Wardrobe / Ask / Profile
```

### 1.1 Tab 映射（current → target）

| 目标 Tab | 来源 | 动作 |
|---|---|---|
| Today | 现 `TodayTab` | 保留，Today 主页重做为单推荐（见 §2） |
| Wardrobe | 现 `WardrobeTab` | 保留，作为数据底座，不抢主路径 |
| **Ask** | 现 `DiscoverNavigator` 内的 `AskAidrobeScreen` | **提升为一级 tab**，新增 `AskNavigator` |
| **Profile** | 现 `SettingsTab` / `SettingsNavigator` | 改名/重定位为 Profile：账号、隐私、语言、出门时间、数据说明 |
| ~~Discover~~ | 现 `DiscoverTab` | **取消一级 tab**；其下能力转情境入口（见 §1.2） |

V2 tab 顺序：`Today · Wardrobe · Ask · Profile`。

### 1.2 Discover 能力去向（情境入口，不做一级 tab）

refactor spec §2.5：这些能力高意图时出现，不每天占注意力。

| 现 Discover 内能力 | 现 screen | V2 去向（情境触发点） |
|---|---|---|
| Should-I-Buy / 单品参谋 | `SenseCheckScreen` | 分享商品链接到 Aidrobe；`ItemDetailScreen` 内发起；Ask 内一句话 |
| Trips / Packing | `PackingListScreen` / `PackingListDetailScreen` / `CreatePackingListScreen` | Ask 内说旅行需求触发 |
| Wardrobe Health / 报告 | `WardrobeReportScreen` | Today insight 提示 / Wardrobe 内入口 |
| Insights | `InsightsScreen` | Today 下方 resurface insight + Wardrobe 内入口 |
| Style Inspiration | `StyleInspirationsScreen` / `AddInspirationScreen` | Onboarding 可选 style memory + Profile 内管理 |
| `DiscoverHubScreen`（聚合页） | — | **废弃**，不再有工具箱聚合首页 |

落地策略见 implementation plan：这些 screen 组件**保留复用**，只是改变进入路径（从 tab 聚合页 → `ContextualEntrySheet` / 深链），不重写业务逻辑。

### 1.3 各一级入口职责

- **Today**：唯一主入口，早晨 decision automation。给一套 / 解释为什么 / 换一套 / 轻反馈 / 轻 insight / 一句话 override。不是推荐列表，不是策略选择器。
- **Wardrobe**：数据底座。导入 / 查看 / 轻编辑 / 找回忘了的衣服。
- **Ask**：特殊场景入口。一句话改今天推荐 / 特殊场合 / focused item 搭配 / 旅行 / 购物 / 临时约束。
- **Profile**：账号、隐私、语言、出门时间、数据说明。不放复杂 agent 设置。隐私/数据说明文案取自 `aidrobe-privacy-data-copy-v0.1.md`。

---

## 2. Today v2 流程

从「策略切换 + 多候选」改成「单一可信推荐」（refactor spec §4）。

### 2.1 首屏（Above the Fold）

只展示：
```text
今日一句话 / 一套真实 outfit / 2–3 条真实理由 / 天气 / 时间的轻提示
```

核心 CTA：`穿这套 · 换一套 · 不喜欢 · 为什么`

**不**默认展示：safe/fast/stylish 三个策略；多套候选卡；报告/日历/购物/packing 入口。这些都降为二级或情境入口。

> safe/clever 不是给用户的开关，而是后台按 wardrobe 规模/置信度切换的 ranking policy（主方案 Workflow 0/3）。FE 只消费 BE 返回的 `confidence`，不暴露策略轨道。

### 2.2 一句话 Context Override

轻输入「今天有什么特别的吗？」——用户不填也完全可用。示例：今天有会 / 想舒服一点 / 不想穿裙子 / 要走很多路 / 想低调一点。不是完整 chatbot。提交后刷新当日推荐。

对应组件 `ContextOverrideBar`（component-spec）。事件 `context_override_submitted`（refactor spec §10）。

### 2.3 Reasoning

理由只来自真实上下文（天气 / 衣物 / 最近穿着 / 偏好 / 风格学习 / 场景 / 未穿衣物），禁止模板化泛泛理由。每条理由带 `source` 标注（refactor spec §11.4）。组件 `RecommendationReasonList`。

### 2.4 Resurface Insight

首屏下方一条轻 insight（留存钩子，主方案 Workflow 8）：例「这件你很久没穿了，今天刚好合适。」点击进入对应 item。组件 `ResurfaceInsightCard`，事件 `resurface_insight_viewed` / `resurface_item_opened`。

### 2.5 Today 二级路径（保留但下沉）

`OutfitDetailScreen`（搭配详情）、`OutfitCalendarScreen`（日历）、`OutfitPlanPickerScreen`（计划）、`OotdPosterScreen`（海报）、`FeedbackSheetScreen`（反馈）保留，但不在首屏 CTA 暴露——通过 outfit 详情 / 长按 / 二级菜单进入。

### 2.6 Today FE/BE 契约

消费 refactor spec §11.2：
```json
{ "primary_outfit": {}, "can_swap": true, "reasons": [], "resurface_insight": {}, "context": {}, "confidence": "safe | normal | exploratory" }
```

---

## 3. Onboarding v2 流程

原则（refactor spec §5）：**先让用户感到有价值，再让用户配置。**

推荐流程：
```text
1. Welcome：今天，穿成喜欢的自己
2. Add First Wardrobe：先加几件常穿的
3. Import Confirm：只确认明显错误
4. First Outfit：导入完成即出首套（同 session）
5. Optional Style Memory：给一张喜欢的风格图，可跳过
6. Departure Time / Location：只在需要时轻问
```

### 3.1 权限后置

权限请求后置到动作触发时：点拍照 → 请求相机；点相册 → 请求相册；要天气 → 请求定位。不在看到价值前集中索要权限。每个权限 rationale 文案取自 `aidrobe-privacy-data-copy-v0.1.md` C 节。

> 现状：`PermissionScreen` + `DepartureTimeScreen` 是 onboarding 中前置的集中索权/配置步骤。V2 中这两步**降级**——Permission 拆成动作触发时的 inline rationale，DepartureTime 移到「需要时轻问」或 Profile。

### 3.2 与现状的差异

| 步骤 | 现状 | V2 |
|---|---|---|
| Welcome | `WelcomeScreen`（产品说明） | 保留，文案改为情感开场，进 i18n |
| 集中权限 | `PermissionScreen` | 拆为动作触发 inline rationale |
| 出门时间 | `DepartureTimeScreen`（前置） | 后置到需要时 / Profile |
| 加衣物 | onboarding 后才进 Wardrobe | onboarding 内即导入第一批 |
| First Outfit | 次日才见 Today | 导入完成同 session 出首套 |

---

## 4. Import → First Outfit 流程

导入不是「全量录入」，而是「先抓在穿的 + 捞忘了的」（主方案 Workflow 1）。导入完成后**不停留在「已保存」**，而是进入 First Outfit——导入即激活。

### 4.1 导入入口

UI 支持（refactor spec §6）：平铺连拍 / 多图批量 / 相册穿搭照反向提取 / 商品链接 / 分享文案 / 订单邮件小票（后续）。现有 `AddItemScreen` / `ImportConfirmScreen` / `ImportFailureScreen` 复用。

### 4.2 渐进点亮（工程现实）

导入即出首套意味着同 session 串 Qwen-VL + cutout + LLM reasoning，是一笔延迟/成本承诺（主方案 Workflow 0）。FE 要点：
- 分阶段点亮：先 metadata/缩略图，再补 cutout，再补 reasoning。
- loading/渐进展示，**不要白屏等全部算完**。
- 对应 `ProcessingOverlay` / `ProcessingState` / `Skeleton` 复用。

### 4.3 First Outfit 状态机

消费 refactor spec §11.1 的 `state`：

| state | feasible_outfit_count | UI |
|---|---|---|
| **State 0** `no_outfit` | 0 | `SlotGapEmptyState`：明确告诉缺哪些 slot（`missing_slots`），引导补衣物。不展示假 outfit。 |
| **State 1** `single_outfit` | 1 | `FirstOutfitActivationCard`：展示唯一可行首套 + 激活动作。 |
| **State ≥2** `ready` | ≥2 | 正常 Today 单推荐体验（§2）。 |

契约（refactor spec §11.1）：
```json
{ "state": "no_outfit | single_outfit | ready", "feasible_outfit_count": 0, "missing_slots": ["bottom"], "first_outfit": null, "reasoning": [], "gate_failures": ["missing_bottom", "image_unavailable"] }
```

`gate_failures` 用于「可行性 Gate」：宁可显示明确 slot gap，也不显示 fake outfit / blank image。

事件：`first_outfit_generated` / `first_outfit_failed_gate` / `import_batch_completed`。

---

## 5. 屏幕级改动清单

| screen | 动作 | 说明 |
|---|---|---|
| `MainTabs.tsx` | 重做 → `MainTabsV2` | 四 tab：Today/Wardrobe/Ask/Profile；feature flag 切换（见 impl plan） |
| `TodayScreen` | 重做 → Today v2 | 单推荐 + override + reason + resurface；去策略轨道/多候选 |
| `AskAidrobeScreen` | 提升 | 移出 Discover，挂 `AskNavigator` 一级 |
| `SettingsScreen` | 重定位 → Profile | 账号/隐私/语言/出门时间/数据说明 |
| `DiscoverHubScreen` | 废弃 | 不再有工具箱聚合首页 |
| `SenseCheckScreen` | 复用，改入口 | 转商品链接分享 / item detail 情境入口 |
| `PackingList*Screen` | 复用，改入口 | 转 Ask 内旅行触发 |
| `WardrobeReportScreen` / `InsightsScreen` | 复用，改入口 | 转 Today insight / Wardrobe 内入口 |
| `StyleInspirationsScreen` / `AddInspirationScreen` | 复用，改入口 | 转 onboarding 可选 + Profile 管理 |
| `WelcomeScreen` | 文案重做 | 情感开场，进 i18n |
| `PermissionScreen` | 拆解 | 动作触发 inline rationale |
| `DepartureTimeScreen` | 后置 | 需要时 / Profile |
| `Add/ImportConfirm/ImportFailure` | 复用 | 导入完成接 First Outfit |

> 代码策略：V2 屏幕走新 `*-v2` 命名 + feature flag 并行，不在旧 screen 上硬改到一半（详见 implementation plan）。

---

## 6. 体验验收标准

不以「页面都做完」验收，而以体验闭环验收（refactor spec §13）：

```text
新用户 1 分钟内能导入第一批衣物
导入完成当场看到首套或明确 slot gap
Today 默认只给一套
用户不需要在三套里继续选
用户能一句话修改今天需求
Should-I-Buy 不再占一级入口
Discover 工具箱不再作为主导航
所有用户可见文案可治理
无 fake outfit / no blank image / no hardcoded demo copy
```
