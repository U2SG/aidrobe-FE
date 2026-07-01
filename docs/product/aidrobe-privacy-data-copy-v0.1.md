# Aidrobe 隐私与数据说明文案（Product Trust Copy）

**Version:** v0.1  
**Status:** Draft  
**Companion to:** `aidrobe-mvp-workflow-agent-responsibility-design-v0_8.md`（Principle 8、§12 Privacy Acceptance）  
**Audience:** 产品 / 文案 / 工程 / 法务  

---

## ⚠️ 先说清楚这份文档是什么

这是**产品信任文案**，不是法律隐私政策。

目标是主方案 Principle 8 要的那件事：

```text
Profile 里有一处人话写的数据说明，
而不是法务条款堆砌。
```

让用户读得懂、信得过、控制得了。它**不替代**正式的隐私政策 / 用户协议 / 区域合规
（GDPR / CCPA / PIPL 等）。下面每一条对外承诺，上线前都必须满足两件事：

```text
1. 法务过一遍（措辞、合规、区域差异）
2. 和后端实际数据处理一致——产品说不做的，后端真的不做
```

凡是涉及"留多久、存在哪、发给谁"的具体声明，本文档用占位符标出，
真实数值/事实见文末「H. 还需要确认的开放项」，不在这里编造。

文案治理：这些字符串全部进 i18n / copy registry（主方案 Principle 6），
**不在组件里 hardcode**。建议 key 见文末 G 节。  
语气遵循主方案 §6.5 与 Principle 7：温柔、具体、不审判、不制造焦虑、不身材规训。

默认语言 zh-CN。en-US 需人工翻译，**不机翻法律含义**。

---

## A. Profile 数据说明主页（in-app 主文案）

放在 Profile，入口可叫"你的数据"或"隐私与数据"。  
原则：先讲为你做什么，再讲不做什么，最后给控制权。短、可扫读。

```text
标题：
你的衣橱，只属于你

开头：
Aidrobe 需要了解你的衣服和习惯，才能帮你少纠结、穿得像自己。
这些信息只为这一件事服务。

—— 我们会用到 ——
· 你上传的衣物照片
· 你的穿着、换一套、不喜欢等使用行为
· 你保存的风格灵感
·（你授权后）天气和大致位置

—— 用来做什么 ——
· 识别你的衣物，自动整理
· 每天给你一套可信的搭配
· 记住你的偏好，让推荐越来越准
· 帮你重新穿起被忘记的衣服

—— 我们不会做 ——
· 不拿你的照片和数据去训练模型
· 不卖给、不默认共享给第三方
· 不用它们给你做广告画像

—— 你可以随时 ——
· 查看 Aidrobe 记住了你的哪些偏好
· 纠正不准的判断
· 删除任何一件衣物、任何一条记录
· 删除全部数据或注销账号

底部：
想看完整法律条款？阅读《隐私政策》。
```

> 注：「我们不会做」这三条是信任的定义点，也是最敏感的承诺。
> 必须确认后端真的不做（见 H 节），否则不能写。

---

## B. "Aidrobe 记住的关于你"——推断结果可见与可纠正

对应 Principle 8："life-stage / 偏好 / 身材相关推断结果，用户可查看、可修正、可清空。"  
这一屏让"它越来越懂我"变得可被检查，而不是黑箱。

```text
标题：
Aidrobe 记住的关于你

说明：
这些是 Aidrobe 从你的使用里学到的，不是你填的表。
不准的地方，随时改。

—— 你的偏好（示例条目，实际由真实信号生成）——
· 偏好干净、冷调、通勤感的搭配      [这不准]  [删除]
· 不太穿亮色                        [这不准]  [删除]

—— 最近的穿着倾向 ——
· 常穿：那条黑色西裤
· 很少出现：浅色的几件上衣

底部动作：
清空 Aidrobe 学到的全部偏好
```

### B.1 身材相关推断的展示规则（硬约束，来自 Principle 7）

```text
默认不把任何"身材标签"作为推断结果展示给用户。
若系统内部存在版型/合身相关信号，对用户只能用"功能性"措辞，不用"规训性"措辞。

允许（功能性）：
· 偏好宽松版型
· 偏好高腰下装
· 偏好有支撑感的鞋

禁止（规训性）：
· 梨形 / 苹果形身材
· 需要显瘦 / 遮肉 / 拉长比例
· 任何把身体描述成"待修正问题"的标签
```

---

## C. 权限请求文案（动作触发时）

权限后置到用户点击对应动作时再请求（FE spec §5）。每条 rationale 用一句话说清"对你有什么用"，不恐吓。

```text
相机
标题：拍下你的衣服
说明：Aidrobe 帮你自动识别和整理，不用手动填。

相册
标题：从你的照片里挑衣服
说明：直接用已有的照片，不用重拍一遍。

位置
标题：看今天的天气
说明：知道冷不冷、会不会下雨，推荐才靠谱。也可以只填城市，不用精确定位。
```

被拒绝后的兜底（不要把"不同意就没法用"写成威胁）：

```text
相机/相册被拒：
没问题。你也可以稍后在设置里开启，或先用其他方式添加衣服。

位置被拒：
没关系。告诉我你在哪个城市就行，我用城市天气来推荐。
```

---

## D. 删除与注销文案

把"删一件"、"清空数据但留账号"、"彻底注销"分清楚，避免误操作。

```text
删除这件衣物
它会从你的衣橱移除，相关的推荐记录也一并清理。

清空全部数据（保留账号）
清空你的衣物、使用行为和 Aidrobe 学到的偏好，相当于重新开始。账号还在。

注销账号
永久删除你的账号和全部数据。
删除会在 {RETENTION_WINDOW} 内完成，期间无法恢复。
确认前我们会再问你一次。
```

> `{RETENTION_WINDOW}`（如"X 天"）是占位符，真实数值取自实际数据生命周期 + 法务，
> 不在文案里凭空写一个数字。见 H 节。

---

## E. 第三方 AI 处理披露

主方案 Principle 8 要求："第三方处理边界对用户可解释（哪些数据、为什么、去了哪）。"

```text
标题：Aidrobe 怎么用 AI 理解你的衣服

说明：
Aidrobe 用 AI 来识别你的衣物、理解风格、生成搭配。
为此，必要的内容（比如衣物照片）会发给提供这项能力的服务来处理。
我们只发完成任务所必需的内容，处理结果用于给你推荐。
```

> 这段必须和真实的数据流、vendor 条款一致：到底发了什么、发给谁、对方留不留、
> 是否用于其训练。任何一项不确认，就不能这样写。见 H 节。

---

## F. 语气与禁用清单（本域的 copy governance）

```text
用：
· 为你服务 / 只属于你 / 你可以随时 / 不准就改
· 具体、平实、给控制权

不用：
· 法务黑话堆砌（"在适用法律允许范围内，我们可能…"）
· 模糊收集措辞（"我们可能收集与你相关的各类信息"）
· 恐吓式（"不同意将无法使用 Aidrobe"）
· 任何身材规训标签（见 B.1）
· demo / mock / placeholder 占位文案进生产（主方案 denylist）
```

---

## G. 建议 i18n Key Map

集中在一个 namespace，便于治理与审查。

```text
privacy.statement.title
privacy.statement.intro
privacy.statement.collect.title
privacy.statement.collect.items.[clothes|behavior|inspiration|location]
privacy.statement.use.title
privacy.statement.use.items.[recognize|daily_outfit|preference|resurface]
privacy.statement.notDo.title
privacy.statement.notDo.items.[no_training|no_share|no_ad_profiling]
privacy.statement.control.title
privacy.statement.control.items.[view|correct|delete_item|delete_all]
privacy.statement.policyLink

privacy.memory.title
privacy.memory.subtitle
privacy.memory.action.markWrong
privacy.memory.action.delete
privacy.memory.action.clearAll

permission.camera.[title|body|denied]
permission.photos.[title|body|denied]
permission.location.[title|body|denied]

data.delete.item
data.delete.allKeepAccount
data.delete.account.[body|retentionWindow|confirm]

privacy.thirdParty.title
privacy.thirdParty.body
```

---

## H. 还需要确认的开放项（法务 / 后端，不能由文案凭空决定）

这些是上线前必须坐实的事实，本文档故意没替它们编答案：

```text
1. 数据保留期：注销后多久真正删除（D 节 {RETENTION_WINDOW}）
2. 处理位置：哪些在端上、哪些上云
3. 第三方 vendor 清单与边界：发给谁、发什么、对方留存与是否用于其训练（E 节）
4. "不用于训练"的真实承诺范围：确保产品声明与后端实践一致（A 节「我们不会做」）
5. 默认共享/分析的真实情况：是否有任何默认数据使用是用户没意识到的
6. 区域合规：GDPR / CCPA / PIPL 等对文案与同意机制的具体要求
7. 正式《隐私政策》《用户协议》：本文档是产品文案，不替代法律文本
```

原则一句话：

```text
产品可以把话说得温柔、清楚、给控制权，
但每一句"我们不做什么"，后端都得真的不做。
信任是这么来的，也只能这么来。
```
