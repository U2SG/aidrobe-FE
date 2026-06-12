# Handoff: Aidrobe — AI Wardrobe & Daily Outfit Decision

## Overview
Aidrobe 是一款 iOS 端的 AI 衣橱 / 穿搭决策应用。核心价值不是「管理衣橱」，而是 **每天早上更快穿对** —— 基于用户**真实拥有、现在能穿、找得到、来得及拿**的衣物，给出 3 套穿搭决策（最稳妥 / 最省时 / 更有风格）。

差异化定位：
- **时间敏感** — 距出门还有 X 分钟，方案随之变化
- **现实可执行** — 取衣位置、是否待洗、是否需熨烫
- **合身度（不只是尺码）** — fit_status 影响推荐
- **中国内容平台导入** — 小红书 / 得物 / 淘宝链接学习

## About the Design Files
本包内的 HTML/JSX 文件是**设计稿（design references），用 React + inline JSX 在 HTML 里搭出来的可点击高保真原型**，不是要直接拿去上线的生产代码。

任务是：**在目标代码库（iOS / Swift / SwiftUI 或 RN）现有的工程环境里、按现有的组件与设计 token 体系，重新实现这些设计**。设计稿里的视觉、文案、交互细节是事实来源；代码结构与命名遵循目标项目自身的约定。

如果项目还没有前端 / 移动端环境，建议优先采用 **SwiftUI**（与产品团队的 iOS 优先策略一致），用 SF Pro / 系统衬线 + 自定义资源色板还原。

## Fidelity
**High-fidelity (hifi)**。设计稿里的颜色、字号、间距、圆角、阴影、动效时间均为最终值。请按 `tokens.js` 里的 token 还原，不要换色板或改字体堆栈。

## Screens / Views

共 13 屏，分 3 层：

### ① 入口 / Onboarding（4 步）
- **OnboardingScreen** (`screens/extras.jsx`)
  - Step 1: 欢迎 + Apple 登录（衬线大标题 + 浮动衣物组合）
  - Step 2: 出门时间设定（默认 08:30，5 个快捷时间芯片）
  - Step 3: 风格标签 3 选 N
  - Step 4: 录入起步衣物（上衣 + 下装 + 鞋，3 件即可开始）

### ② 主导航 4 屏
- **TodayScreen** (`screens/today.jsx`) — 今日穿搭主入口
  - 顶部：问候 + **倒计时圆环**（≤20 分钟红 / ≤40 分钟琥珀色 / 充裕绿）
  - 三策略 Tab（safe / fast / stylish）—— 切换时**横向滑动 + 错落入场**
  - 主推卡片：左侧策略图标 + 时间预算条（绿/琥珀/红，对比剩余时间）+ 衣物组合大图 + 引用句解释 + 「今天穿这套」CTA
  - 副卡片 2 张（错落入场，240ms / 340ms 延迟）
- **WardrobeScreen** (`screens/main.jsx`) — 衣橱
  - 网格视图，按品类筛选，状态徽标（可穿 / 待洗 / 闲置）
- **AddScreen** (`screens/main.jsx`) — 添加（4 入口主次分明）
  - 主入口：拍照（最大卡片）
  - 次：链接导入、批量、衣柜扫描
- **StyleScreen** (`screens/main.jsx`) — 风格画像
  - 学习进度环、关键词云、调色板预览

### ③ 次级 / 决策深入页
- **OutfitDetailScreen** (`screens/extras.jsx`) — 推荐详情
  - 评分行（美感 / 执行性 / 合身度 / 准备时间）
  - Hero 大图 + 引用句
  - 单品列表，每件可「替换」、显示位置 / 合身 / 待洗状态
  - 取衣顺序卡（① 主衣柜抽屉 2 取衬衫 → ② 挂区取西装 → ③ 玄关取乐福鞋）
- **SwapPanelScreen** (`screens/more.jsx`) — 替换单品
  - 顶部：被替换件 + 障碍提示（"待洗 · 改穿这件需先洗"）
  - 候选 4 件，按合身 / 风格 / 取衣速度排序，每件给出 ✓ 推荐理由 / ⚠ 风险提示
  - BEST MATCH 徽章
- **ItemDetailScreen** (`screens/extras.jsx`) — 单件衣物详情
  - 大图、规格表、合身度滑块、60 天热力穿着记录
- **ImportConfirmScreen** (`screens/extras.jsx`) — 拍照导入确认
  - AI 置信度徽标、可点编辑的字段（品类 / 主色 / 版型 / 尺码 / 穿着感）
- **LinkImportScreen** (`screens/more.jsx`) — 链接导入（小红书 / 得物 / 淘宝 / 京东）
  - 3 阶段：粘贴 → 识别中（扫描动效） → 预览
- **StyleProfileScreen** (`screens/more.jsx`) — 风格画像编辑
  - 4 条风格滑轴（松弛↔利落 / 休闲↔正式 / 保守↔造型感 / 单色↔层次）
  - 4 主色调色板 + 建议加入色
  - 关键词权重（high / mid / low / avoid）
- **InsightsScreen** (`screens/extras.jsx`) — 衣橱洞察
  - **365 天穿着热力图**（53×7，5 级色阶）
  - **6 主色甜甜圈环**（带比例）
  - 3 大指标卡（采纳率 / 平均成本 / 闲置件数）
  - 最常穿 TOP4 + 闲置件清单 + 风格趋势折线
- **CalendarScreen** (`screens/extras.jsx`) — 穿搭日历
  - 月视图，每天小图标 + 高亮当天，下方今日详情卡
- **FitFeedbackScreen** (`screens/more.jsx`) — 回家反馈（闭环）
  - 整体感觉 4 选 1 + 每件松紧反馈 + 标签

## Interactions & Behavior

- **倒计时圆环**：基于 `now()` 与用户 `wakeup_time` 实时计算剩余分钟；策略卡的「准备时间条」实时对比剩余时间，超时变红
- **三策略切换**：左滑右滑同时配合衣物组合 `aidrobe-pop` 入场（80ms / item stagger，cubic-bezier(.34,1.56,.64,1)）
- **卡片入场**：`aidrobe-rise` 关键帧（translateY 16→0 + opacity 0→1，480ms cubic-bezier(.2,.7,.2,1)）
- **链接识别动效**：扫描线 `aidrobe-scan` 1.6s 循环 + 步骤打勾
- **按压反馈**：`.aidrobe-press:active { transform: scale(0.97) }`
- **导入流闭环**：`paste → parsing(1.4s mock) → preview` 三态切换
- **替换闭环**：详情页点单品「替换」→ 弹出 SwapPanel → 确认后回到详情页并更新 hero 与单品行

## State Management

- `currentStrategy: 'safe' | 'fast' | 'stylish'` —— Today 主策略
- `wakeupTime: HH:mm` —— 用户设定的出门时间，影响倒计时
- `outfitCandidates: Outfit[]` —— 三策略各 1 套 + 推荐池
- `wardrobeItems: Item[]`，每件含 `category / color / fit / status / location / lastWornAt / wearCount`
- `styleProfile: { axes, palette, tags, inspirations }` —— 用户风格权重
- `fitFeedback: { date, overall, perItem }` —— 闭环反馈，用于次日推荐调整
- 数据接口对齐文档见 `uploads/ios-api-alignment.md` 与 `uploads/user-guide.md`

## Design Tokens

见 `tokens.js`，核心：

```
背景:   bg #FAF7F0  bgAlt #F1ECE2
表面:   card #FFFFFF  cardSoft #F5EFE6  cardInner #F1ECE2
文字:   ink #1A1714  ink2 #3F3A33  ink3 #7A736A  ink4 #A7A09A
分隔:   divider #E5DFD2
强调:   accent #B08D5B (低饱和琥珀)  accentBg #F4E8D1
状态:   ok #3F8060  warn #C8924A  alert #B85C4A
字体:   serif "EB Garamond, serif"  sans "Inter, system-ui"  mono "JetBrains Mono, monospace"
圆角:   small 8 / medium 12-14 / large 18-24 / pill 999
阴影:   shadowSm "0 1px 3px rgba(26,23,20,0.04), 0 1px 2px rgba(26,23,20,0.06)"
        shadowMd "0 4px 16px rgba(26,23,20,0.06), 0 2px 4px rgba(26,23,20,0.04)"
```

间距规范：
- 屏幕水平 padding 24px（部分 20px）
- 卡片内 padding 14-16px
- 元素间 gap 8 / 10 / 14 / 18 / 22
- 状态栏高度 ~44px，底 Tab 栏 ~83px（iOS 安全区）

## Assets

**当前没有真实素材** —— 所有衣物都是 SVG 占位（`Garment` 组件 in `ui.jsx`，按 kind 渲染条纹+轮廓）。

替换计划（按 `uploads/18_穿搭展示与图像标准化方案.md`）：
- 用户上传图 → 后端去背景 → 标准方形透明 PNG → 下发到客户端
- 占位时仍可用 `Garment` 组件，命名映射：shirt / blazer / sweater / trousers / jeans / skirt / dress / loafer / sneaker / bag / tee

图标：自绘 SVG（线性 1.4-1.6 stroke，linecap round），无第三方图标库。

## Files

```
aidrobe-prototype.html      入口 HTML，承载 design canvas + 真机原型 双面板
design-canvas.jsx           概览面板组件（pan/zoom + 多 artboard）
ios-frame.jsx               iOS 真机外壳（电池条、Home 指示器）
tokens.js                   设计 token（颜色、字体、阴影等）
ui.jsx                      共用组件（StatusBar、TabBar、Garment、StatusPill、Tag）
screens/today.jsx           Today 屏（核心）
screens/main.jsx            Wardrobe / Add / Style 三屏
screens/shell.jsx           真机原型主控（Tab 切换 + Overlay 路由）
screens/extras.jsx          Onboarding / OutfitDetail / ItemDetail / Insights / Calendar / ImportConfirm
screens/more.jsx            SwapPanel / LinkImport / StyleProfile / FitFeedback
```

## 实现优先级建议（给 Claude Code）

1. **MVP 闭环**（先跑通）：Onboarding → Today → OutfitDetail → 「今天穿这套」 → FitFeedback
2. **添加流**：Add → 拍照 / 链接 → ImportConfirm → 入库
3. **衣橱与决策深化**：Wardrobe → ItemDetail → SwapPanel
4. **学习与洞察**：StyleProfile / Insights / Calendar
