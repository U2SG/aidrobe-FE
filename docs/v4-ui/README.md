# V4 功能 UI 规划总览

后端 V4 新功能的 **API client + 类型层已全部打通**（`src/api/*.ts` + `src/types/api.ts`），但**界面还没做**。本目录为每个新功能列出 UI plan，供基于「现有页面 + 新增功能页」统一出一份整体 UI 设计。

> **本目录是规划文档，不是实现。** 每份 plan 的导航落位均为**建议**，最终以整体 UI 设计为准。

## 统一设计语言（所有新页面遵循）

照 app 现有页面（`TodayScreen` / `OutfitDetailScreen` / `WardrobeListScreen`）和 `src/theme/design.ts` token，**不另起风格**：

- 颜色/圆角/间距/字号/阴影全部取自 `design.ts`：`colors / radius / spacing / type / shadow`。
- 卡片：`backgroundColor: colors.elevated` + `borderRadius: radius.lg|xl` + `...shadow.soft|elevated`。
- accent 暖铜色 `#B08D5B`（`colors.accent`）用于强调；状态色 success/warning/danger 配对 bg。
- 自定义 header：`headerShown:false` + `paddingTop:52` + 40×40 圆形返回按钮（`SystemIcon name="chevronLeft"`）。
- 轻量入场动画（`Animated` opacity + translateY，参考 `TodayScreen` riseAnim）。
- 状态组件统一用 `feedback/LoadingBlock | ErrorState | EmptyState`；按钮用 `forms/PrimaryButton | SecondaryButton`；标签 `ui/Tag`、状态点 `ui/StatusPill`。

## 现有导航结构（3 tab）

```
RootNavigator
├── Onboarding（Welcome / Permission / DepartureTime）
└── Main（底部 3 tab）
    ├── TodayTab    → Today / OutfitDetail / FeedbackSheet(modal)
    ├── WardrobeTab → WardrobeList / ItemDetail / AddItem / ImportConfirm / ImportFailure
    └── SettingsTab → Settings / DepartureTime
```

`SystemIcon` 现有图标：home wardrobe person camera photo link share search slider bell chart shield clock sparkle chevronRight chevronLeft x check heart refresh trash more download exclamation recycle。**缺日历/书签/购物袋等字形——新功能入口图标需补几个**（描边风格与现有一致）。

## V4 功能 → 页面 → 建议落位

| # | 功能 | 新增页面 | 建议落位 | API client | plan |
|---|---|---|---|---|---|
| 1 | 穿搭日历 | OutfitCalendar + OutfitPlanPicker(modal) | TodayTab | `outfitPlan.ts` | [01](./01-outfit-calendar.md) |
| 2 | 打包清单 | PackingList / PackingListDetail / CreatePackingList | WardrobeTab | `packingList.ts` | [02](./02-packing-list.md) |
| 3 | Ask 问答 | AskAidrobe（对话式） | TodayTab | `ask.ts` | [03](./03-ask.md) |
| 4 | 购物理性检查 | SenseCheck + SenseCheckHistory | 待定（购物入口） | `shopping.ts` | [04](./04-shopping-sense-check.md) |
| 5 | 风格灵感 / PDF | StyleInspirations（画廊）+ AddInspiration(modal) | WardrobeTab/Settings | `style.ts` | [05](./05-style-inspirations.md) |
| 6 | OOTD 海报 | OotdPosterCompose(modal) + 结果 | TodayTab（OutfitDetail 入口） | `ootdPosters.ts`+`outfitVisual.ts` | [06](./06-ootd-poster.md) |
| 7 | 衣橱报告 + 洞察 | Insights / WardrobeReport | WardrobeTab/Settings | `insights.ts` | [07](./07-wardrobe-report.md) |

## 跨功能横切项

- **签名图片 URL（E5）**：`outfitVisual.ts` 与 OOTD 海报、衣物图片返回的 `imageUrl` 是 ~30 分钟签名 URL。**不持久化**，会话内 `<Image>` 用，过期回父端点重取。建议封装一个 `SignedImage` 组件统一处理（占位/失败重取）。见各相关 plan。
- **Feature flag / 503**：calendar/packing/sense-check/ask/ootd/report/pdf 均后端 flag 门控，关时返回 503。统一处理：查询 error 判 `status===503` → 渲染「该功能尚未开放」面板（非报错态）。已在后端 `.env` 全部开启。
- **数据预置依赖**：ask（LLM）、sense-check（视觉/向量）、ootd（图像模型）依赖外部服务/数据；calendar/report 需已有搭配/穿着数据才有内容。各 plan 标注。
- **查询键约定**：`['outfitCalendar', start, end]`、`['packingLists']`、`['inspirations']`、`['askHistory']`、`['wardrobeReport', period]` 等，沿用现有 `[资源, ...参数]` 风格。
- **埋点**：`useTrack()`，事件加进 `src/utils/analytics.ts` 的 `ANALYTICS_EVENTS`。

## 待整体 UI 设计拍板的关键问题

1. **导航容器**：4 个工具型功能（打包/灵感/sense-check/报告）塞进现有 tab，还是新增一个「工具/发现」tab 或入口聚合页？现有只有 3 tab。
2. **入口聚合**：Today 顶部/衣橱顶部要不要一排功能入口（日历/Ask/海报…）？
3. **Ask / sense-check** 是否做成全局可唤起（如 Today 的搜索/提问入口）。
4. 需要补的入口图标字形清单（日历、购物袋、书签/灵感、报告/图表已有 chart）。
