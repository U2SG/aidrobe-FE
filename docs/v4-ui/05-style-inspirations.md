# 05 · 风格灵感 / PDF 摄取（Style Inspirations）

> 灵感画廊 + 风格学习来源。建议落位 = WardrobeTab 或 SettingsTab。

## 目的
用户收集风格灵感（图片/链接/PDF 杂志），系统据此学习个人风格、影响推荐。

## 落位（建议）
新增 `StyleInspirations`（画廊网格）、`AddInspiration`（modal：链接/图片/批量/PDF）。落位候选：WardrobeTab 工具区，或 SettingsTab「风格偏好」。

## 页面与关键 UI（画廊 + 现有卡片风）
- **StyleInspirations（网格）**：2 列瀑布/网格，每张灵感卡 `SignedImage`（`imageUrl`）+ 来源类型角标（`sourceType`）+ 学习状态（`learnStatus`：learned/queued，用 `StatusPill`）。长按/点击 → 删除（`deleteInspiration`，确认）。header「＋」→ AddInspiration。
  - 顶部可放「风格标签」编辑区（`updateStyleTags`）：当前标签 `Tag` 可增删。
  - 空态 `EmptyState`「添加你喜欢的风格图」+ CTA。
- **AddInspiration（modal）**：三种输入分段——
  - 单链接/图片（`imageUrl` 或 `sourceUrl`，至少一个）。
  - 批量链接（`urls[]`，≤20）。
  - PDF/杂志（`fileUrl` + 可选 `title`，异步摄取，返回 queued + `estimatedPages`，提示「处理中，稍后可见」）。

## 数据接线（`src/api/style.ts`）
- `listInspirations({limit, offset})` → `useQuery(['inspirations'])`（可分页/无限滚动）。
- `addInspiration({imageUrl?, sourceUrl?})` / `addInspirationsBatch(urls)` / `addPdfStyleSource({fileUrl, title?})` → `useMutation`，onSuccess invalidate `['inspirations']`。
- `deleteInspiration(id)` → onSuccess invalidate。
- `updateStyleTags(tags)` → onSuccess toast。
- 类型：`Inspiration {id, imageUrl, sourceUrl, sourceType, learnStatus, createdAt}`、`PdfStyleSourceResult {sourceId, status, estimatedPages}`。

## 可用性
PDF 摄取受 `ENABLE_PDF_STYLE_INGEST`（已开）门控，关时 503。其余灵感增删列表不门控。`learnStatus=queued` 表示后台学习中。

## 开放项（留整体设计）
- 落位（衣橱 vs 设置「风格偏好」）。
- 风格标签编辑放本页还是设置页。
- 灵感与推荐的关系是否要在 UI 上点明。
