# Aidrobe Design Language

**Version:** v0.1  
**Status:** Draft  
**Derived from:**
- `docs/product/aidrobe-mvp-workflow-agent-responsibility-design-v0.8.md`
- `docs/design/aidrobe-fe-refactor-spec.md`
- `docs/design/aidrobe-ui-ux-spec-v0.1.md`
- `docs/engineering/aidrobe-fe-redesign-implementation-plan.md`
- `docs/product/aidrobe-privacy-data-copy-v0.1.md`

---

## 0. 定位与适用范围

Aidrobe V2 的设计语言定义为：

```text
Soft Utility for Real Life
```

它服务的是每天真实发生的穿衣决策，不是时尚杂志、衣橱管理后台、购物导购或以对话为中心的 AI 展示。情感原点是「悦己」，不是「管理」：用户打开 Aidrobe，是为了少一点纠结、多一点确定，并穿成自己喜欢的样子，而不是维护一套衣物数据库。

统一体验气质：

```text
温柔 / 干净 / 可信 / 早晨感 / 低负担 / 有生活气 / 不幼态 / 不审判
```

统一交互原则：

- 默认给出一套可执行结果，不把选择负担还给用户。
- 支持一键换、一句话改；不强迫配置，不把用户推入复杂设置。
- 真实衣物与真实上下文优先；装饰、入口和信息噪音退后。
- 不使用年龄、身材规训或制造焦虑的视觉与文案暗示。

本规范定义颜色、排版、圆角、间距、阴影与体验语义 token。组件的具体职责与状态见 `docs/design/aidrobe-component-spec-v0.1.md`。

---

## 1. 20–60 岁的可读性与尊严

20–60 岁不是一个单一画像，但应共用一套清晰、有尊严的产品界面。变化应来自推荐内容、生活阶段约束和语气，不应靠为不同年龄制作不同皮肤。

### 1.1 统一约束

- 正文与关键操作不依赖低对比、极细字重或极小字号。
- 不过度少女化，也不退化为冷硬、无生活气的工具界面。
- 不出现「减龄」「显年轻」「适合成熟女性」等年龄标签；使用「更轻松」「更稳妥」「更适合今天」等功能性表达。
- 不用颜色单独承载状态；状态同时具备文字、图标或形态线索。
- 动态字体放大后，关键文本允许换行，CTA 不截断，卡片高度不固定。
- 移动端可点击区域至少 `44 × 44`；关键 CTA 沿用现有 `Button` 的 `50px` 默认高度。

### 1.2 最低可读性基线

| 项目 | V2 约束 |
|---|---|
| 正文 | 默认不小于 `16px / 24px`；不使用 `caption` 承载任务必需信息 |
| 交互标签 | 不小于 `15px / 20px`，字重至少 `500` |
| 辅助正文 | 不小于 `14px / 20px`，且必须满足正文对比度 |
| Caption | 不小于 `12px / 16px`，仅用于非关键补充信息 |
| 普通文本对比度 | 目标至少 `4.5:1` |
| 大字文本与非文本控件 | 目标至少 `3:1` |
| 高龄友好检查 | 在系统字体放大 `200%`、窄屏 `360dp` 下验证主路径 |

对比度规则以 WCAG 的数值目标为验收基线；现有 `src/theme/contrast.ts` 只防止浅色背景上的白字，不是完整对比度引擎，不能替代设计评审与自动化检查。

---

## 2. 现有 token 系统：V2 基线

V2 不从零创建调色板。基线来自 `src/theme/design.ts`；NativeWind 映射来自 `tailwind.config.js`。`src/theme/contrast.ts`、`src/theme/glass.ts`、`src/theme/motion.ts` 是同一基础层的辅助模块。

### 2.1 现有颜色

| 分组 | Token | 当前值 | V2 语义 |
|---|---|---:|---|
| 背景 | `background` | `#FAF7F0` | 全局暖白背景 |
| 背景 | `groupedBackground` | `#F1ECE2` | 分组页面背景 |
| 表面 | `elevated` / `surface` | `#FFFFFF` | 最高可读性的内容表面 |
| 表面 | `secondaryElevated` / `surfaceElevated` | `#F5EFE6` | 暖色次级表面 |
| 填充 | `fill` | `#EEE6DA` | 控件填充、骨架与按压态 |
| 分隔 | `separator` / `borderStrong` | `#E5DFD2` | 明确边界 |
| 分隔 | `separatorSoft` / `borderSubtle` | `#EFE8DC` | 轻边界 |
| 文字 | `label` / `textPrimary` | `#1A1714` | 主文字、深色主操作 |
| 文字 | `secondaryLabel` / `textSecondary` | `#3F3A33` | 次级正文 |
| 文字 | `tertiaryLabel` / `textMuted` | `#7A736A` | 辅助文字 |
| 文字 | `quaternaryLabel` | `#A7A09A` | 极弱提示，仅限非关键信息 |
| 反色 | `inverse` / `textInverse` | `#FFFFFF` | 仅用于受控深色背景 |
| 品牌 | `accent` | `#B08D5B` | 暖金强调 |
| 品牌 | `accentSoft` | `#F4E8D1` | 暖金浅底 |
| 成功 | `success` / `successBg` | `#3F8060` / `#EDF4EE` | 确认、可信状态 |
| 警示 | `warning` / `warningBg` | `#C8924A` / `#F8E9C8` | 需留意、可恢复状态 |
| 危险 | `danger` / `dangerBg` | `#B85C4A` / `#F6DDD6` | 删除、失败等真实危险状态 |

`src/theme/design.ts` 中的 FE#31 aliases 已使内联样式与 NativeWind 可以共享语义命名。V2 新代码应优先使用语义名，而不是 iOS 风格旧名，更不能直接写 HEX。

### 2.2 现有形态 token

| 分组 | 当前值 | 使用规则 |
|---|---|---|
| `radius` | `xs 8`、`sm 12`、`md 16`、`lg 20`、`xl 24`、`pill 999` | 作为 V2 最终形态保留（进化 V1，不更换视觉风格，见 §6） |
| `spacing` | `screen 20`、`section 24`、`row 16`、`control 12` | 保留现有四级语义；局部间距优先由它们组合 |
| `shadow.soft` | 暖棕 `#3C2814`，`0 1px 4px`，`6%` | 仅用于需要与背景分离的浮层/卡片 |
| `shadow.elevated` | 暖棕 `#3C2814`，`0 10px 22px`，`8%` | Sheet、Modal 等高层级表面 |
| `glass.surface` | `rgba(250,247,240,.72)` + 暖边框 | 仅用于内容上方的浮动控制 |
| `glass.surfaceStrong` | `rgba(250,247,240,.92)` + 暖边框 | 需要承载正文的浮层 |
| `glass.scrim` | `rgba(26,23,20,.32)` | Modal/Sheet 背后遮罩 |
| `motion.duration` | `0 / 140 / 240 / 420 / 1600ms` | 即时、快速、标准、慢速、环境动画 |
| `motion.spring` | `gentle`、`snappy` | 克制、低过冲；遵守系统减少动态效果设置 |

`src/theme/motion.ts` 已定义安静、不过度吸引注意力的动画语言；`src/components/ui/AIOrb.tsx` 也已读取减少动态效果偏好。V2 不新增无意义循环动画。

---

## 3. V2 体验语义 token（拟新增）

以下值是基于当前暖中性色盘的 v0.1 提案，不是候选视觉风格的最终选择。优先复用现有值，只有可读性或 Agent 表达确有缺口时才引入新色。

| Token | HEX 提案 | 与现有 token 的关系 | 使用边界 |
|---|---:|---|---|
| `morningBackground` | `#FAF7F0` | alias → `background` | Today、Onboarding 的默认早晨背景 |
| `warmSurface` | `#F5EFE6` | alias → `secondaryElevated` | 次级卡片、轻提示、输入承托面 |
| `decisionSurface` | `#FFFFFF` | alias → `elevated` | 唯一主推荐、首套搭配等高确定性表面 |
| `quietText` | `#6B645B` | 新值，比 `tertiaryLabel` 更深 | 需安静但仍必须可读的辅助正文 |
| `softAccent` | `#F4E8D1` | alias → `accentSoft` | 选中、轻强调背景；不可作为正文前景 |
| `trustGreen` | `#3F8060` | alias → `success` | 已确认、可信、完成；不泛化为装饰绿 |
| `cautionAmber` | `#9A682E` | 新值，比 `warning` 更深 | 低置信度、缺槽、可恢复风险的文字/图标 |
| `agentGlow` | `#D8B77A` | 新值，与 `accent` 同暖金色相 | Agent 存在感、光晕或非文字强调；不可承载正文 |

配套规则：

- `quietText` 和 `cautionAmber` 是前景色；`softAccent` 与 `agentGlow` 默认是背景、边缘或光晕色。
- `trustGreen` 只表示已验证的正向状态，不用于「AI 猜测正确」之类未经确认的结论。
- 低置信度使用 `cautionAmber` + 明确文字，不使用危险红。
- `agentGlow` 不替代状态色；Agent 出错仍使用语义化错误状态。
- 体验 token 应加入 `colors` 并同步映射到 `tailwind.config.js`，不另建页面级 palette。

---

## 4. Typography

### 4.1 现有 scale 映射

| `type` token | 当前规格 | V2 用途 |
|---|---|---|
| `largeTitle` | `32 / 38 / 700 / -0.4` | Welcome、极少量情感标题 |
| `title1` | `28 / 34 / 700 / -0.3` | 页面主标题 |
| `title2` | `22 / 28 / 700` | 卡片组或关键区块标题 |
| `headline` | `17 / 22 / 600` | 卡片标题、关键状态、主要问题 |
| `body` | `15 / 21 / 400` | 当前正文；V2 建议提升，见下节 |
| `callout` | `14 / 20 / 400` | 辅助说明、理由；不得承载过长主内容 |
| `footnote` | `13 / 18 / 400` | 来源、时间、低优先级元信息 |
| `caption` | `11 / 14 / 500` | 当前极小标签；V2 建议提升，见下节 |

字号与字重来自 `src/theme/design.ts`，渲染入口优先使用 `src/components/ui/Typography.tsx`。动态内容不得绕过 scale 使用任意字号。

### 4.2 V2 调整建议

- `body` 从 `15 / 21` 调整为 `16 / 24`。
- `caption` 从 `11 / 14` 调整为 `12 / 16`；不得用于推荐理由、错误恢复说明或隐私声明。
- `callout 14 / 20` 保留为最小辅助正文；关键 CTA 继续使用至少 `body` 尺寸。
- 大标题保留 `700` sans；V2 **不引入 serif display**（进化 V1，sans-first，见 §6）。
- 中文正文不人为增加负字距；英文 display 可保留现有轻微负字距。
- 所有用户可见文字必须支持系统字体缩放，禁止用固定高度裁切两行以上文案。

---

## 5. 从当前 token 到 V2 的差异

### 5.1 `src/theme/design.ts`

| 动作 | 具体变更 |
|---|---|
| ADD | 在 `colors` 增加 8 个 experience aliases/values：`morningBackground`、`warmSurface`、`decisionSurface`、`quietText`、`softAccent`、`trustGreen`、`cautionAmber`、`agentGlow` |
| CHANGE | `type.body`：`15/21` → `16/24` |
| CHANGE | `type.caption`：`11/14` → `12/16` |
| KEEP | 暖中性基线 `#FAF7F0 / #F1ECE2 / #F5EFE6 / #B08D5B`、现有 spacing 与默认 radius |
| GOVERN | 新代码优先使用 semantic/experience token；旧 iOS 风格名字仅为兼容层 |

`quietText`、`cautionAmber` 与 `agentGlow` 是仅有的新增色值；其余体验 token 是现有色的语义 alias，避免无控制地扩色。

### 5.2 `tailwind.config.js`

当前文件存在两套并行视觉语言：

- 暖色语义映射：`ink`、`ink-soft`、`ink-muted`、`surface`、`surface-soft`、`border-*`，与 `src/theme/design.ts` 一致。
- 冷灰/旧调色板：`brand-*`、`closet-*`、`ai-bg #F2F2F7`、`ai-ink #111113`、`ai-div #DADAE2` 等；它们偏 iOS 冷灰，与 V2 暖中性基线冲突。

处理建议：

1. 同步加入 8 个 experience token 的 NativeWind 映射。
2. 将仍在使用的 `brand-*`、`closet-*`、`ai-*` 调用逐步迁移到 semantic/experience token。
3. 迁移完成前保留旧 key 以避免破坏现有页面，但禁止 V2 新组件继续使用。
4. 最终删除无引用的冷灰值，确保 `design.ts` 是唯一色值来源或由构建配置直接引用。

### 5.3 代码中已发现的局部冲突

- `src/components/outfit/OutfitBoard.tsx` 仍硬编码冷色 `BOARD_WASH = #EEF3F1`；V2 应改为 `warmSurface` 或所选风格的画布 token。
- `src/components/ui/AIOrb.tsx` 的语义层已有 `thinking/success/error`，但底层 `src/components/ui/SiriOrb.tsx` 目前只有 `ink/vivid` 两套 shader palette；`vivid` 的蓝紫粉不应自动成为 V2 品牌色。最终风格确定后再决定是否用 `agentGlow` 扩展 shader。
- `src/components/feedback/ErrorState.tsx`、`src/components/ui/StatusPill.tsx`、`src/components/feedback/OperationBanner.tsx` 仍含默认中文文案；这是 copy governance 问题，组件规范中要求移入 i18n / copy registry。

---

## 6. 最终方向：进化 V1（Decided）

经过三套候选（Japandi / Health-Wellness / Zen Wabi-Sabi）的高保真 UI mock 评审，结论是**不采用任何一套独立视觉风格**，而是进化现有 V1：

```text
Final direction: Evolve V1 — 保持现有暖中性品牌色与原生形态，不更换视觉风格
```

### 6.1 决策与排除理由

| 方向 | 结论 | 理由 |
|---|---|---|
| Japandi Minimal | 排除 | `0px` 锐角 + 发丝线分隔 + 全大写 letterspaced 标签 + 衬线大标题是**编辑 / 印刷 / Web 语法**，贴到原生 App 上与触控惯例割裂；且与现有 `design.ts`（圆角 + 柔影）相悖。 |
| Zen Wabi-Sabi | 排除 | 同属编辑向（不对称 + `2px` 锐角 + 低对比 + 汉字水印），适合海报 / Web，不适合 app 主体验；低对比触碰 §1 的 20–60 可读性底线。 |
| Health-Wellness | 排除 | 交互取向（胶囊 / 柔影 / 圆角）适合原生，但 sage 绿主色**脱离现有暖驼品牌色身份**。 |
| **进化 V1** | **采用** | 保住 V1 已验证的安静质感：暖中性品牌盘、一张大卡 flat-lay、精修微件（环形 badge / 引用框 / bullet 理由 / 深色大 CTA / 文字链次级）。V2 只**去掉策略轨道换单推荐**、补 **override / resurface insight / 4-tab(Today·Wardrobe·Ask·Profile)**，不重做视觉风格，不把内容打碎成多张小卡片（“卡片汤”是明确反模式）。 |

### 6.2 据此对 §2 / §3 / §4 的固化结论

- 颜色：保留 §2.1 暖中性盘为最终盘，不替换；§3 的 8 个 experience token 按提案落地。
- 形态：保留 §2.2 现有 `radius`（不归零、不改 `2px`）与 `shadow.soft / elevated`。
- 字体：sans-first（§4.2 的 `body`→`16/24`、`caption`→`12/16` 调整生效）；**不引入 serif display**。
- §5.3 局部冲突照旧修复（`OutfitBoard` 冷色 `#EEF3F1` wash → `warmSurface`；冷灰 `ai-*` / `brand-*` 迁移到语义 token）。

### 6.3 反模式（设计师须避免）

- **卡片汤**：把理由 / 单品 / 操作各自拆成带投影的小卡片或小药丸 → 视觉变碎、显廉价。V2 用**一张安静大卡**承载推荐，理由是大卡内的朴素 bullet，次级操作是文字链，不是一堆浮层。
- 编辑/印刷语法（锐角、发丝线、全大写 letterspaced、衬线大标题、低对比）。
- 脱离暖驼品牌色的强主色（如 sage 绿、深绿、赤陶）。
- 用颜色单独承载状态；忽视 ≥`44px` 触控与动态字体。

### 6.4 已锁定的视觉参考

“进化 V1” 的 Today v2 主屏已产出可交互高保真参考，作为设计师 handoff 的视觉锚。屏级逐元素规格、mock 链接与对照见 `docs/design/aidrobe-v2-design-brief-v0.1.md`；V1 真机对照见仓库根 `upg-02-today.png`。

---

## 7. 实施护栏

1. `src/theme/design.ts` 是颜色、排版、圆角、间距和阴影的基准；`tailwind.config.js` 必须与其同步。
2. screen 和产品组件禁止新增局部 palette 或硬编码 HEX。
3. 组件只消费 semantic/experience token，不读取候选风格名。
4. 用户可见文案全部进入 i18n / copy registry；隐私与数据承诺以 `docs/product/aidrobe-privacy-data-copy-v0.1.md` 为唯一产品文案来源，并需与真实后端和法务结论一致。
5. 视觉验收至少覆盖 Today、Onboarding、Import → First Outfit、空状态、错误恢复、动态字体与减少动态效果。
