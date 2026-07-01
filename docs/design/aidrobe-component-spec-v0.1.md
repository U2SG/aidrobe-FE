# Aidrobe Component Spec

**Version:** v0.1  
**Status:** Draft  
**Derived from:**
- `docs/product/aidrobe-mvp-workflow-agent-responsibility-design-v0.8.md`
- `docs/design/aidrobe-fe-refactor-spec.md`
- `docs/design/aidrobe-ui-ux-spec-v0.1.md`
- `docs/engineering/aidrobe-fe-redesign-implementation-plan.md`
- `docs/product/aidrobe-privacy-data-copy-v0.1.md`

---

## 0. 目的与边界

本规范定义 Aidrobe V2 的 Foundation / Product / Agent 三层组件系统，以及 Today、Onboarding、Import → First Outfit 主路径的组合方式。

本规范对 `docs/design/aidrobe-design-language-v0.1.md` 中 A/B/C 三种候选风格保持无感：

```text
组件消费 semantic / experience tokens；
组件不硬编码候选 palette、字体、圆角、阴影或风格名。
```

最终风格切换只发生在 token 层。组件状态、信息层级、可访问性和业务语义不得随皮肤变化。

### 0.1 三层职责

| 层级 | 职责 | 禁止事项 |
|---|---|---|
| Foundation | 通用形态、输入、布局、反馈与无障碍基础 | 不理解 outfit、memory、confidence 等业务语义 |
| Product | 封装一个明确 workflow 片段 | 不直接决定 Agent 策略，不把 API 契约散落到 screen |
| Agent | 表达思考、记忆、置信度、兜底与提问 | 不伪装确定性，不暴露内部 prompt、模型或 ranking policy |

### 0.2 统一 API 原则

- 组件接收稳定 enum、结构化数据和回调，不接收页面级 palette。
- 静态文案由调用方通过 i18n / copy registry 解析后传入；组件不提供中文默认值。
- LLM/API reasoning 作为动态内容传入，必须同时携带 `source`，并与静态 fallback copy 分层。
- 异步组件统一暴露 `idle / loading / success / error` 或领域状态，禁止用多个互相冲突的布尔值表达同一状态。
- 触控区域至少 `44 × 44`；动态字体放大时允许换行和增高。
- 图片必须覆盖 `loading / empty / failed / loaded`，不得用空白色块伪装已加载。

---

## 1. Foundation Components

现有 primitives 是 V2 的基础，不重建一套平行组件库。

| Component | 当前实现 | V2 决策 | 备注 |
|---|---|---|---|
| `Typography` | `src/components/ui/Typography.tsx` | **REUSE existing** | 继续映射 `src/theme/design.ts` 的 `type`；落实正文与 caption 的 V2 最小字号 |
| `Button` | `src/components/ui/Button.tsx` | **EXTEND existing** | 已覆盖 variant、loading、disabled 与前景色保护；补完整无障碍状态，形态只读 token |
| `Card` | `src/components/ui/Card.tsx` | **EXTEND existing** | 已覆盖 pressable、border、surface；默认 radius/shadow 随最终 token 变化，不在组件锁死风格 |
| `Badge` | `src/components/ui/Badge.tsx` | **REUSE existing** | 用于通用语义标签；Agent 置信度由专用组件包装 |
| `ImageThumb` | `src/components/ui/ImageThumb.tsx` | **REUSE existing** | 已统一四种图片状态与重试，是衣物图片的默认 primitive |
| `Skeleton` | `src/components/ui/Skeleton.tsx` | **REUSE existing** | Import 渐进点亮与 Today 切换使用；遵守减少动态效果偏好仍需补齐 |
| `EmptyState` | `src/components/feedback/EmptyState.tsx`，由 `src/components/states/EmptyState.tsx` 重导出 | **EXTEND existing** | 形态保留；领域缺槽由 `SlotGapEmptyState` 包装 |
| `ErrorState` | `src/components/feedback/ErrorState.tsx`，由 `src/components/states/ErrorState.tsx` 重导出 | **EXTEND existing** | 移除组件内默认中文文案；由 copy registry 提供 title/description/retry label |
| `BottomSheet` | `src/components/ui/BottomSheet.tsx` | **EXTEND existing** | 作为 `ContextualEntrySheet` 与权限 rationale 的 shell；补 focus、关闭语义与安全区验收 |
| `Input` | `src/components/ui/Input.tsx` | **REUSE existing** | `ContextOverrideBar` 的文字输入基础 |
| `EditableChip` | `src/components/ui/EditableChip.tsx` | **REUSE existing** | Import Confirm 的低置信度字段确认；已组合 `ConfidenceBadge` |
| `OptionPickerSheet` | `src/components/ui/OptionPickerSheet.tsx` | **REUSE existing** | 低置信度 metadata 的轻编辑，不进入完整表单 |
| `AIOrb` | `src/components/ui/AIOrb.tsx` + `src/components/ui/SiriOrb.tsx` | **EXTEND existing** | 用作 Agent 存在感；底层仅有 `ink/vivid` palette，最终色由 `agentGlow` 对齐 |
| `StatusPill` | `src/components/ui/StatusPill.tsx` | **EXTEND existing** | 移除默认硬编码中文；状态不得仅靠颜色表达 |
| `OperationBanner` | `src/components/feedback/OperationBanner.tsx` | **EXTEND existing** | 可复用异步状态形态；移除默认硬编码文案 |

Foundation 的颜色只来自 `src/theme/design.ts`、`src/theme/glass.ts`；动效只来自 `src/theme/motion.ts`。NativeWind 使用时必须走 `tailwind.config.js` 中对应语义映射。

---

## 2. Product Components

### 2.1 总览

| Component | Purpose | Key props / states | 消费的 design-language tokens | 复用判定与代码依据 |
|---|---|---|---|---|
| `DecisionOutfitCard` | Today 首屏只呈现一套可信推荐及核心动作 | `outfit`、`canSwap`、`confidence`、`onAccept`、`onSwap`、`onDislike`、`onExplain`；`loading / ready / swapping / error` | `decisionSurface`、`textPrimary`、`quietText`、`softAccent`、`borderSubtle`、`radius.*`、`shadow.*` | **EXTEND existing** `src/components/cards/OutfitCard.tsx`；复用 `Card/Button/Badge`，移除其 `safe/fast/stylish` 展示与硬编码 CTA，组合 `OutfitCanvas` |
| `OutfitCanvas` | 在统一画布内展示真实衣物组合，支持 metadata → cutout 渐进点亮 | `pieces`、`stage`、`onItemPress`；`metadataReady / cutoutPending / ready / imageFailed` | `warmSurface`、`decisionSurface`、`borderSubtle`、`radius.*`、`motion.*` | **EXTEND existing** `src/components/outfit/OutfitBoard.tsx` + `OutfitPiece.tsx`；将 `BOARD_WASH #EEF3F1` 改为 token，图片失败接 `ImageThumb` 语义 |
| `RecommendationReasonList` | 展示 2–3 条真实、可追溯的推荐理由 | `reasons: {text, source, referencedItemIds}[]`、`expanded`、`onExpand`、`onItemPress`；`collapsed / expanded / empty` | `textPrimary`、`quietText`、`softAccent`、`borderSubtle` | **NEW** 产品语义层；复用 `Typography` 与 `src/components/wardrobe/ItemRefsRow.tsx`，不复用 `OutfitCard.reason` 的单字符串模型 |
| `ContextOverrideBar` | 用一句话修改今天约束，不变成完整聊天界面 | `value`、`placeholder`、`suggestions`、`onChange`、`onSubmit`；`idle / focused / submitting / error / disabled` | `warmSurface`、`decisionSurface`、`textPrimary`、`quietText`、`softAccent`、`borderStrong`、`radius.*` | **NEW** 产品组合；复用 `src/components/ui/Input.tsx`、`Button.tsx`，不新增独立输入 primitive |
| `FeedbackChipGroup` | 一键接受或反馈不合适原因，稳定 enum 与本地化 label 分离 | `outfitId`、`options`、`selected`、`onSelect`；`idle / submitting / submitted / error` | `decisionSurface`、`softAccent`、`textPrimary`、`quietText`、`trustGreen`、`cautionAmber`、`radius.pill` | **EXTEND existing** `src/components/feedback/RecommendationFeedback.tsx` + `feedbackChips.ts`；保留 enum→API 映射和 i18n，扩展「先不喜欢、再原因」两段式状态 |
| `ResurfaceInsightCard` | Today 下方轻量提示被遗忘但适合今天的衣物 | `insight`、`item`、`onPress`、`onDismiss?`；`ready / unavailable` | `warmSurface`、`quietText`、`softAccent`、`borderSubtle`、`radius.*` | **NEW** 产品语义层；复用 `Card`、`ImageThumb`、`Typography`，衣物打开行为沿用 wardrobe item 路由 |
| `FirstOutfitActivationCard` | 导入完成后在同一 session 展示唯一可行首套并完成激活 | `outfit`、`reasons`、`processingStage`、`onAccept`、`onSwap?`；`metadata / cutout / reasoning / ready / error` | `decisionSurface`、`morningBackground`、`agentGlow`、`quietText`、`trustGreen`、`radius.*`、`motion.*` | **NEW** workflow 组件；内部复用 `DecisionOutfitCard`、`OutfitCanvas`、`Skeleton`，不复制一套 outfit card |
| `SlotGapEmptyState` | State 0 明确说明缺少哪些 slot，并给下一步；绝不展示假 outfit | `missingSlots`、`gateFailures`、`onAdd`、`onRetry?`；`actionable / processing / blocked` | `morningBackground`、`warmSurface`、`textPrimary`、`quietText`、`cautionAmber`、`borderSubtle` | **EXTEND existing** `src/components/feedback/EmptyState.tsx` 与 `src/components/wardrobe/WardrobeShowcaseEmpty.tsx`；后者的示例衣橱与硬编码文案不进入 V2 缺槽状态 |
| `StyleMemoryCard` | Onboarding 可选添加一张喜欢的风格图，并说明系统记住了什么 | `image`、`memorySummary`、`onAdd`、`onReplace`、`onSkip`、`onRemove`；`empty / uploading / processing / remembered / error` | `warmSurface`、`decisionSurface`、`quietText`、`softAccent`、`trustGreen`、`agentGlow` | **NEW** 产品语义层；复用 `Card`、`ImageThumb`、`OperationBanner`，管理入口对齐现有 `StyleInspirationsScreen` / `AddInspirationScreen` |
| `PassiveWearPrompt` | 偶尔轻问「昨天那套穿了吗」，补充弱信号而不形成打卡负担 | `outfitRef`、`options`、`onAnswer`、`onDismiss`；`idle / submitting / answered / dismissed` | `warmSurface`、`quietText`、`softAccent`、`trustGreen`、`radius.*` | **NEW** 产品语义层；复用 `Card`、`Button` 或 chip 形态；事件必须标记为 explicit，不能把未回答当否定 |
| `WardrobeImportDock` | 汇总拍照、相册、批量导入、链接等入口，并承载导入进度 | `actions`、`selectedCount`、`progress`、`onCancel`；`idle / selecting / uploading / processing / partialFailure / complete` | `decisionSurface`、`warmSurface`、`textPrimary`、`quietText`、`softAccent`、`cautionAmber`、`shadow.elevated` | **EXTEND existing** `src/components/ui/BulkActionBar.tsx`、`src/components/feedback/SaveBar.tsx`、`Button.tsx`；业务动作由新 wrapper 定义 |
| `ContextualEntrySheet` | 从 Today/Wardrobe/Ask 情境进入 Should-I-Buy、Trips、Insights 等二级能力 | `visible`、`context`、`entries`、`onSelect`、`onClose`；`idle / loading / empty / error` | `decisionSurface`、`warmSurface`、`textPrimary`、`quietText`、`softAccent`、`glass.scrim`、`radius.*`、`shadow.elevated` | **EXTEND existing** `src/components/ui/BottomSheet.tsx`；选项形态可复用 `OptionPickerSheet.tsx`，但不复制 Discover 工具箱首页 |

### 2.2 `DecisionOutfitCard`

结构顺序冻结为：

```text
今日一句话
→ OutfitCanvas
→ RecommendationReasonList（2–3 条）
→ 主动作「穿这套」
→ 次动作「换一套 / 不喜欢 / 为什么」
```

约束：

- 不显示 `safe / fast / stylish` 策略标签。`confidence: safe | normal | exploratory` 是后台 ranking policy 的输出信号，不是用户开关。
- 主卡只有一套 outfit；切换时保留原布局并使用 Skeleton/渐进替换，不白屏。
- `canSwap=false` 时保留解释与反馈能力，并用可治理文案说明，不渲染不可用按钮。
- `OutfitCard.tsx` 当前的 `VARIANT_LABEL`、`今天穿这套`、`item` fallback 均为硬编码，扩展时必须移入 registry 或领域标签映射。

### 2.3 `OutfitCanvas`

`OutfitCanvas` 接受真实衣物引用，不接受为了填满画布而生成的虚构图片。渲染规则：

| 阶段 | 表达 |
|---|---|
| metadata 已完成 | 显示已识别名称/类别与 Skeleton，不展示空白块 |
| thumbnail 已完成 | 显示真实缩略图 |
| cutout 处理中 | 保持缩略图，局部渐进替换 |
| cutout 已完成 | 进入完整画布布局 |
| 图片失败 | 显示可理解的 fallback + retry，不伪装成功 |

动画复用 `src/theme/motion.ts`，并遵守减少动态效果。`OutfitPiece.tsx` 当前 `520ms` 与 `70ms` stagger 应迁移到 motion token，不保留局部时长。

### 2.4 `RecommendationReasonList`

数据契约对齐 refactor spec §11.4：

```ts
type RecommendationReason = {
  text: string;
  source: 'weather_rule' | 'wardrobe_history' | 'preference_memory' | 'style_memory' | 'llm';
  referencedItemIds: string[];
};
```

规则：

- `text` 回答「为什么是这套 / 为什么适合今天 / 为什么像我」，不显示泛泛模板。
- `source` 用于可追溯性、埋点与审计；是否对用户显示来源标签由产品 copy 决定。
- `referencedItemIds` 有值时可用 `ItemRefsRow` 展示真实衣物；无有效引用时不显示空 row。
- reasoning 缺失时使用 registry 中的诚实 fallback，不由组件编造理由。

### 2.5 `FeedbackChipGroup`

交互分两层：

```text
第一层：穿这套 / 换一套 / 不喜欢
第二层（仅点不喜欢后）：太正式 / 太休闲 / 太热 / 太冷 / 颜色不喜欢 / 不像我 / 刚穿过
```

稳定 enum 发给 API，本地化 label 只用于展示。沿用 `feedbackChips.ts` 的原则，禁止把中文 label 当 wire value。失败后保留当前选择并允许重试，不重复 toast。

### 2.6 First Outfit 三状态

| BE state | 产品组件 | 必须行为 |
|---|---|---|
| `no_outfit` | `SlotGapEmptyState` | 展示 `missing_slots` 与可执行补件动作；不展示假 outfit |
| `single_outfit` | `FirstOutfitActivationCard` | 展示唯一可行首套；不可伪造「换一套」 |
| `ready` | `DecisionOutfitCard` | 进入 Today 单推荐体验 |

`gate_failures` 只映射为用户能行动或理解的状态。内部错误码不直接显示；未知错误进入集中 fallback copy。

---

## 3. Agent Components

Agent 组件表达系统状态，不拟人化夸大能力，也不把弱推断说成事实。

| Component | Purpose | Key props / states | 消费的 design-language tokens | 复用判定与代码依据 |
|---|---|---|---|---|
| `AgentThinkingState` | 表达识别、生成、推理中的可见进度 | `stage`、`title`、`detail`、`progress?`、`cancelable?`；`recognizing / cuttingOut / reasoning / retrying` | `morningBackground`、`agentGlow`、`quietText`、`motion.*`、`glass.*` | **EXTEND existing** `src/components/states/LoadingState.tsx`、`ProcessingState.tsx`、`src/components/feedback/ProcessingOverlay.tsx` 与 `AIOrb.tsx`；增加结构化 stage，不复制 loading 视觉 |
| `AgentMemoryNotice` | 告知「记住了什么」、为什么有用，并提供查看/纠正/删除入口 | `memoryType`、`summary`、`source`、`onReview`、`onCorrect`、`onDelete`；`learned / corrected / removed / unavailable` | `warmSurface`、`agentGlow`、`quietText`、`trustGreen`、`borderSubtle` | **NEW** Agent 语义层；形态复用 `Card`/`OperationBanner`，没有可直接复用的现有 memory 组件 |
| `AgentConfidenceNotice` | 用可理解方式表达低/中/高置信度及下一步，不暴露原始模型细节 | `level` 或 `score`、`context`、`onConfirm`、`onChange`；`low / medium / high / unknown` | `warmSurface`、`quietText`、`cautionAmber`、`trustGreen`、`softAccent` | **EXTEND existing** `src/components/ui/ConfidenceBadge.tsx`；保留 score→tone 阈值，增加解释与动作，不把 badge 当完整 notice |
| `AgentFallbackNotice` | 数据不足、图片失败或服务不可用时给诚实兜底和恢复动作 | `reasonCode`、`message`、`actions`、`onRetry?`；`insufficientData / imageFailure / offline / serviceError / noAlternative` | `warmSurface`、`quietText`、`cautionAmber`、`danger`、`borderStrong` | **EXTEND existing** `src/components/feedback/OperationBanner.tsx`、`ErrorState.tsx`、`InlineRetry.tsx`；由领域 wrapper 选择呈现层级 |
| `AgentQuestionCard` | 仅在无法可靠推断时轻问一个高价值问题 | `questionId`、`prompt`、`options`、`allowSkip`、`onAnswer`、`onSkip`；`idle / answering / answered / skipped / error` | `decisionSurface`、`textPrimary`、`quietText`、`softAccent`、`cautionAmber`、`radius.*` | **NEW** Agent 语义层；复用 `Card`、`Button`、`EditableChip`/chip 形态，禁止演变成配置表 |

### 3.1 Agent 状态表达规则

- `AgentThinkingState` 只在等待值得被感知时出现；行级请求继续使用轻量 Skeleton/Spinner。
- `AgentMemoryNotice` 必须提供用户控制入口。偏好、生活阶段或合身相关推断可查看、可纠正、可清空。
- `AgentConfidenceNotice` 的低置信度表示「请确认」，不是「系统失败」；使用 `cautionAmber`，不使用危险红。
- `AgentFallbackNotice` 不伪造 outfit、理由或图片。数据不足时明确缺什么、下一步是什么。
- `AgentQuestionCard` 一次只问一个问题，允许跳过；能推断就不问。
- `AIOrb` 是状态辅助，不是唯一状态指示；减少动态效果开启时仍有文本与静态形态。

---

## 4. Flow Composition

### 4.1 Today v2

```text
ScreenContainer
└─ ContextOverrideBar
└─ DecisionOutfitCard
   ├─ OutfitCanvas
   ├─ RecommendationReasonList
   └─ FeedbackChipGroup（按动作展开）
└─ ResurfaceInsightCard（最多一条）
└─ PassiveWearPrompt（仅偶发、符合触发条件时）
```

状态映射：

| 场景 | 组件 |
|---|---|
| 首次加载 | `DecisionOutfitCard` skeleton；长等待才升级为 `AgentThinkingState` |
| 换一套 | 保留卡片结构，画布局部 loading |
| 无可行 outfit | `SlotGapEmptyState` |
| 理由缺失 | `AgentFallbackNotice` + 集中 fallback copy |
| 置信度低 | `AgentConfidenceNotice`，不展示内部策略轨道 |

### 4.2 Onboarding v2

| Step | 组件组合 | 说明 |
|---|---|---|
| Welcome | `Typography` + `Button` | 情感开场文案来自 registry，不在 screen hardcode |
| Add First Wardrobe | `WardrobeImportDock` | 用户触发拍照/相册时再请求权限 |
| Import Confirm | `ImageThumb` + `EditableChip` + `AgentConfidenceNotice` | 只确认明显错误与低置信度字段 |
| First Outfit | `SlotGapEmptyState` / `FirstOutfitActivationCard` / `DecisionOutfitCard` | 严格按 BE state 映射 |
| Optional Style Memory | `StyleMemoryCard` | 可跳过；说明记住什么并给删除入口 |
| Departure / Location | `AgentQuestionCard` 或 `BottomSheet` composition | 仅在需要时轻问；位置权限拒绝后允许输入城市 |

权限 rationale 直接使用 `docs/product/aidrobe-privacy-data-copy-v0.1.md` C 节对应 registry key，不创建另一套组件内文案。现有集中索权 `PermissionScreen` 不作为 V2 flow component 复用。

### 4.3 Import → First Outfit

```text
WardrobeImportDock
→ ImageThumb / EditableChip（metadata ready）
→ AgentThinkingState（cutout / reasoning）
→ SlotGapEmptyState | FirstOutfitActivationCard | DecisionOutfitCard
```

导入过程允许单项失败与部分成功。`partialFailure` 使用 `OperationBanner`/`AgentFallbackNotice` 留在上下文内，不把整个批次降级为全屏错误。完成事件 `import_batch_completed` 只在批次状态稳定后发送。

### 4.4 Contextual entrances

`ContextualEntrySheet` 只在高意图触发点出现：

- Today insight → Insights / Wardrobe Report。
- Wardrobe item → Should-I-Buy / focused item 搭配。
- Ask 旅行需求 → Packing。
- 分享商品链接 → Should-I-Buy。

它负责路由入口，不复制现有 `SenseCheckScreen`、`PackingList*Screen`、`InsightsScreen`、`WardrobeReportScreen` 的业务逻辑，也不重建 `DiscoverHubScreen` 工具箱。

---

## 5. Copy Governance Hooks

### 5.1 总规则

用户可见字符串遵循 refactor spec §8 与主产品规范 Principle 6：

1. 静态 UI 文案全部进入 `src/i18n/*` 或计划中的 `src/copy/*` registry。
2. 业务文案不写在 screen 或组件实现内；组件不得提供中文默认值。
3. enum 使用稳定 key 传输，通过领域 label map 本地化；不得把显示文字发给 API。
4. LLM/API reasoning 与静态文案分层；动态 reason 必须带 `source` 和 `referenced_item_ids`。
5. fallback、error、toast、loading 文案集中治理；CI 扫描 demo/mock/placeholder denylist。
6. 隐私、数据使用、权限、删除和第三方 AI 处理文案以 `docs/product/aidrobe-privacy-data-copy-v0.1.md` 为来源；其中未确认的保留期、vendor 与训练边界不得由组件补写。

推荐的组件 API 形态：

```ts
type ResolvedCopy = {
  title: string;
  body?: string;
  primaryAction?: string;
  secondaryAction?: string;
};

// domain hook / container 负责 t(key)，presentational component 只渲染结果。
```

### 5.2 组件级 copy hook

| Component | 用户可见 copy | 来源与治理要求 |
|---|---|---|
| `DecisionOutfitCard` | 今日一句话、四个核心动作、不可换提示 | `today.*` registry；移除 `OutfitCard.tsx` 内 `VARIANT_LABEL` 与 CTA 硬编码 |
| `OutfitCanvas` | 图片 fallback、衣物可访问名称 | 衣物领域 label map + `image.*` registry；不得显示 raw enum 或 `item` |
| `RecommendationReasonList` | 动态理由、来源说明、空理由 fallback | API reasoning + `reason.*` fallback registry；动态文本保留 source，不拼模板 |
| `ContextOverrideBar` | placeholder、suggestions、提交/失败提示 | `today.override.*`；suggestion 只是示例，不应替用户预设答案 |
| `FeedbackChipGroup` | prompt、动作、原因、成功/失败 | `feedback.*` + `reasonTag` enum map；wire value 保持稳定 key |
| `ResurfaceInsightCard` | 动态 insight、查看动作 | API insight + `insight.*` fallback；禁止焦虑或浪费指责 |
| `FirstOutfitActivationCard` | 分阶段进度、激活动作、失败恢复 | `activation.firstOutfit.*`；动态 reasoning 仍按 reason contract |
| `SlotGapEmptyState` | 已有 slot、缺少 slot、补件动作 | `activation.slotGap.*` + slot enum map；具体、可行动，不写「暂无数据」 |
| `StyleMemoryCard` | 上传、跳过、已记住、删除与用途说明 | `styleMemory.*`；涉及数据用途时引用 privacy registry，不承诺未确认事实 |
| `PassiveWearPrompt` | 昨日穿着轻问与答案 | `learning.passiveWear.*`；不得用催促、连续打卡或负罪感措辞 |
| `WardrobeImportDock` | 导入方式、权限 rationale、进度、部分失败 | `import.*`；相机/相册权限直接引用 `permission.camera.*` / `permission.photos.*` |
| `ContextualEntrySheet` | 入口标题、说明、关闭 | `contextualEntry.*` + 各能力领域 title；不恢复 Discover 聚合页文案 |
| `AgentThinkingState` | 当前 stage 与预计动作 | `agent.thinking.*`；不声称模型正在产生未验证的结果 |
| `AgentMemoryNotice` | 记住内容、用途、纠正/删除 | `privacy.memory.*` 与 `agent.memory.*`；必须可查看、纠正、清空 |
| `AgentConfidenceNotice` | 置信度解释、确认/修改 | `agent.confidence.*`；避免展示未经解释的百分比或模型术语 |
| `AgentFallbackNotice` | 原因、恢复动作、离线/失败 | `agent.fallback.*`；未知错误不泄漏内部错误码 |
| `AgentQuestionCard` | 单个问题、选项、跳过 | `agent.question.*` + domain enum map；一次一个高价值问题 |

### 5.3 当前代码需要治理的已知点

| 路径 | 当前问题 | V2 动作 |
|---|---|---|
| `src/components/cards/OutfitCard.tsx` | strategy label、CTA 与图片 fallback 硬编码 | 迁入 `today.*` / enum map，并取消用户可见 strategy |
| `src/components/ui/StatusPill.tsx` | `可穿 / 待洗 / 不可穿` 默认值硬编码 | label 改为必传的已本地化字符串 |
| `src/components/feedback/ErrorState.tsx` | title、description、retry 默认中文 | 改为必传 resolved copy |
| `src/components/feedback/OperationBanner.tsx` | pending/success/error/retry 默认中文 | 从调用方或 registry 注入 |
| `src/components/wardrobe/WardrobeShowcaseEmpty.tsx` | showcase 与 CTA 文案硬编码 | 不复用于 V2 生产缺槽状态；若保留展示页则整体接 registry |
| `src/components/ui/BottomSheet.tsx` | `accessibilityLabel="close"` 固定英文 | 从 i18n 注入可访问名称 |

---

## 6. 状态、无障碍与验收

### 6.1 必备状态

所有数据型产品组件至少定义：

```text
loading / empty-or-insufficient / ready / error / disabled（如适用）
```

其中 `empty` 与 `insufficient` 不混用：衣橱为空是 empty；有衣物但缺 bottom 形成不了 outfit 是 insufficient，并由 `SlotGapEmptyState` 具体说明。

### 6.2 无障碍

- 按钮、chip、图片和可点击卡片提供本地化 accessibility label、role 与 state。
- 置信度、成功、警示、危险同时使用文字/图标，不只使用绿色、琥珀色、红色。
- `BottomSheet` 打开后焦点进入标题或首个操作，关闭后回到触发点。
- `OutfitCanvas` 提供按阅读顺序组织的衣物语义列表；视觉绝对定位不改变屏幕阅读器顺序。
- AIOrb 和装饰性光晕不抢焦点；减少动态效果时展示静态帧。
- 动态字体 `200%` 下 CTA 不截断，reason 与 privacy copy 不被固定高度裁切。

### 6.3 V2 验收清单

- Today 首屏只有一套 outfit 和四个核心动作，没有策略轨道或多候选菜单。
- State 0/1/ready 分别映射到正确组件，没有 fake outfit、空白图片或不可用按钮。
- Import 同 session 渐进点亮 metadata、thumbnail/cutout、reasoning，不全屏白等。
- 所有 Product / Agent 组件不含硬编码 HEX，不判断 A/B/C 候选风格。
- 所有用户可见静态字符串可从 i18n / copy registry 追溯；隐私承诺与 privacy copy 文档一致。
- 动态 reasoning 带 `source`；fallback 不由组件临时拼接。
- 复用现有 `Button/Card/ImageThumb/BottomSheet/EmptyState/ProcessingState` 等 primitives，不创建同义平行组件。
- 窄屏 `360dp`、字体放大、减少动态效果、图片失败、离线和局部失败均完成验证。
