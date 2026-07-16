# Aidrobe FE V2 现状差距分析（Gap Analysis）

> Historical snapshot, superseded on 2026-07-15. The status tables and old
> `BE blocked` / `file:line` evidence below are not current acceptance criteria;
> use the current code, latest OpenAPI, and `docs/qa/aidrobe-v2-internal-smoke-test-v0.1.md`.

## 2026-07-16 P0 Release 更新

旧表保留为历史审计，不再用于发布判断。`redesign/mvp-v0.8-ui@d480635e` 之后的 P0 只跟踪以下真实差距：

| P0 项 | 本轮处理 | 发布验收 |
|---|---|---|
| Feedback 真实交互 | 删除未落库备注和假「提交并换一套」；原因改为可选 | 无静默丢输入、无按钮假承诺 |
| Today/Tomorrow | refresh 携带显示中的 `target_date`，按用户 timezone 与具体日期隔离缓存；动作由服务端 capability 控制 | 明日 revision 不覆盖今日；跨 18:00/午夜重算；flag-off/额度耗尽不显示死动作 |
| 长等待与恢复 | 复用 Daily Recommendation / First Outfit Gate 与 React Query；使用诚实 AI 等待文案 | 可切 tab/离开并在返回后读取已完成结果，无伪阶段 |
| Wardrobe 50+ 正确性 | 服务端 query/category/status/season/color + filtered total + 稳定 offset 分页 | 跨页搜索、组合筛选、计数、空态可信 |
| UI 基础 | 复用既有 `ScreenContainer`、`LoadingState`、`Button`、错误/空态组件 | Safe Area、Dynamic Type、下一页失败不清空现有结果 |
| 文档漂移 | smoke 6.3 改为真实情境页；新增 P0 Release Gate 用例 | FAIL 附设备、时间、flag、request id、复现步骤 |

模型复用结论：现有 `DailyRecommendation` revision、持久化 `outfit_id`、Import task 与查询缓存足以承载 P0；不新增 Recommendation Session 或前端任务状态机。

**Version:** v0.1
**Status:** 审计成稿（只读调研，未改生产代码）
**基准分支:** `redesign/mvp-v0.8-ui`
**对照目标:** `docs/aidrobe-fe-redesign-codex-implementation-brief-v0.9.md`（Phase 0–9 + §16 Final acceptance）
**设计基准:** `docs/design/design_handoff_aidrobe_v2`（视觉+交互 SoT）、`docs/design/prototype/v2`（逐屏标注）、`aidrobe-component-spec-v0.1.md`（组件命名 SoT）
**关联文档:** `docs/engineering/aidrobe-fe-redesign-implementation-plan.md`（前瞻实施计划，本报告与之互补：计划讲「怎么做」，本报告讲「现状离目标多远、按什么顺序」）

> 方法：8 路只读代码调研，逐条对照 brief。以下结论均有 `file:line` 证据；标注 **FE 自足 / BE 阻塞** 以区分能否独立落地。

---

## 1. 执行摘要 —— 对 brief §16 Final Acceptance 的合规打分卡

| # | Final Acceptance 条目 | 现状 | 一句话现状 |
|---|---|---|---|
| 1 | 四一级 tab：Today / Wardrobe / Ask / Profile | ❌ | 现为 Today / Wardrobe / **Discover** / 我的(Settings)；Ask 藏在 Discover 内 |
| 2 | Discover 移出一级导航 | ❌ | `MainTabs.tsx:71-78` Discover 仍是一级 tab |
| 3 | Today 只给一套 | ❌ | 现有 3-strategy 策略轨 + 3 候选卡（`TodayScreen.tsx:265-303, 749-775`） |
| 4 | 无 safe/fast/stylish 策略轨 | ❌ | `StrategyRail` 已实现，默认 `'safe'`（`TodayScreen.tsx:421`） |
| 5 | 傍晚模式切向明天 | ❌ | 无时间态状态机，scene 硬编码 `'commute'`（`TodayScreen.tsx:436`） |
| 6 | 深夜导入少打扰 | ❌ | 无 `hour>=22` / confirmation budget 逻辑 |
| 7 | 被动提示频控 | ❌ | 无 PassiveWearPrompt / 频控常量 |
| 8 | Resurface insight 频控 | ❌ | 无 resurface 组件与冷却逻辑 |
| 9 | Context override 建议优先 | ❌ | 无 override bar；`guidanceText` 仅只读展示（`TodayScreen.tsx:777-790`） |
| 10 | 隐私/数据信任页存在 | ⚠️ | 仅 Settings 内 toast 说明；无「你的数据」落地页 |
| 11 | 不造假搭配 | ✅ | 后端 `insufficient_items` 驱动诚实空态，未见 fake outfit（`todayBoard.ts:20`） |
| 12 | 无 demo/mock 生产文案 | ⚠️ | 字面 denylist 词仅在注释；但 `WardrobeShowcaseEmpty.tsx:20-23`「示例衣橱」样例面（渲染 sample 单品）+ `TodayScreen.tsx:123`「local mock showcase」残留脚手架，需 Phase 6 denylist 覆盖并清理 |
| 13 | 无身材/年龄规训词 | ✅ | 未见 显瘦/遮肉/减龄/中年 |

**总览：13 条中 3 条已达标（均为「不做坏事」类红线），10 条待建。** 好消息是达标的恰是最难回收的红线（无假搭配、无违规文案），说明底盘价值观正确；待建项集中在**结构（IA/Today）与信任面（Profile）**两块。

**三块基础底座已就位，大幅降低工作量：**
- **设计 token** 与 handoff 高度对齐（颜色/圆角/间距/字号/动效时长几乎全中），只差 3 个新 token + 1 条 easing。
- **i18n** 自研 TS 方案扎实（zh-CN 源 + 类型强制 en-US 对齐 + `useT`），无需另起 registry。
- **可复用组件** 丰富（OutfitBoard、FeedbackChips FE#72、AIOrb、ConfidenceBadge、BottomSheet、analytics dispatcher），v2 多为「组合/扩展」而非「新建」。

**Discover 下所有能力都已存在**（Should-I-Buy/SenseCheck、Insights、Packing FE#73、Style Inspiration、Wardrobe Report），v2 的活是**降级 + 情境入口重新暴露**，不是新建功能。

---

## 2. Phase 0–9 逐项差距明细

图例：✅ 已达标 ｜ ⚠️ 部分/需调整 ｜ ❌ 缺失　·　落地属性：**FE 自足** ｜ **BE 阻塞**（依赖后端契约）

### Phase 0 — Docs & flag　`FE 自足`
| 项 | 现状 | 目标 | Gap |
|---|---|---|---|
| brief 归档 | ✅ 已在 `docs/` | 归档 | — |
| `ENABLE_MVP_V2_UI` flag | ❌ 无客户端 flag 机制（仅后端 503 驱动） | 单一 flag，走 `app.config.ts`→`extra` 链路 | 新增 flag + `src/lib/featureFlags.ts` 集中读取 |

> 现有实施计划 §1 已给出 flag 接入的真实链路，可直接照做。

### Phase 1 — V2 shell / IA　`FE 自足`
| 项 | 现状（file:line） | 目标 | Gap |
|---|---|---|---|
| 一级 tab | Today/Wardrobe/**Discover**/我的 `MainTabs.tsx:55-86` | Today/Wardrobe/**Ask**/Profile | 建 `MainTabsV2`；Discover 降级、Ask 升一级、Settings→Profile |
| Ask 归属 | 藏于 `DiscoverNavigator`，且 inline 未组件化（`AskAidrobeScreen`） | 一级 tab（`AskNavigator`） | ⚠️ **Ask 提级不干净落在单 Phase**：需新建 `AskNavigator` + 抽出内联 Ask 逻辑，建议作为 Phase 1 子任务点明 |
| Discover 内容 | 全部已实现于 `DiscoverHubScreen.tsx:135-165`（Packing/SenseCheck/Insights/Inspiration/Report） | 情境入口暴露 | **迁移**（非新建）：从 Wardrobe item detail / Today insight / Ask / Profile 二级入口挂载 |
| 路由类型 | `MainTabsParamList` 四 tab `navigation.ts:67-72` | 更新 tab 列表 + 情境栈 | 改类型 + 新增情境路由 |

### Phase 2 — Today mode 状态机　`FE 自足`
| 项 | 现状 | 目标 | Gap |
|---|---|---|---|
| 时间态 | 无；scene 硬编码 `'commute'`（`TodayScreen.tsx:436`）；仅 `useRemainingMinutes` 倒计时 | `todayMode.ts` 纯函数 + 测试：morning/daytime/evening/late_night/empty_or_cold_start | 全新纯函数 + 单测（无 UI 改动，**最低风险，可先行**） |

### Phase 3 — Today v2 UI　`FE 自足`（reason source 部分 BE 阻塞）
| 项 | 现状（file:line） | 目标 | Gap |
|---|---|---|---|
| 策略轨 | ✅ 存在 `StrategyRail`（`TodayScreen.tsx:265-303`） | 移除 | 删除 |
| 候选菜单 | ✅ 3 张 `CompactCandidate`（`TodayScreen.tsx:337-417, 749-775`） | 移除，只留一套 | 删除 |
| 换一套 | Refresh 兜底（`refreshTodayRecommendation` 3/日限流，`TodayScreen.tsx:470-481`） | 保留为兜底非菜单 | 语义保留、UI 收敛 |
| OutfitCanvas | ✅ `OutfitBoard`/`OutfitPiece` 平铺画布可复用（`components/outfit/`） | 复用 | 无 gap，直接用 |
| DecisionOutfitCard | ❌ 现 `OutfitCard` 为极简摘要卡 | 决策大卡 | 新建（组合 OutfitBoard + ReasonList） |
| RecommendationReasonList | ❌ reason 为纯 string | 结构化 `{text, source, referencedItemIds}` 列表 | 新组件 + **BE 阻塞**（见下） |
| reason `source` enum | ❌ `OutfitSummary.reason: string`（`api.ts:290`） | weather_rule/wardrobe_history/preference_memory/style_memory/indoor_climate_inference/llm | **BE 阻塞**：需后端返回 source；FE 先按 optional 渲染，缺失时不显示来源 |
| ContextOverrideBar | ❌ 无；guidance 只读（`TodayScreen.tsx:777-790`） | 建议优先 chips + 次要文本框 | 新建，chips 见 brief §5.4 |
| ResurfaceInsightCard | ❌ 无 | resurface 卡（占位可先） | 新建 |

### Phase 4 — First Outfit 激活　`FE 自足`
| 项 | 现状（file:line） | 目标 | Gap |
|---|---|---|---|
| 导入后落地 | 落回衣橱列表 `popToTop()`（`ImportConfirmScreen.tsx:52-59`） | 落到 First Outfit 状态屏 | 新建 `FirstOutfitScreen` + 路由改向 |
| First Outfit 状态机 | 仅后端 `TodayState=ready/insufficient_items/failed`；客户端 `todayBoard.ts` 三态 | processing/no_outfit/single_outfit/ready/failed 五态 | 客户端补 processing/single_outfit 态 |
| SlotGapEmptyState | ❌ 仅泛化 `EmptyCanvas`「cantBuild」（`TodayScreen.tsx:305-335`），无缺槽引导 | 「再加一条下装」缺槽具体化 | 新建组件（缺槽信息 BE 可给 `missingSlots`，或 FE 按品类计数推断） |
| single_outfit 隐藏换一套 | ❌ 未区分 | 单套时弱化/隐藏 swap | 状态分支 |

### Phase 5 — 深夜导入 + 频控　`FE 自足`
| 项 | 现状 | 目标 | Gap |
|---|---|---|---|
| `timeUX` / confirmation budget | ❌ 无（`utils/date.ts` 仅日期格式化） | `confirmationBudgetForImport`（22+→0, 20-22→1） | 新建 util |
| PassiveWearPrompt 频控 | ❌ 组件与逻辑均无 | 2/周、连续忽略 2 次抑制 7 天、22 点后不出 | 新建组件 + `promptFrequency` 状态 |
| ResurfaceInsight 频控 | ❌ 无 | 1/日、同件 14 天冷却、不叠加 | 集中常量 + 冷却状态 |

### Phase 6 — 文案治理　`FE 自足`
| 项 | 现状（file:line） | 目标 | Gap |
|---|---|---|---|
| i18n 底座 | ✅ 自研 TS（`i18n/{index,zh-CN,en-US,domainLabels}.ts`）+ `useT` | 沿用扩展 | **不新建 `src/copy/` registry**（brief line 731 明说别过度工程），新文案进现有 i18n |
| 硬编码文案 | ⚠️ ~68 tsx 有硬编码中文（`api/client.ts` 错误串、组件默认值、空态等） | 用户可见串进 i18n | 增量迁移，优先 `api/client.ts`、`components/feedback/*`、导航头 |
| denylist 脚本 | ❌ 无 `scripts/check-copy-denylist.ts`；`npm test` 仅回归 | 脚本 + 挂进 `npm test` | 新建脚本；顺带**清理 showcase 残留**：`WardrobeShowcaseEmpty` 示例衣橱面改用真实空态、移除 `TodayScreen.tsx:123` mock showcase 脚手架 |
| feedback reason tags | ⚠️ 现 5 个：`too_formal/too_warm/wrong_color/wrong_fit/not_my_style`（`domainLabels.ts:31-37`） | brief/handoff 要 7 个 | 补 3 个：`too_casual`(太休闲)、`too_cold`(太冷)、`just_worn`(刚穿过)；wire/label 分离机制已就位 |
| 品牌文案 | 用户可见均为「Aidrobe」，未见「衣然」 | 适当处改「衣然」 | 按需替换（不改包名/repo/API） |

### Phase 7 — Profile 隐私/数据信任　`FE 自足 + BE 阻塞`
| 项 | 现状（file:line） | 目标 | Gap | 落地 |
|---|---|---|---|---|
| Profile 屏 | ❌ 仅单一 `SettingsScreen.tsx` | Profile 主屏 + 子栈 | 新建 `profile-v2/` | FE 自足 |
| 你的数据 / 隐私说明 | ⚠️ 仅 toast（`SettingsScreen.tsx:366-368`） | 「你的衣橱，只属于你」+ 分段说明（来自 `privacy-data-copy-v0.1.md`） | 新建落地页，文案进 i18n | FE 自足 |
| 出门时间 / 语言 | ✅ 已有（`SettingsScreen.tsx:232-260`） | 保留 | — | — |
| 记忆管理（衣然记住的） | ❌ 无 UI，`UserSettings` 无该字段（`api.ts:52-58`） | 可查看/纠正/删除 learned prefs | **BE 阻塞**：无 learned-preferences 端点；brief line 701/709 明令**不造假数据**，无端点则显式标 unavailable | BE 阻塞 |
| 清空数据 | ⚠️ 空 Alert 无动作（`SettingsScreen.tsx:208-211`） | 清空全部数据（保账号） | **BE 阻塞**：无 clear-data 端点 | BE 阻塞 |
| 注销账号 / 数据导出 | ⚠️ API 已存在（`account.ts:15-28` deactivate + data-export），未接 UI | 三类操作清晰分离 | 接现有 API 即可 | FE 自足 |

### Phase 8 — 室内气候 P1.5　`FE 自足 + BE 阻塞`
| 项 | 现状 | 目标 | Gap |
|---|---|---|---|
| reason source `indoor_climate_inference` | ❌ 无 source enum | ReasonList 支持该来源 | 同 Phase 3，**BE 阻塞** |
| 温度不匹配追踪 | ❌ 仅 `WeatherBackdrop` 视觉渐变，无追踪 | 太冷(≥22°)/太热(≤10°) 事件可追踪 | analytics 有 dispatcher（`utils/analytics.ts`）可扩展事件 |
| 不给用户贴「室内通勤」标签 | ✅ 无此文案 | 保持 | — |

### Phase 9 — Widget/Notification　`Backlog`
仅记 backlog，本轮不实现。

---

## 3. 设计 token 差距（design.ts vs handoff）

**高度对齐**：颜色主色/次级/语义、radius(xs8/sm12/md16/lg20/xl24/pill999)、spacing(screen20/section24/row16/control12)、shadow(soft/elevated)、motion 时长(0/140/240/420/1600ms) 全部命中；typography 8 级齐备但 body/caption 与 handoff 有差（见下）。

**待补/待调：**
- 缺 3 个 token：`quietText` `#6B645B`、`agentGlow` `#D8B77A`、`cautionAmber` `#9A682E`
- 缺 gentle easing `cubic-bezier(.22,.61,.36,1)`（现有 standard/decelerate/accelerate 三条不含此曲线）
- `body` 现 15/21，handoff 要 **16/24**（V2 已提升）；`caption` 现 11/14，handoff 要 **12/16**
- 23 个屏有本地 palette；`TodayScreen`(`P` 对象)、`AddItemScreen`(`P` 对象) 有脱离 design.ts 的自定义色（blue/sage/clay/rail/steel 等），需收敛到语义 token（brief §13 要求不新增屏级调色板）
- reduce-motion 架构已在（`motion.ts` + `useReducedMotion`），符合要求

---

## 4. 落地顺序建议（按 FE自足优先 + 依赖排序）

原则：**纯 FE 且低风险先行；BE 阻塞项排后或先 stub 标 unavailable**；每 Phase 一个 PR，flag 后并行，旧体验始终可跑。

| 顺序 | Phase | 理由 | 落地属性 |
|---|---|---|---|
| 1 | **P0 flag** | 无行为变更，解锁并行 | FE 自足 |
| 2 | **P2 todayMode 纯函数+测试** | 零 UI 风险，可独立 review/merge，为 P3 铺路 | FE 自足 |
| 3 | **P1 V2 shell/IA** | 结构骨架，后续屏挂载依赖它；含 Ask 提级子任务 | FE 自足 |
| 4 | **P3 Today v2 UI** | 依赖 P1 shell + P2 mode；reason source 先按 optional 渲染 | FE 自足（source 部分 BE 阻塞） |
| 5 | **P4 First Outfit** | 依赖 P3 组件（DecisionOutfitCard/SlotGap） | FE 自足 |
| 6 | **P6 文案治理 + denylist** | 可与 P3/P4 并行；补 3 reason tags | FE 自足 |
| 7 | **P5 深夜导入+频控** | util + 状态，依赖 P4 导入链路 | FE 自足 |
| 8 | **P7 Profile** | FE 部分（信任页/接注销 API）先做；记忆管理/清空数据待 BE 端点 | 混合 |
| 9 | **P8 室内气候** | 依赖 P3 reason source，随 BE 契约推进 | BE 阻塞 |

**BE 契约待确认清单（建议同步推给后端）：**
1. `OutfitSummary` 增加 `reason_source`（或结构化 reason 数组）——阻塞 P3/P8
2. learned-preferences 查询/纠正/删除端点——阻塞 P7 记忆管理
3. clear-data（清空全部数据保账号）端点——阻塞 P7 清空
4. First Outfit gate 是否返回 `missingSlots`/`feasibleOutfitCount`——影响 P4 SlotGap 是否需 FE 推断

---

## 5. 需用户/团队拍板的点

1. **reason source / 记忆管理 / 清空数据** 三项 BE 契约是否本轮同步推进？若否，FE 按 optional/unavailable 降级（不造假）。
2. **Discover 降级后各能力的情境入口落点**（Should-I-Buy/Insights/Packing/灵感/报告分别从哪个二级页进）需产品确认。
3. **feedback reason tags 扩到 7 个** 的 wire value 命名需与 BE 对齐（`too_casual/too_cold/just_worn`）。

---

## 附：8 路调研覆盖
导航/IA · Today · Onboarding/导入/首套 · 组件清单 · 主题 token · i18n/文案治理 · Profile/隐私 · 状态/telemetry/频控。全部只读，未改生产代码。
