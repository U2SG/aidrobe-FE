# Aidrobe Frontend Refactor Spec

**Version:** v0.8（与产品方案 v0.8 对齐）  
**Status:** Draft  
**Companion to:** `aidrobe-mvp-workflow-agent-responsibility-design-v0_8.md`（下称"主方案"）  
**Audience:** 前端 / 工程实现  
**Perspective:** Staff FE Engineer + Product

---

## 关于本文档

这是主方案的**工程伴随文档**，从主方案 v0.8 §15 抽出独立成文。  
抽出的原因有两个：

```text
1. 不在产品论纲里堆 400 行工程细节（组件清单、JSON contract、token）
2. 避免两处内容互相 drift——同一件事只在一处维护
```

分工很清楚：

```text
主方案：产品 why、用户模型、情感北极星、取舍依据
本文档：FE 怎么落地
```

**本文档不重复论证产品判断。** MVP 的定义、不可再缩减的核心（主方案 §4.5）、
设计原则（主方案 §5）、Tone of Voice（主方案 §6.5），一律以主方案为准。  
引用约定：文中"主方案 §X" / "主方案 Workflow N"指向产品方案对应章节。

本文档**是**：IA 重构、Today 重设计、设计语言、组件体系、文案治理落地、
styling/token、telemetry/passive learning、FE/BE contract、重构优先级、验收。  
本文档**不是**：产品哲学、用户画像、品牌叙事（看主方案 §0）。

> 权限请求、数据说明等用户可见信任文案，见配套文档
> `aidrobe-privacy-data-copy-v0_1.md`，本文档只引用、不重写。

---

## 0. Current → Target 速览

下一阶段最大的风险不在后端能力（PR #76 合并后，视觉风格学习已从 stub 变成真实
Qwen-VL 能力，并能影响 Today 的 style context），而在前端产品形态。  
FE 不应该继续局部加屏、加卡片、加入口，而要做一次以主方案 MVP 设计为准的体验系统重构。

| 维度 | 当前 | 目标 |
|---|---|---|
| 一级导航 | Today / Wardrobe / Discover / Settings | Today / Wardrobe / Ask / Profile |
| Today | safe/fast/stylish 策略切换 + 多候选 | 单一可信推荐 + 秒级换一套 |
| Discover | 工具箱聚合（Packing/Should-I-Buy/Insights/Style） | 取消作导航；能力转情境入口 |
| 激活 | 次日才见 Today | 导入即出首套（同 session） |
| 文案 | 部分 hardcoded / 绕过 i18n | 全部进 i18n / copy registry |
| learning 信号 | 依赖"穿了"按钮 | 被动信号优先 + 标准化 telemetry |
| 设计语言 | 偏 28–38 职场通勤感 | Soft Utility for Real Life，跨 20–60 |

---

## 1. 当前 FE 代码观察

当前 FE 已经具备不少基础：

```text
Expo / React Native
React Navigation
React Query
Zustand
typed i18n
design tokens
UI primitives barrel
regression test script
```

但产品形态仍然偏"功能集合"，而不是"一个为目标用户服务的主体验"。几个明显信号：

```text
1. MainTabs 仍是 Today / Wardrobe / Discover / Settings
2. Discover 里聚合 Packing、Should-I-Buy、Insights、Style Inspiration 等工具
3. Today 仍存在 safe / fast / stylish 策略切换轨道
4. 多个 screen 有本地 palette / hardcoded copy / screen-level style
5. i18n 已有基础，但部分 onboarding / permission / error 文案仍绕过 i18n
```

这些不是小 bug，而是说明前端需要一次"体验系统"重构。

---

## 2. 新 IA Spec

MVP 一级入口建议冻结为：

```text
Today / Wardrobe / Ask / Profile
```

不要再把 Discover 作为一级 tab。

### 2.1 Today

唯一主入口。职责：

```text
给一套 / 解释为什么 / 换一套 / 轻反馈 / 轻 insight / 一句话 override
```

Today 不是"推荐列表"，也不是"策略选择器"。Today 是早上的 decision automation。

### 2.2 Wardrobe

数据底座，不抢主路径。职责：

```text
导入 / 查看 / 轻编辑 / 找回忘了的衣服
```

### 2.3 Ask

特殊场景入口。职责：

```text
一句话改今天推荐 / 特殊场合穿搭 / focused item 搭配 / 旅行 / 购物 / 临时约束
```

Ask 不应该藏在 Discover 里。

### 2.4 Profile

账号、隐私、语言、出门时间、数据说明。不放复杂 agent 设置。  
（数据说明文案见 `aidrobe-privacy-data-copy-v0_1.md` 与主方案 Principle 8。）

### 2.5 Contextual Entrances

这些能力不做一级 tab：

```text
Should-I-Buy / Trips / Packing / Wardrobe Health / Style Inspiration
```

通过情境触发：

```text
分享商品链接到 Aidrobe
Ask 里说旅行需求
Today insight 中提示
Wardrobe item detail 中发起
```

也就是：高意图时出现，不每天占用注意力。

---

## 3. 设计语言：Soft Utility for Real Life

Aidrobe 的设计语言不应该是时尚杂志风 / SaaS dashboard / AI chat app / 购物导购 / 社交晒图。建议定义为：

```text
Soft Utility for Real Life
```

关键词：

```text
温柔 / 干净 / 可信 / 早晨感 / 低负担 / 有生活气 / 不幼态 / 不审判
```

视觉方向：

```text
暖中性色 / 低对比但清晰 / 大留白 / 柔和卡片 / 真实衣物优先
少装饰 / 少信息噪音 / 少入口
```

交互方向：

```text
默认给结果 / 不强迫选择 / 可一键换 / 可一句话改
不打断 / 不追问 / 不把用户推入设置
```

### 3.1 Design must scale from 20 to 60

前端设计语言不能只服务 28–38 职场通勤感。它要能覆盖 20–60 女性，但不能变成无个性的"大众化"。

核心方法不是为每个年龄做一套 UI，而是保持统一产品气质，并让内容、推荐和语气随生活阶段变化（生活阶段约束见主方案 §0.5.1）。

统一气质：

```text
温柔 / 可信 / 不审判 / 真实可穿 / 少操作
```

随阶段变化：

```text
20s：更多探索、灵感、尝试
30s：更多通勤、效率、场景切换
40s：更多舒适、品质、低维护
50–60：更多体面、舒适、尊重既有审美
```

视觉上避免两个极端：

```text
不要过度少女化，导致 40+ 用户疏离
不要过度中性工具化，丢失悦己和生活气
```

文案上避免年龄标签（不说"适合成熟女性 / 显年轻 / 减龄 / 中年"），改说：

```text
更轻松 / 更稳妥 / 更适合今天 / 更像你最近喜欢的状态
```

---

## 4. Today Redesign Spec

Today v2 应该从"策略切换 + 多候选"改成"单一可信推荐"。

### 4.1 Above the Fold

只展示：

```text
今日一句话 / 一套真实 outfit / 2–3 条真实理由 / 天气 / 时间的轻提示
```

核心 CTA：

```text
穿这套 / 换一套 / 不喜欢 / 为什么
```

不默认展示：

```text
safe / fast / stylish 三个策略
多套候选卡 / 报告入口 / 日历入口 / 购物入口 / packing 入口
```

这些都是二级。注意：safe/clever 不是给用户的开关，而是后台按 wardrobe 规模/置信度切换的 ranking policy（主方案 Workflow 0、Workflow 3）。

### 4.2 Context Override

Today 应该支持一句话微调：

```text
今天有会 / 今天想舒服一点 / 今天不想穿裙子 / 今天要走很多路 / 今天想低调一点
```

UI 不是完整 chatbot，而是一个轻输入："今天有什么特别的吗？"用户不填也完全可用。

### 4.3 Reasoning

理由只来自真实上下文（天气 / 衣物 / 最近穿着 / 偏好 / 风格学习 / 场景 / 未穿衣物）。禁止模板化泛泛理由（文案规范见主方案 §6.5）。

### 4.4 Resurface Insight

Today 下方保留一个轻 insight，会成为留存钩子（主方案 Workflow 8）：

```text
这件你很久没穿了，今天刚好合适。
```

---

## 5. Onboarding Redesign Spec

当前 onboarding 仍偏"产品说明 + 权限 + 出门时间"。需要改成：

```text
先让用户感到有价值，再让用户配置。
```

推荐流程：

```text
1. Welcome：今天，穿成喜欢的自己
2. Add First Wardrobe：先加几件常穿的
3. Import Confirm：只确认明显错误
4. First Outfit：导入完成即出首套
5. Optional Style Memory：给一张喜欢的风格图，可跳过
6. Departure Time / Location：只在需要时轻问
```

权限请求后置到动作触发时（点拍照→请求相机；点相册→请求相册；要天气→请求定位）。不要在还没看到价值前集中索要权限。  
每个权限请求的 rationale 文案见 `aidrobe-privacy-data-copy-v0_1.md` C 节。

---

## 6. Import Redesign Spec

导入不是"全量录入"，而是"先抓在穿的 + 捞忘了的"（主方案 Workflow 1）。UI 应支持：

```text
平铺连拍 / 多图批量 / 相册穿搭照反向提取 / 商品链接 / 分享文案 / 订单邮件小票（后续）
```

导入完成后不停留在"已保存"，而是进入 First Outfit。也就是导入即激活。

> 工程现实：导入即出首套意味着同 session 串 Qwen-VL + cutout + LLM reasoning，
> 是一笔延迟/成本承诺（主方案 Workflow 0「工程现实」一节）。FE 侧对应要点：
> 分阶段点亮（先 metadata/缩略，再补 reasoning），loading/渐进展示，不要白屏等全部算完。

---

## 7. Component System v2

现有 UI primitives 可保留，但需要补一层产品语义组件。

### 7.1 Foundation Components

```text
Typography / Button / Card / Badge / ImageThumb
Skeleton / EmptyState / ErrorState / BottomSheet
```

### 7.2 Product Components

```text
DecisionOutfitCard / OutfitCanvas / RecommendationReasonList
ContextOverrideBar / FeedbackChipGroup / ResurfaceInsightCard
FirstOutfitActivationCard / SlotGapEmptyState / StyleMemoryCard
PassiveWearPrompt / WardrobeImportDock / ContextualEntrySheet
```

### 7.3 Agent Components

```text
AgentThinkingState / AgentMemoryNotice / AgentConfidenceNotice
AgentFallbackNotice / AgentQuestionCard
```

组件职责：Foundation 负责形态，Product 负责 workflow，Agent 负责智能状态表达。不要让 screen 文件继续承担所有产品逻辑。

---

## 8. Copy Governance v2

FE 需要严格落地"用户可见文案不硬编码"（主方案 Principle 6）。规则：

```text
所有用户可见字符串进入 i18n / copy registry
业务文案不写在 screen component 内
fallback copy 必须集中治理
禁止 demo/mock 词进入生产
CI 扫描 denylist
LLM/API reasoning 与静态 copy 分层
```

需要特别关注：onboarding benefits、permission screen、departure time screen、Today strategy labels、Discover tool titles、local palette 注释 / showcase copy、toast / error copy。  
其中 permission screen 与 Profile 数据说明的文案，统一取自 `aidrobe-privacy-data-copy-v0_1.md`，不在组件内另写。

---

## 9. Styling / Token Refactor

当前已有 `src/theme/design.ts`，是好的基础。但 screen 里仍存在大量局部 palette 和 hardcoded color。下一步：

```text
禁止新增 screen-level palette
颜色全部走 semantic tokens
补充 experience tokens
```

新增语义 token：

```text
morningBackground / warmSurface / decisionSurface / quietText
softAccent / trustGreen / cautionAmber / agentGlow
```

不要让每个页面自己定义审美。

---

## 10. Telemetry / Passive Learning Contract

为了支持"不依赖穿了按钮"（主方案 Workflow 4），FE 需要标准化事件：

```text
today_viewed / outfit_impression / outfit_accepted_intent / outfit_swapped
outfit_disliked / outfit_dislike_reason_selected / context_override_submitted
reason_expanded / resurface_insight_viewed / resurface_item_opened
first_outfit_generated / first_outfit_failed_gate / import_batch_completed
style_image_added / passive_wear_prompt_answered
```

事件要区分 explicit / implicit / weak inferred signal。不要把弱信号写成强偏好。

---

## 11. FE/BE Contract Needed

### 11.1 First Outfit / Cold Start

```json
{
  "state": "no_outfit | single_outfit | ready",
  "feasible_outfit_count": 0,
  "missing_slots": ["bottom"],
  "first_outfit": null,
  "reasoning": [],
  "gate_failures": ["missing_bottom", "image_unavailable"]
}
```

### 11.2 Today

```json
{
  "primary_outfit": {},
  "can_swap": true,
  "reasons": [],
  "resurface_insight": {},
  "context": {},
  "confidence": "safe | normal | exploratory"
}
```

### 11.3 Passive Learning

```json
{
  "event_type": "outfit_impression | outfit_swapped | dislike_reason | passive_confirm",
  "signal_strength": "weak | medium | strong",
  "source_surface": "today | ask | wardrobe"
}
```

### 11.4 Copy / Reasoning

LLM/API 返回的用户可见 reasoning 要标注来源：

```json
{
  "text": "今天有雨，所以避开了浅色鞋。",
  "source": "weather_rule | wardrobe_history | preference_memory | style_memory | llm",
  "referenced_item_ids": []
}
```

---

## 12. 重构优先级

### P0: IA + Today

```text
移除 Discover 一级 tab
Ask 提升为一级入口
Today 改成单推荐主体验
去掉默认策略菜单
加 context override
加 resurface insight
```

### P0: First Outfit

```text
导入完成即出首套
可行性 Gate
State 0 / State 1 / State ≥2
slot gap empty state
```

### P0: Copy Governance

```text
硬编码文案治理
i18n 覆盖 onboarding / permission / toast
copy lint / denylist
```

### P1: Design Language

```text
Soft Utility for Real Life token system
统一 screen palettes
组件语义层
```

### P1: Passive Learning

```text
事件标准化
弱信号 contract
轻量晚间确认
```

### P1: Contextual Shop / Trips

```text
Should-I-Buy 从一级入口降级
Trips 先在 Ask 支持一句话
```

> 说明：本节是 **FE 重构** 的优先级（先动 IA/Today，再动设计语言/learning），
> 与主方案 §10 的 **产品 feature 发布顺序** 是两个维度，不冲突，配合看。

---

## 13. 验收标准

前端改版不以"页面都做完"验收，而以体验闭环验收。

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
