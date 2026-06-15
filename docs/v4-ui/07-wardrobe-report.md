# 07 · 衣橱报告 + 洞察（Insights & Wardrobe Report）

> insights API 早已就绪但**完全没有屏**——缺口最明显。建议落位 = WardrobeTab 或 SettingsTab。

## 目的
- 日常洞察：衣橱概览、最常穿、闲置、配色、风格趋势、单件成本。
- 周期报告：类「年度总结/Spotify Wrapped」的半年/年度衣橱报告。

## 落位（建议）
新增 `Insights`（日常洞察聚合屏）+ `WardrobeReport`（周期报告，可作 Insights 内入口或独立屏）。落位候选：WardrobeTab header 入口，或 SettingsTab。

## 页面与关键 UI（卡片化数据，统一现有风）
- **Insights**：竖向若干 `elevated` 卡片：
  - 概览：总件数 / 活跃率 / 闲置数（`getInsightsSummary`）。
  - 最常穿 Top（`getTopItems`）：缩略 + 穿着次数横向列表。
  - 闲置单品（`getIdleItems`）：缩略 + 最近穿着日。
  - 配色分布（`getColorPalette`）：色块 + 占比（简单条/色点）。
  - 风格趋势（`getStyleTrend`）：按月标签频次（简易柱/折线，`react-native-svg` 手绘）。
  - 单件成本（`getCostPerWear`）：列表，cost-per-wear 数值（注意是后端 Decimal→已转 number）。
  - 入口「查看 2026 上半年报告」→ WardrobeReport。
- **WardrobeReport（period 如 `2026-H1`）**：`getWardrobeReport(period)` 一次拿全量结构 —— 标签/区间、总穿着数、top items、top combos、配色、风格关键词、风格趋势（current/previous/rising/fading）、最高 cost-per-wear、最久闲置、推荐采纳率。`is_empty` 时显示空态。做成可纵向滚动的「故事卡」序列。

## 数据接线（`src/api/insights.ts`）
- 各 `getXxx` → `useQuery(['insights','summary'])` / `['insights','topItems']` …。
- `getWardrobeReport(period)` → `useQuery(['wardrobeReport', period])`。
- 周期选择：H1/H2/年度，`period` 字符串如 `2026-H1`。

## 可用性
`getWardrobeReport` 受 `ENABLE_WARDROBE_REPORT`（已开）门控，关时 503。其余 insights 不门控（空衣橱返回空结构，已验证 reports 空态 `is_empty:true`）。

## 开放项（留整体设计）
- Insights 与 Report 合并为一屏可展开，还是两屏。
- 趋势/配色图表的视觉规格（手绘 SVG 的样式）。
- 落位（衣橱 vs 我的）。
- period 选择器形态。
