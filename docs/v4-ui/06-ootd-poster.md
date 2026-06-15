# 06 · OOTD 海报（OOTD Poster）

> 把穿着自拍生成风格化海报。建议落位 = TodayTab（从 OutfitDetail / 穿着记录进入）。异步生成 + 轮询。

## 目的
从一次穿着（自拍）生成风格化 OOTD 海报，可分享。

## 落位（建议）
不是独立 tab。入口在 `OutfitDetail` 或穿着记录处加「生成海报」。新增 `OotdPosterCompose`（modal：合规 + 模板选择 + 生成）+ 结果展示（同 modal 内轮询完成）。

## 页面与关键 UI
- **OotdPosterCompose（modal）**：
  - 来源：已有穿着自拍 `wearHistoryId`，或显式 `ootdImageUrl`。
  - **合规告知**：因图像交给第三方模型，必须先展示「AI 效果图仅供参考」+ 同意勾选，勾选后 `consent=true` 才能提交（后端要求）。
  - 模板选择：`minimal | studio | street`（分段控件，`Tag` 选中态）。
  - `PrimaryButton`「生成海报」。
  - 生成中：`LoadingBlock`「生成中…」；展示后端返回的 `disclaimer` 文案。
  - 完成：`SignedImage` 展示海报 + 分享按钮（`SystemIcon share`）。
- 结果是异步：创建返回 `assetId` + `generationStatus:"queued"`，需**轮询** `getOutfitVisualAsset(assetId)` 直到 `generation_status` 完成/失败（参考 `ImportConfirmScreen` 的 `refetchInterval` 轮询）。

## 数据接线（`src/api/ootdPosters.ts` + `outfitVisual.ts`）
- `createOotdPoster({ootdImageUrl?, wearHistoryId?, templateId, consent})` → `useMutation`，返回 `{assetId, generationStatus, disclaimer}`。
- `getOutfitVisualAsset(assetId)` → `useQuery(['outfitVisualAsset', assetId], …, {refetchInterval: 轮询直到终态})`；`imageUrl` 为签名 URL（`SignedImage`），`errorCode/errorMessage` 处理失败态。
- 类型：`OotdPosterResult`、`OutfitVisualAsset {assetId, generationStatus, imageUrl, visualType, errorCode, errorMessage}`。

## 可用性
`ENABLE_OOTD_POSTER` 已开，实测创建返 **202** queued（正常）。实际出图依赖图像模型/存储。

## 开放项（留整体设计）
- 入口位置（OutfitDetail / 穿着完成后 / 日历已穿 cell）。
- 合规告知的呈现形式（首次弹窗 vs 每次勾选）。
- 海报分享渠道。
