# 04 · 购物理性检查（Shopping Sense-Check）

> 「该不该买」对照现有衣橱。落位待整体设计定（购物入口）。

## 目的
贴一个商品链接/图片，判断是否值得买：给 verdict（buy/consider/skip）+ 理由 + 衣橱里相似单品 + 缺口 + 可搭潜力。

## 落位（建议，待定）
新增 `SenseCheck`（输入 + 结果）、`SenseCheckHistory`（历史）。落位候选：WardrobeTab 工具区，或未来「发现/购物」入口。移动端用**上传图片/粘贴链接**两种输入。

## 页面与关键 UI（结果卡片为主）
- **SenseCheck**：
  - 输入：粘贴商品链接（`sourceUrl`）或选图上传（`imageUrl`，走现有上传/presign）。`PrimaryButton`「检查一下」。
  - 结果卡片（`elevated`）：
    - **verdict** 大字 + 色彩编码（buy→success / consider→warning / skip→danger，用 `StatusPill` 或大徽标）。
    - **reason** 文案。
    - **outfitPotential** 数值（可做 0–N 的可搭套数小指标）。
    - **similarItems**：衣橱中相似单品（itemId + similarity%）→ 缩略行，点进 ItemDetail。
    - **wardrobeGap**：缺口标签列表（`Tag`）。
- **SenseCheckHistory**：历史结果列表，每条 verdict + 缩略 + 时间。

## 数据接线（`src/api/shopping.ts`）
- `senseCheck({imageUrl?, sourceUrl?})` → `useMutation`，onSuccess 展示结果 + invalidate `['senseCheckHistory']`。
- `getSenseCheckHistory(limit, offset)` → `useQuery(['senseCheckHistory'])`。
- 类型：`SenseCheckResult {verdict, reason, similarItems[{itemId,similarity}], wardrobeGap[], outfitPotential}`、`SenseCheckHistoryEntry`（+id/imageUrl/sourceUrl/createdAt）。

## 可用性
后端 `ENABLE_SENSE_CHECK` 已开；实测对**无效 URL** 返 500（后端健壮性问题，应返友好错误）。UI 需对 500/422 给「无法解析该链接/图片」提示，别裸报错。

## 开放项（留整体设计）
- 落位与入口（独立 tab？衣橱内？分享拉起？）。
- 图片输入走上传还是仅链接（移动端优先上传/相册）。
