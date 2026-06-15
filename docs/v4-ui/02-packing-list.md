# 02 · 打包清单（Packing List）

> 场景化工具。建议落位 = WardrobeTab。

## 目的
旅行/出差前，按天数 + 场景从衣橱生成打包清单，逐项核对。

## 落位（建议）
WardrobeTab stack 新增：`PackingList`（列表）、`PackingListDetail`（单清单）、`CreatePackingList`（modal 表单）。入口：WardrobeList header 或工具入口区。

## 页面与关键 UI（统一现有卡片风）
- **PackingList（列表）**：每条清单一张 `elevated` 卡片：目的地 + 天数 + 场景标签（`Tag`）+ 状态（`StatusPill`：draft/active/archived）。空态 `EmptyState`「还没有打包清单」+ CTA。右下「＋」或 header 按钮 → CreatePackingList。
- **CreatePackingList（modal 表单）**：目的地（可选）、天数（stepper 1–90）、场景多选（commute/casual/formal/…，`Tag` 可选中）、出发日期（可选）、天气提示（可选）。`PrimaryButton`「生成清单」。
- **PackingListDetail**：按 `day` 分组（Day 1/2/3…），每组下按 `scene` 列出条目 `PackingItem`（itemId → 衣物缩略 + 名称 + notes）。条目可勾选（本地完成态）；header 提供状态切换（draft→active→archived）。

## 数据接线（`src/api/packingList.ts`）
- `listPackingLists()` → `useQuery(['packingLists'])`。
- `getPackingList(id)` → `useQuery(['packingList', id])`。
- `createPackingList({destination?, days, scenes, weatherHint?, departureDate?})` → onSuccess invalidate `['packingLists']` + 跳 Detail。
- `updatePackingList(id, {items?, status?})` → onSuccess `setQueryData(['packingList', id])` + invalidate 列表。
- 类型：`PackingList / PackingEntry`（`itemId, day, scene, notes`）。
- 条目衣物展示：`itemId` → `getWardrobeItem(itemId)`（`useQueries` 批量，参考 FeedbackSheet）或后端若附带衣物信息则直接用。

## 数据前置
生成依赖衣橱已有衣物；空衣橱清单为空。

## 开放项（留整体设计）
- 「完成勾选」是纯本地态还是写回（当前 update 端点接收整份 items，可承载）。
- 场景选项的标准集合（与 `FitScene` 对齐：commute/formal/casual/date/travel）。
- 列表/详情是否合并为单页可展开。
