# 01 · 穿搭日历（Outfit Calendar）

> 已与用户确认布局与范围；可直接实现。导航落位 = TodayTab。

## 目的
计划未来穿搭 + 回看已穿穿搭，补足核心推荐之外的「规划/回顾」闭环。

## 落位
TodayTab stack 新增：`OutfitCalendar`（普通屏）、`OutfitPlanPicker`（modal，参数 `{ plannedDate }`）。入口：`TodayScreen` header 右侧加日历图标按钮。

## 布局（已定：混合）
- **顶部紧凑月视图**：7 列网格（周一为首，表头 一二三四五六日），`‹ 2026 年 6 月 ›` 切月。每格日号 + 标记：当日 cells 有 `worn` → 实心点（accent/ink）、有 `planned` → 空心环（accent）、今天 → 日号高亮。点格 → 选中日。
- **下方议程区**：展示选中日（默认今天）的 cells。

## v1 范围（已定）：看 + 计划 + 标记已穿
- worn cell：缩略图（`ootdImageUrl` 有则 `SignedImage`，无则 `GarmentSvg` 占位）+ 标题 + 「查看详情 ›」→ `OutfitDetail({outfitId})`。
- planned cell：标题 + `StatusPill` 已计划 + `PrimaryButton`「标记已穿」。
- 空：`EmptyState` CTA「＋ 计划穿搭」→ `OutfitPlanPicker`。
- **不做**：改期 / 取消（update 端点留后续）。

## 数据接线（`src/api/outfitPlan.ts`）
- `getOutfitCalendar(start, end)` → `useQuery(['outfitCalendar', start, end], …, {staleTime:5min, retry:1})`，切月自动重取。
- `markPlanWorn(outfitPlanId)` → onSuccess invalidate `['outfitCalendar']` + toast「已标记为已穿」。
- `createOutfitPlan({outfitId, plannedDate})`（在 picker）→ onSuccess invalidate + toast「已计划到 {date}」+ goBack。
- picker 候选：`getTodayRecommendation('commute').outfits` + `getOutfitHistory({limit})`，合并去重点选即计划。
- 类型：`CalendarDay/CalendarCell/CalendarOutfit/OutfitPlan`（`src/types/api.ts`）。

## 新增/修改文件
- 新增 `src/screens/today/OutfitCalendarScreen.tsx`（含 co-located `MonthGrid`、`DayAgenda`）、`src/screens/today/OutfitPlanPickerScreen.tsx`、`src/utils/date.ts`（`toISODate / monthRange / buildMonthGrid`）。
- 改 `src/types/navigation.ts`（TodayStackParamList +2）、`TodayNavigator.tsx`（注册两屏）、`SystemIcon.tsx`（+`calendar`）、`TodayScreen.tsx`（入口按钮）、`analytics.ts`（+calendar 事件）。

## 数据前置
完整「计划→已穿」闭环需 dev 用户已有推荐/历史搭配，picker 才有候选。空数据下可验证月网格/切月/空 CTA/503 处理。

## 开放项（留整体设计）
日历入口图标样式；是否同时提供「本周」快捷视图。
