# Aidrobe FE Redesign Implementation Plan

**Version:** v0.1
**Status:** Draft
**Derived from:** `docs/product/aidrobe-mvp-workflow-agent-responsibility-design-v0.8.md`（主方案）、`docs/design/aidrobe-fe-refactor-spec.md`（refactor spec）、`docs/design/aidrobe-ui-ux-spec-v0.1.md`（流程规范）、`docs/product/aidrobe-privacy-data-copy-v0.1.md`
**Branch:** `redesign/mvp-v0.8-ui`（长期改版分支，基于 `origin/main`）
**Audience:** 前端工程

---

## 0. 策略：V2 shell 并行，不在旧 screen 上硬改

核心原则（与你的方案一致）：

```text
不开新仓 → 现仓开长期 redesign 分支
不在旧 screen 上硬改到一半 → 新建 V2 shell 并行
用 feature flag 切换，旧体验始终可跑
```

旧的 `MainTabs` / `TodayScreen` / `DiscoverNavigator` 保留可运行；V2 走新的 `*V2` / `*-v2` 命名并行推进，由 flag 切换。这样可以并行开发、随时回滚，不会把现有 App 改炸。

新功能默认 flag off，**数据/路由照常持久**——翻回 false 是干净回滚（沿用 BE 仓约定）。

---

## 1. Feature flag 接入（真实模式）

FE 现有 env 注入链路（`app.config.ts` → `extra` → `Constants.expoConfig?.extra`，见 `src/api/client.ts:20`、`src/store/devUser.ts:15`）。

新增 flag 走同一链路：

1. `app.config.ts`：
   ```ts
   const ENABLE_MVP_V2_UI = (process.env.ENABLE_MVP_V2_UI ?? 'false') === 'true';
   // ...
   extra: { APP_ENV, API_BASE_URL, DEV_USER_ID, ENABLE_MVP_V2_UI, eas: {...} }
   ```
2. 新建 `src/lib/featureFlags.ts`：集中读取 `Constants.expoConfig?.extra`，导出 `enableMvpV2Ui: boolean`。**禁止散落多处读 extra**。
3. `RootNavigator` / `MainTabs` 按 flag 选择 V1 / V2 shell。

> 单一 flag `ENABLE_MVP_V2_UI` 控总开关即可——本改版是体验系统级重构，不需要细粒度灰度（沿用「不引入灰度/白名单」默认）。

---

## 2. V2 shell 文件骨架（建议）

```text
src/core/navigation/MainTabsV2.tsx          # 四 tab：Today / Wardrobe / Ask / Profile
src/core/navigation/AskNavigator.tsx        # 新增，承接提升后的 Ask
src/screens/today-v2/TodayV2Screen.tsx
src/screens/onboarding-v2/                   # Welcome/价值前置/权限后置
src/screens/profile-v2/                      # 由 SettingsScreen 重定位
src/components/product/                       # DecisionOutfitCard 等（见 component-spec）
src/components/agent/                         # AgentThinkingState 等（见 component-spec）
src/copy/                                     # copy registry（见 §4）
```

保留旧文件不动：`MainTabs.tsx` / `TodayScreen.tsx` / `DiscoverNavigator.tsx` / `SettingsNavigator.tsx`。

---

## 3. 复用 vs 新建映射（基于真实代码）

改版**最大复用**现有工程资产（Expo/RN、React Navigation、React Query、Zustand、typed i18n、`src/theme/design.ts`、`src/components/ui` primitives）。

| 资产 | 路径 | 决策 |
|---|---|---|
| UI primitives | `src/components/ui/*`（Button/Card/Badge/Typography/BottomSheet/Skeleton/ImageThumb…） | **复用**，作为 Foundation 层 |
| Outfit 组件 | `src/components/outfit/*`、`src/components/cards/OutfitCard.tsx` | 复用/扩展为 `DecisionOutfitCard` |
| 反馈/状态 | `src/components/feedback/*`、`src/components/states/*`、`src/components/wardrobe/WardrobeShowcaseEmpty.tsx` | 复用为 EmptyState/ErrorState/Processing + `SlotGapEmptyState` |
| design tokens | `src/theme/design.ts`（已是暖中性盘 #FAF7F0/#B08D5B） | **扩展**，新增 experience tokens（见 design-language spec §9） |
| i18n | `src/i18n/*`（en-US/zh-CN/domainLabels） | 复用，补 copy registry |
| Ask screen | `src/screens/discover/AskAidrobeScreen.tsx` | **移动**到 `AskNavigator` |
| Discover 工具 screen | `src/screens/discover/{SenseCheck,PackingList*,WardrobeReport,Insights,StyleInspirations,AddInspiration}` | 复用业务逻辑，改情境入口；废弃 `DiscoverHubScreen` |
| Settings | `src/screens/settings/SettingsScreen.tsx` | 重定位为 Profile |

> 原则：能复用就复用，screen 业务逻辑尽量不重写——V2 主要改的是 IA、主路径形态、组件语义层和文案治理，不是重建工程。

---

## 4. 阶段拆分与排期

排期遵循 refactor spec §12 的 FE 重构优先级（先 IA/Today，再设计语言/learning），与主方案 §10 产品发布顺序是两个维度、配合看。每阶段一个可独立 review 的提交集。

### Phase 0 · 设计文档（本分支已进行）
- 落三份源文档（已完成）。
- 起草 `aidrobe-ui-ux-spec-v0.1.md`（本人）、`aidrobe-design-language-v0.1.md` + `aidrobe-component-spec-v0.1.md`（Codex）、本实现计划。
- **不动代码。**

### Phase 1 · V2 App Shell（P0 / IA）
- feature flag 接入（§1）。
- `MainTabsV2`：Today / Wardrobe / Ask / Profile，移除 Discover 一级 tab。
- `AskNavigator` 承接 `AskAidrobeScreen`。
- Profile 由 Settings 重定位。
- 各 V2 screen 先做导航 + 空页面骨架（Today/Wardrobe/Ask/Profile）。
- Discover 工具能力改情境入口（深链/`ContextualEntrySheet`），废弃 `DiscoverHubScreen`。

### Phase 2 · Today v2（P0）
- `TodayV2Screen`：单推荐首屏（一句话 / 一套 / 2–3 理由 / 天气）。
- 核心 CTA：穿这套 / 换一套 / 不喜欢 / 为什么。
- `ContextOverrideBar` 一句话 override；`RecommendationReasonList`；`ResurfaceInsightCard`。
- 去掉默认策略菜单（只消费 BE `confidence`）。
- 消费 Today 契约（refactor spec §11.2）。
- **不**同时做完整 Trips/Shop。

### Phase 3 · First Outfit（P0 / 激活核心）
- 导入完成即出首套（同 session），接 `AddItem/ImportConfirm` 之后。
- 可行性 Gate + State 0/1/≥2（ui-ux-spec §4.3）：`SlotGapEmptyState` / `FirstOutfitActivationCard`。
- 渐进点亮（metadata→cutout→reasoning），不白屏。
- 消费 First Outfit 契约（refactor spec §11.1）。
- 这是主方案 §4.5 不可再缩减的核心，不缩减。

### Phase 4 · Copy Governance（P0）
- 所有用户可见字符串进 i18n / copy registry（`src/copy/`）。
- 收敛：onboarding benefits / permission / departure / Today labels / Discover titles / local palette 注释 / toast / error。
- 隐私文案按 `aidrobe-privacy-data-copy-v0.1.md` 落地（衣橱归属、权限请求、第三方 AI 处理、删除注销）。
- CI 扫描 denylist（禁 demo/mock 词进生产）。

### Phase 5（P1，后续）· 设计语言 / Passive Learning / Contextual Shop
- Soft Utility token system 统一 screen palette + 组件语义层（design-language spec）。
- Telemetry 事件标准化 + 弱信号 contract（refactor spec §10）。
- Should-I-Buy 降级 + Trips 在 Ask 内一句话支持。

---

## 5. FE/BE 契约依赖

V2 主路径依赖以下 BE 契约（refactor spec §11）。需与 BE（`U2SG/aidrobe-BE`）对齐，缺失项列为阻塞：

| 契约 | 用于 | 状态 |
|---|---|---|
| First Outfit / Cold Start（§11.1） | Phase 3 状态机 | 待确认 BE 是否已返回 `state`/`missing_slots`/`gate_failures` |
| Today（§11.2） | Phase 2 单推荐 + `confidence` | 待确认 `confidence`/`resurface_insight` 字段 |
| Passive Learning（§11.3） | Phase 5 telemetry | 待新增事件上报端 |
| Copy/Reasoning source 标注（§11.4） | Phase 2 reason `source` | 待确认 reasoning 是否带 `source`/`referenced_item_ids` |

> 行动项：Phase 2/3 开工前先核对 BE 当前响应是否已含上述字段；缺则在 BE 仓提对齐 issue，FE 侧先按契约 mock，不阻塞 shell 推进。

---

## 6. 验证与风险

### 验证
- 体验闭环验收以 ui-ux-spec §6 为准（非「页面做完」）。
- Web（Expo Web / RN-web）+ 真机走查；窄屏 360dp 不穿模。
- `tsc`（`noUncheckedIndexedAccess`）+ lint + 现有 regression test script；FE 验证交 GitHub CI（本地慢）。

### 风险
- **双体验维护成本**：flag 并行期 V1/V2 共存，bugfix 注意只改活跃分支；改版稳定后删 V1 旧 screen。
- **First Outfit 延迟/成本**：同 session 串 Qwen-VL+cutout+LLM，必须渐进点亮，否则首启体验崩。
- **契约 drift**：FE/BE 契约未定前用 mock，但要尽早对齐，避免 Phase 2/3 返工。
- **复用边界**：Discover 工具 screen 改入口时只动路由，不重写业务，避免顺手重构扩大改动面。

---

## 7. 提交/分支约定

- 本改版全程在 `redesign/mvp-v0.8-ui` 长期分支。
- 每个 Phase 一个可独立 review 的提交集；commit/push 等显式指令。
- 文档、规划、产物不进生产 commit（本批文档可单独 commit 锁 baseline）。
- 分支/commit 语义化，不带编号、不写署名。
