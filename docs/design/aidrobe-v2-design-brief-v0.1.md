# Aidrobe V2 Design Brief（设计师 handoff）

**Version:** v0.1
**Status:** Draft — ready for external designer
**方向（已定）:** Evolve V1 — 进化现有 V1，不更换视觉风格
**Owner reference mock:** `docs/design/prototype/today-v2-evolve-v1.html`（可交互高保真，浏览器直接打开）

---

## 0. 这份文档给谁、怎么用

给接手 V2 视觉设计的设计师。一句话：**沿着现有 V1 的安静质感往前走**——保留它已验证的暖中性品牌色、一张大卡的构图和精修微件；把产品形态升级到 V2（单推荐、Ask 提升、导入即出首套）。不要另起一套视觉语言。

### 阅读顺序

| 序 | 文档 | 看什么 |
|---|---|---|
| 1 | 本文档 | 方向、Today 参考屏规格、do/don't、要交付的屏 |
| 2 | `docs/design/aidrobe-design-language-v0.1.md` | 颜色 / 排版 / 圆角 / 间距 / 阴影 / experience token（§6 是最终方向决策） |
| 3 | `docs/design/aidrobe-ui-ux-spec-v0.1.md` | IA、Today / Onboarding / Import 流程、First Outfit 状态机、屏级清单 |
| 4 | `docs/design/aidrobe-component-spec-v0.1.md` | 组件清单与状态（复用 / 扩展 / 新建） |
| 5 | `docs/product/aidrobe-privacy-data-copy-v0.1.md` | 隐私 / 权限 / 数据说明文案（唯一来源） |
| 6 | `docs/product/aidrobe-mvp-workflow-agent-responsibility-design-v0.8.md` | 产品 why、用户模型、不可再缩减核心 |

视觉对照：V1 真机截图见仓库根 `upg-02-today.png`；V2 Today 参考见上方 mock + 在线预览 https://claude.ai/code/artifact/d6c0e014-9029-40ba-b5ff-096f83b8efd2

---

## 1. 设计原则（必须遵守）

1. **进化 V1，不另起炉灶**：保住 V1 的暖中性品牌盘、一张大卡 flat-lay、精修微件（环形 badge / 引用框 / bullet 理由 / 深色大 CTA / 文字链次级）。
2. **原生优先**：圆角柔面、轻景深、原生 tab bar、≥`44px` 触控。不要编辑/印刷语法（锐角、发丝线、全大写 letterspaced、衬线大标题、低对比）——这些在 app 端割裂。
3. **一张安静大卡，不做卡片汤**：推荐用一张大卡承载；理由是卡内朴素 bullet，次级操作是文字链，不是一堆带投影的小卡片/小药丸。
4. **真实衣物是主角**：衣物图/插画舒展铺陈，占视觉中心；装饰退后。
5. **不审判 / 跨 20–60**：不用年龄、身材规训或制造焦虑的视觉与文案；正文 ≥`16/24`，对比度达 WCAG 基线。
6. **token 唯一来源**：颜色/字号/圆角/间距/阴影全部走 `src/theme/design.ts`，禁止页面级 palette 或硬编码 HEX。

详细色值/字阶/形态见 design-language doc §2–§5；最终方向与反模式见 §6。

---

## 2. Today v2 参考屏（已锁定的视觉锚）

这是 V2 的标杆屏，其他屏沿用同一语言。元素从上到下：

| 区域 | 内容 | 规格 / token |
|---|---|---|
| 头部 | `早上好，林` + `距出门还有 8 分钟 · 通勤`；右侧环形 badge（`8′ 出门`，环用 `accent`） | 标题 `largeTitle 30/700`；副行 `footnote`，`8 分钟` 用 `accent-2`；环 `accent`+`separator` conic |
| 一句话 | `今天有点闷热，给你配了套透气又利落的。`（关键词 `accent-2`） | `body 16/24`，`secondaryLabel` |
| **主卡（唯一大卡）** | 标题 `今日一套` + 右侧 meta `28° 多云 · 准备 5 分` | `elevated` 表面，`radius.xl 24`，`shadow.soft`（仅这一张卡有景深） |
| ↳ 衣物板 | 衣物浮在暖 wash 板上舒展铺陈（衬衫 / 阔腿裤 / 乐福鞋），各带小标签 | wash = `warmSurface`（不要 V1 的冷 `#EEF3F1`）；真实衣物色 |
| ↳ 理由 | 2–3 条朴素 bullet，每条带来源标签（`天气` / `穿着记录` / `天气规则`） | bullet 点 `accent`；正文 `body`；来源 `caption` `label-4` |
| ↳ 引用框 | 一句口语化总结（如 `经典又清爽，适合闷热的通勤早晨。`） | `secondaryElevated` 底，`radius.md` |
| ↳ 主 CTA | `今天穿这套`（深色大按钮，满宽） | `label` 底 + `inverse` 字，`radius.md`，高 `50px` |
| ↳ 次级 | `查看详情 · 不喜欢 · 换一套`（文字链 + 竖分隔，不是按钮） | `secondaryLabel`，分隔 `separator` |
| Resurface insight | `那件米白衬衫你三周没穿了，今天刚好合适。`（轻条，非重卡片） | 小圆 `accentSoft` 图标 + `body`；关键词 `accent-2` |
| 一句话 override | `今天有什么特别的吗？`（用户不填也可用） | `groupedBackground` 胶囊，`radius.pill`，前导 `+`(`accentSoft`) |
| Tab bar | `今日 · 衣橱 · Ask · 我的`（4 tab，选中态药丸） | `elevated`；选中 `accent-2` + `accentSoft` 药丸底 |

与 V1 的差异（务必体现）：去掉 `最稳妥/最省时/更有风格` 策略轨道 → 单推荐；新增 override / resurface insight；tab 从旧结构改为 `Today·Wardrobe·Ask·Profile`。

---

## 3. 还需要产出的屏（沿用同一语言）

按 `aidrobe-ui-ux-spec-v0.1.md` 的流程，优先级 P0 → P1：

| 屏 | 关键点 | 参考 spec |
|---|---|---|
| First Outfit 状态机 | State 0 `SlotGapEmptyState`（缺槽明示，不出假 outfit）/ State 1 `FirstOutfitActivationCard` / State ≥2 正常 Today | ui-ux §4.3 |
| Onboarding v2 | 价值前置（Welcome→加衣→确认→首套→可选 style memory→出门时间）；权限后置到动作触发 | ui-ux §3 |
| Import → First Outfit | 渐进点亮（metadata→cutout→reasoning），不白屏 | ui-ux §4 |
| Ask | 提升为一级 tab；一句话改今天 / 特殊场合 / 旅行 / 购物 | ui-ux §1.3 |
| Wardrobe / Profile | 数据底座；Profile 收账号/隐私/语言/出门时间/数据说明 | ui-ux §1.3 |
| 空 / 错误 / 加载态 | 清晰、不静默失败；引导下一步 | component-spec |

情境入口（Should-I-Buy / Trips / Insights / Style）不做一级 tab，按 ui-ux §1.2 走情境触发。

---

## 4. 交付建议

- 以 Today 参考屏为基准，先定 1–2 个关键屏的高保真，再铺全量。
- 产出物对齐 `src/theme/design.ts` 的 token 命名（颜色/字阶/圆角/间距），方便前端 1:1 落地。
- 所有用户可见文案进 i18n / copy registry；隐私文案以 privacy-data-copy doc 为准。
- 验收覆盖：Today、Onboarding、Import→First Outfit、空/错误态、动态字体 200%、窄屏 360dp。

---

## 附：mock 文件

- `docs/design/prototype/today-v2-evolve-v1.html` — **采用方向**（进化 V1）的 Today 参考。
- `docs/design/prototype/today-v2-codex.html` — 评审中被排除的「深绿+赤陶+宋体」编辑向探索，仅作反例对照，**不作为方向**。
