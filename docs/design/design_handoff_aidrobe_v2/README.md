# Handoff: Aidrobe V2 — 交互原型

## Overview（概述）
Aidrobe V2 是一款「每天早晨给你一套可直接穿的搭配」的穿衣决策 App。本原型串起了完整体验：**开屏 Onboarding（6 步）→ 进入 4-tab 主应用（今日 · 衣橱 · Ask · 我的）**，含全部二级页与底部弹窗，带真实转场动效。

情感定位（来自设计语言）：`温柔 / 干净 / 可信 / 早晨感 / 低负担 / 有生活气 / 不幼态 / 不审判`。核心交互原则：**默认给一套可执行结果，一键换、一句话改，不把选择负担还给用户**。

## About the Design Files（关于本包里的文件）
- `Aidrobe V2 原型.dc.html` 是用 **HTML 写的设计参考稿**——用来呈现最终视觉与交互，**不是可直接照搬上线的生产代码**。
- 任务是：在目标代码库的现有环境里**复刻这些设计**。本项目已有 React Native 代码库（见组件规范里的 `src/...` 路径），应使用其既有组件与模式复刻；`aidrobe-component-spec-v0.1.md` 定义了 Foundation / Product / Agent 三层组件与复用判定，**它是组件命名与 props 的 source of truth**，HTML 稿是视觉与交互的 source of truth。
- 原型里的**衣物图片是从设计截图里实时裁切（CSS background-crop + 遮罩羽化）复用的**，只为在原型里呈现真实平铺衣物；**生产环境应接入真实的抠图资产（PNG 透明图）**，不要沿用这种截图裁切方式。

## Fidelity（保真度）
**High-fidelity（高保真）**。颜色、字号、间距、圆角、动效时长均为最终值，应按下方 Design Tokens 像素级复刻，套用代码库已有的组件库实现。

## 运行方式
`Aidrobe V2 原型.dc.html` 依赖同目录的 `support.js`（本包已含）。用浏览器打开 HTML 即可交互；起始停在 Onboarding 第 1 步 Welcome。设备尺寸按 iPhone 393×852 设计。

---

## Design Tokens（设计令牌 — 全部来自 `src/theme/design.ts`）

### 颜色
| 语义 | HEX | 用途 |
|---|---|---|
| morningBackground / background | `#FAF7F0` | 全局暖白背景（Today / Onboarding） |
| groupedBackground | `#F1ECE2` | 分组页背景、resurface 提示底 |
| decisionSurface / elevated | `#FFFFFF` | 主推荐大卡、最高可读表面 |
| warmSurface / secondaryElevated | `#F5EFE6` | 次级卡片、引用框、输入承托 |
| fill | `#EEE6DA` | 控件填充、骨架、按压态、时间选择器底 |
| borderStrong / separator | `#E5DFD2` | 明确边界 |
| borderSubtle / separatorSoft | `#EFE8DC` | 轻边界、卡内分隔线（`#F4EFE6` 更轻） |
| textPrimary / label | `#1A1714` | 主文字 |
| textSecondary | `#3F3A33` | 次级正文 |
| textMuted / tertiary | `#7A736A` | 辅助文字 |
| quaternary | `#A7A09A` | 极弱提示 / placeholder |
| quietText | `#6B645B` | 需安静但可读的辅助正文 |
| accent | `#B08D5B` | 暖金强调（图标、强调数字、进度） |
| softAccent / accentSoft | `#F4E8D1` | 选中底、图标圆底、轻强调背景 |
| agentGlow | `#D8B77A` | Agent 光晕、星标、引号；不承载正文 |
| trustGreen / success | `#3F8060` | 已确认 / 可穿（bg `#EDF4EE`） |
| warning | `#C8924A`（bg `#F8E9C8`） | 需留意、可恢复 |
| cautionAmber | `#9A682E` | 低置信度、缺槽的文字/图标 |
| danger | `#B85C4A`（bg `#F6DDD6`） | 删除 / 失败 / 清空数据 |
| textInverse | `#FFFFFF` | 深底反色文字 |
| 主 CTA 深色 | `#171310` | 黑色主按钮底 |

### 形态
- **圆角** radius：`xs 8 · sm 12 · md 16 · lg 20 · xl 24 · pill 999`。主卡 24，弹窗顶 28，按钮 15-16，卡片 18-22，chip 12-14 或 pill。
- **间距** spacing：`screen 20 · section 24 · row 16 · control 12`。屏幕左右 padding 20-22。
- **阴影** soft：`0 1px 4px rgba(60,40,20,.06)`；卡片再叠 `0 10px 30px rgba(60,40,20,.05)`；弹窗 elevated：`0 -10px 40px rgba(0,0,0,.18)`。
- **遮罩 scrim**：`rgba(26,23,20,.36)`。

### 排版（sans-first，**不用 serif**）
字体栈：`-apple-system, "PingFang SC", "Noto Sans SC", system-ui, sans-serif`。
| token | size/line/weight | 用途 |
|---|---|---|
| largeTitle | 30–34 / 38–44 / 700，字距 -0.4 | Welcome、页面主标题 |
| title1 | 28 / 34 / 700 | 页面标题（我的、衣橱、Ask） |
| title2 | 22 / 28 / 700 | 卡片组标题、弹窗标题 |
| headline | 17 / 22 / 600 | 卡片标题、今日一句话 |
| body | 16 / 24 / 400 | 正文（V2 已从 15/21 提升） |
| callout | 14 / 20 / 400 | 理由、辅助说明 |
| footnote | 13 / 18 / 400 | 来源、时间、元信息 |
| caption | 12 / 16 / 500 | 标签、极弱补充 |
触控区 ≥ 44×44；主 CTA 高 54–56。

### 动效（来自 `src/theme/motion.ts`）
- **时长**：`0 / 140 / 240 / 420 / 1600ms`（即时 / 快 / 标准 / 慢 / 环境）。
- **缓动**：入场 `cubic-bezier(.22,.61,.36,1)`（gentle、低过冲）；圆环绘制 `cubic-bezier(.4,0,.2,1)`。
- **原则**：整体克制；仅在「出片时刻」（今日一套揭晓、第一套、换一套）多一点惊喜。**必须尊重 `prefers-reduced-motion`**——开启时所有入场退化为静态直显。

---

## Screens / Views（逐屏）

> 通用：状态栏 9:41 + 信号/wifi/电量（44–54px 高）；主应用 4 屏底部有 tab bar（今日/衣橱/Ask/我的，激活色 `#B08D5B`，未激活 `#A7A09A`）；二级页（详情、隐私、记忆）隐藏 tab bar、顶部左上角返回 chevron。

### Onboarding（6 步，顶部 6 段进度条 + 「N / 6」）
1. **ob-welcome**：`01` 标签 → largeTitle「今天，穿成喜欢的自己」→ 副文「不用维护一套衣物数据库。把常穿的衣服交给 Aidrobe，每天少一点纠结。」→ 平铺 flat-lay 大图 → 星标行「先加几件常穿的，就能看到第一套。」→ 黑 CTA「开始整理衣橱」→ 文字链「登录已有账号」→ 底部「隐私与数据说明」。背景有一层**极淡的 WebGL 晨曦渐变**（暖奶油→暖金，缓慢漂移，opacity ≈ 0.5；可用 canvas/shader 或退化为静态渐变）。
2. **ob-add**：`02`「先加几件常穿的」+ 副文 → flat-lay → softAccent 提示 pill「约 7 件，就能开始每天推荐。」→ 黑 CTA「拍下衣服」(相机图标) → 描边 CTA「从相册选择」→ 文字链「还有其他添加方式」→ 脚注「Aidrobe 会自动识别颜色、类别和季节，你只需确认明显错误。」。点「拍下衣服」弹出相机权限说明弹窗 → 继续进入导入。
3. **ob-import**「正在整理你的衣橱」：卡内 3 段进度器（①识别衣物 已完成✓ → ②生成抠图 4/6 → ③准备首套 等待中），2×3 衣物网格（4 件 ✓、2 件「处理中」），「已识别 4 件 · 处理中 2 件」+ 进度条动画到 **67%**，CTA「确认识别的衣物」。
4. **ob-confirm**「确认一下就好」：副文「只改明显不对的，其他交给 Aidrobe。」；每行=缩略图+名称+标签(上衣/米白)+「保留✓」+「改一下」；最后一件低置信度：标签「外套？」+ 琥珀条「这件是外套吗？ [是] [改一下]」。CTA「加入衣橱并生成首套」。
5. **ob-slotgap**「还差一条下装」(SlotGapEmptyState)：副文「你已经有 3 件上衣和 1 双鞋。再加一条下装，就能生成第一套搭配。」；画布=衬衫 + **虚线空槽「需要一条下装」** + 乐福鞋；勾选清单（上衣 已有✓ / 下装 缺少— / 鞋 已有✓）；CTA「添加一条下装」→ 打开加衣物弹窗 → 关闭后进入下一步；文字链「稍后再说」；脚注「补一件后会自动重新检查。」
6. **ob-memory**「给 Aidrobe 一点灵感」(Style Memory，可跳过)：灵感照片卡带「选择你的照片」蒙层；三栏（理解色调 / 理解廓形 / 影响以后推荐）；CTA「选择一张照片」+ 文字链「跳过」；脚注「随时可以在『我的』里查看、更换或删除。」
7. **ob-first**「第一套，已经准备好了」：卡「你的第一套 · 正式通勤·舒适利落」+ 心形；画布=燕麦针织衫+深灰西裤+乐福鞋（带名称）；分隔线；「为什么这一套最合适」3 条（衣物/场景/搭配规则）；引用框「先从这套开始，明天会更懂你。」；黑 CTA「穿这套看看」→ 进入 Today；文字链「再加几件」；脚注「现在只有这一套可行搭配，再加几件就能有更多选择。」

### 主应用
8. **today**（DecisionOutfitCard，见组件规范 §2.2 冻结结构）：问候「早上好，林」+ 副文「距出门还有 **8** 分钟 · 通勤」+ 右上「8′ 出门」**圆环**（stroke-dashoffset 从满绘制到 ~75%）。今日一句话「今天有点闷热，给你配了套透气又利落的。」。白色主卡：标题「今日一套」+ 天气行「28° 多云 · 准备 5 分」→ **OutfitCanvas**（衬衫/西裤/乐福鞋绝对定位平铺 + 名称）→ **3 条理由**（圆金图标 + 文本 + 右侧来源：天气/穿着记录/天气规则）→ 引用框 → 黑 CTA「今天穿这套」→ 文字链「查看详情 | 不喜欢 | 换一套」。卡下：resurface 提示「那件米白衬衫你三周没穿了…」+ override bar「今天有什么特别的吗？」。
9. **wardrobe**「我的衣橱」：标题+「已收纳 26 件」+「+」；搜索框；筛选 chips（全部/上衣/下装/外套/鞋）+「筛选」；提示行「有 4 件衣服一个月没出现…」；2 列衣物网格（点开=衣物详情）。
10. **ask**「Ask Aidrobe」：副文 → idle 卡（Agent orb + 「今天想怎么调整？」+ 4 条建议行带图标）→ 底部输入条。点建议 → 追加**问答**：用户气泡 + Agent 回答卡（新搭配平铺 + 赞/踩 + 理由 + 「用这套」+「再调整·查看详情」）+ 跟进 chip。
11. **profile**「我的」：头像 + 「林」+「Aidrobe 使用第 28 天」+「编辑」；卡「Aidrobe 与你」（记住的关于你 / 风格灵感 已保存 3 张）；设置组（出门时间 9:00 / 通知 / 隐私与数据）；底部危险链接「清空全部数据」。
12. **privacy**「你的衣橱，只属于你」：三段卡（我们会用到 / 用来做什么 / 你可以随时）+「阅读《隐私政策》」。
13. **memory**「Aidrobe 记住的关于你」：副文；卡「你的偏好」（每行 文本 + [这不准] [删除]）；卡「最近的穿着倾向」；底部危险链接「清空 Aidrobe 学到的全部偏好」。
14. **outfit-detail**「搭配详情」：平铺画布 → 「为什么适合今天」3 条 → 「这套包含」列表（缩略图+名称+可穿状态+chevron，点开=衣物详情）→ 黑 CTA「今天穿这套」→「不喜欢 · 换一套」。
15. **item-detail**「衣物详情」：大图 + 名称/属性 + ● 可穿(绿) + 「12 天前穿过」；卡（材质/场合/正式度，每行「改一下」）；「常和它一起穿」3 件；黑 CTA「用它搭一套」→「编辑 · 删除」。**大图与标题随点击的单品动态变化。**

### 底部弹窗（Bottom Sheets，遮罩渐显 + sheet 上滑 420ms）
- **permission** 相机权限说明 · **add** 添加衣物（拍下衣服/从相册选择/从穿搭照提取/粘贴商品链接）· **filter** 筛选衣物（品类/状态/季节/颜色带色卡 + 清除/查看N件）· **category** 修改类别（单选圆点）· **leavetime** 出门时间（±步进 + 3 预设卡）· **clear** 清空全部数据（危险，列出将删除项 + 「确认清空」+「此操作无法撤销」）· **feedback** 这套哪里不合适（2 列图标卡单选 + 补充输入 + 「提交并换一套 / 只提交反馈」）· **override** 今天有什么特别的（2×2 图标卡 + 「还可以打字」+ 输入 + 「按这个重新推荐」）。

---

## Interactions & Behavior（交互与行为）
- **路由**：单一 screen-stack，激活屏 `display` 显示、其余隐藏；每次进屏跑一次入场动画。tab 切换即时；onboarding/详情为前进转场。
- **Today 揭晓（hero）**：进入 Today 时——问候/卡/理由依次浮现（stagger 55–90ms），衣物平铺入场（translateY+scale，stagger 100ms），名称淡入，圆环绘制（1.15s）。每次进入 Today 都重播。
- **换一套 / override / 不喜欢反馈**：旧搭配淡出→新搭配（燕麦针织+深灰西裤）淡入，理由/引用文案同步替换；均触发同一 swap 过渡。
- **弹窗**：scrim `opacity 0→1`（.3s），sheet `translateY(102%)→0`（.44s gentle）；点遮罩/取消关闭。
- **按压反馈**：所有 `.press` 元素按下 `scale(0.97)`（.1s）。
- **reduce-motion**：全部退化为静态直显。

## State Management（状态）
- `screen`（当前屏）、`_variant`（Today 搭配 A/B）、`_item`（衣物详情当前单品）、`_privReturn`（隐私页返回目标）、`_ovSel`/`_fbReason`（弹窗选中）。
- 数据契约见组件规范：`RecommendationReason {text, source, referencedItemIds}`；First Outfit 三态 `no_outfit → SlotGapEmptyState` / `single_outfit → FirstOutfitActivationCard` / `ready → DecisionOutfitCard`；反馈 chip 用稳定 enum（太正式/太休闲/太热/太冷/颜色不喜欢/不像我/刚穿过），本地化 label 与 wire value 分离。

## Assets（素材）
- 原型内衣物为**从设计截图裁切**：`ref/307a7c75.png`（衬衫/西裤/乐福鞋/针织/连衣裙/托特包）、`ref/a678a37a.png`（燕麦针织/深灰西裤/乐福鞋）、`uploads/exec-11ba3d28-…png`（开衫/运动鞋/平铺图）、`ref/d4b76723.png`（真丝衬衫/藏青半裙/耳环）、`ref/d0ded744.png`（灵感照）。**生产请替换为真实透明抠图资产**。
- 图标为内联 SVG（1.5–1.8 描边，暖金 `#B08D5B`）；生产可用代码库既有图标库同风格替换。

## Files（本包文件）
- `Aidrobe V2 原型.dc.html` — 全部 15 屏 + 8 弹窗的设计稿（含逻辑）。
- `support.js` — 运行原型所需运行时（勿改）。
- `assets/` — 上述裁切用的截图源图。
- `specs/aidrobe-design-language-v0.1.md` — 设计语言（颜色/排版/形态/动效/最终方向）。
- `specs/aidrobe-component-spec-v0.1.md` — 组件系统（Foundation/Product/Agent + flow 组合 + copy 治理），**组件实现以此为准**。
