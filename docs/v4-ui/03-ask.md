# 03 · Ask 问答（Ask Aidrobe）

> 自然语言问搭配/衣橱。建议落位 = TodayTab。⚠️ 后端 LLM 本环境未接（返 503/5001），需先确认后端可用再联调。

## 目的
用自然语言问「明天通勤穿什么」「这件配什么」，返回答案 + 关联衣物。

## 落位（建议）
TodayTab stack 新增 `AskAidrobe`（对话式单屏）。入口：Today 顶部「提问/搜索」入口，或全局可唤起的输入条。

## 页面与关键 UI（对话式，仍用现有卡片/色板）
- **AskAidrobe**：
  - 顶部历史/当前会话；底部输入框（`question`，多行，≤2000 字）+ 发送按钮（`PrimaryButton` 风格）。
  - 提交后展示「问题气泡 + 回答卡片」。回答卡片 `elevated`；`itemRefs`（衣物 id 列表）渲染为可点缩略行 → `ItemDetail({itemId})`。
  - 可选携带 context：当前 `scene`（默认 commute）、`timeLeftMinutes`（复用 Today 的剩余分钟）。
  - 历史：进屏 `getAskHistory()` 列出过往问答（时间倒序）。
  - loading：发送中显示思考态（`LoadingBlock` 或打字态）。

## 数据接线（`src/api/ask.ts`）
- `askAidrobe({question, context?})` → `useMutation`，onSuccess 把结果 append 到本地会话列表 + invalidate `['askHistory']`。
- `getAskHistory(limit, offset)` → `useQuery(['askHistory'])`。
- 类型：`AskResult {askSessionId, answer, itemRefs, tokensUsed}`、`AskHistoryEntry {askSessionId, question, answer, itemRefs, createdAt}`。
- `itemRefs` 衣物：`getWardrobeItem(id)` 批量取缩略。

## 503/可用性
后端 `ENABLE_ASK_AIDROBE` 已开，但本环境 LLM 客户端未接 → 实测返 503「Ask is not available」。UI 需对 503 显示「问答暂未开放」态；联调前需后端把 LLM 接好。

## 开放项（留整体设计）
- 是否做成全局可唤起（Today 搜索条/悬浮入口）而非独立屏。
- 单会话 vs 多会话历史的呈现。
- `tokensUsed` 是否对用户可见（配合 cost-summary）。
