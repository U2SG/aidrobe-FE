# Backend 接口缺口（前端联调记录）

> **更新（V3+）**：原 P0–P3 的 13 项缺口里，**12 项已经在后端 V3+ 升级中交付**（见 `docs/ios-api-v3plus-update.md`）。本文档保留作为历史与剩余跟进项追踪。

## ✅ 已交付（前端已接入）

| 原条目 | 后端实现 | 前端状态 |
|---|---|---|
| §1 OutfitResponse.scores | `OutfitScoresResponse`（aesthetic / feasibility / fit / total / prep_minutes / rules_version），flag `ENABLE_OUTFIT_SCORES` | `OutfitDetailScreen` 已用 `apiScores`（0..1 → 0..100），degrade 为 — 当 flag 关 |
| §2 OutfitResponse.obstacles | `ObstacleResponse[]`（kind / item_id / severity / title:I18nMessage / replacement_candidate_ids），flag `ENABLE_OBSTACLES` | `primaryObstacle` 渲染优先级最高的一条；`findReplacement` 选第一件可穿候选 |
| §3 OutfitResponse.prep_steps / prep_notes | `I18nMessage[]`，flag `ENABLE_PREP_STEPS` | "取衣与准备"卡片已使用 `apiPrepSteps`，prep_notes 一并渲染 |
| §4 hero 视觉 | 仍是客户端布局（HERO_LAYOUT 静态坐标），按 item.category 选 GarmentSvg | 暂不需后端动作 |
| §5 单件按天热力图 | `GET /v1/wardrobe-items/{item_id}/wear-history?days=60` 返回 `daily_counts: { date → count }` + `entries[]` | `ItemDetailScreen` 调 `getItemWearHistory()`，`buildIntensitySeries` 把 dict 折成 60 格 4 级强度 |
| §6 last_worn | `WardrobeItemResponse.last_worn` 已加 | `WardrobeItem.lastWorn` 已显示 |
| §7 purchase_date | `WardrobeItemResponse.purchase_date` 已加 | 信息行显示"购于 YYYY-MM-DD" |
| §8 换一套语义 | `POST /v1/recommendations/today/refresh`，按日 3 次限流，flag `ENABLE_TODAY_REFRESH` | `refreshTodayRecommendation()` + 429 友好提示 |
| §9 prep_minutes | 在 `OutfitScoresResponse` 内 | 已映射 |
| §10 天气/场景上下文 | `TodayContextResponse.weather`（temperature_c / feels_like_c / rain_probability / condition）+ `scene` + `fetched_at`，flag `ENABLE_TODAY_CONTEXT` | TodayScreen "多云 18° · 通勤"已动态化 |
| §11 批量 feedback | `POST /v1/recommendations/outfits/{outfit_id}/feedback/bundle`，单事务回滚 | `sendOutfitFeedbackBundle`，FeedbackSheet 已切换 |
| §12 4 档 overall | `feedback_type: love / like / neutral / dislike` | `OVERALL_OPTIONS` 直接映射 4 档 |
| §13 reason_tags 候选目录 | `GET /v1/recommendations/feedback-tags?scene=`，按场景返回 `[{ key, label_zh_cn, applies_to }]` | `getFeedbackTags('commute')` query，缺省回退 `FALLBACK_TAGS` |

附加新增（V3+ 交付，前端已接入）：

- `WardrobeItemStatus` 枚举化为 `wearable | unavailable | dirty | lost | donated` — 前端 `ItemStatus` 同步收紧
- `I18nMessage` 契约（key + params + fallback_text）— `src/utils/i18n.ts:renderI18n` 暂时返回 fallback_text，留 key 查表的钩子
- `DELETE /v1/me`（30 天宽限期软删除）+ Apple 重新登录自动激活 — `src/api/account.ts:deactivateAccount`
- `POST /v1/me/data-export`（DSAR 异步导出）— `src/api/account.ts:requestDataExport`
- `GET /v1/user/cost-summary`（llm_ask / ocr_receipt / tryon 配额）— `src/api/account.ts:getCostSummary`
- `POST /v1/uploads/sts-token`（OSS 直传）— `src/api/uploads.ts:issueStsToken`
- 401 含 "Account deactivated" → 客户端清 token + 跳登录（`src/api/client.ts`）

---

## 🟡 仍开放 / 等待 V4

按 V3+ 文档 §12 列出的尚未发版的能力：

1. **图片 URL 短期签名** — 当前 `cover_image_url` 为 30 分钟签名的 OSS URL。前端**禁止持久化**这些 URL（已通过 in-memory `Image` cache 实现，但若后续支持离线/iCloud sync 时需重新设计 — 通过父端点重新签发）
2. **数据导出状态轮询** — `POST /v1/me/data-export` 只返回 `job_id`；目前没有 `/data-export/{job_id}` 状态查询。导出完成依赖推送/邮件。前端暂不展示进度条
3. **Try-on 流** — 私有桶 + 30 天自动清理；尚未发版
4. **OCR 收据解析** — 调用计数额度（`ocr_receipt`）已预占，端点未上线
5. **LLM Ask 会话** — token 配额（`llm_ask`）已预占，端点未上线
6. **PDF 导入** — 异步 job

---

## 🔶 V3+ iOS gotchas（前端已实现，记录避免回归）

| 风险 | 实现位置 |
|---|---|
| 401 "Account deactivated" 必须清 token | `src/api/client.ts:handleHttpError` |
| FeedbackBundle 422 是全量回滚（不能展示部分成功） | `FeedbackSheetScreen.submit` 不在 catch 里 toast 部分成功 |
| Today refresh 503 = 功能开关关 | `client.ts` 通用 503 toast；调用方继续可用 |
| Today refresh 429 = 当日已达 3 次 | `TodayScreen.refreshMutation.onError` 给特定文案 |
| Image URL 不要持久化 | RN `Image` 默认按 source URL hash 在内存里缓存，不入磁盘 — 当前实现兼容 |
| Replacement candidate 可能 404 | `findReplacement` 只挑 `status === 'wearable'` 的；用户点击后若 404 可回退到下一个（待补） |
| I18nMessage 的 key 优先 fallback_text | `renderI18n` 当前直返 fallback_text；待 i18n 字典就位时改 key 查表 |

---

## 📋 后续如要给后端的小条目

均为体验型，非阻塞：

1. **Replacement candidate 命中失败回退**：当用户点击替换、目标 item 已被改成 unavailable，前端目前提示通用错误。建议：替换接口返回 `409 + alternatives` 或前端预拉详情。
2. **I18n locale bundle**：`I18nMessage.key` 字典目前未发布；若打算支持 en-US，需要后端发布翻译 catalog 或前端 ship 一份本地副本。
3. **`/data-export/{job_id}` 状态轮询**：在 V4 上线前，前端只能告诉用户 "稍候推送"；提供轮询能改善体验。
4. **`/v1/recommendations/today/refresh` 的 429 响应里包含下次可用时间**：当前只能写死"明天再来"。建议返回 `retry_after_at: ISO8601`。
5. **批量替换** (`POST /outfits/:id/replacements`)：当一套里有 2+ obstacle，逐个换很啰嗦；不必现在做，仅记录设计选项。

---

## 联系 & 上线检查

- 前端 V3+ 联调状态：✅ typecheck + lint 全绿
- baseURL：`API_BASE_URL`（默认 `http://localhost:8000`）
- 鉴权：Bearer JWT 优先，dev 环境降级到 `X-User-Id`
- 验证 checklist：
  - [ ] flags 全 OFF 时所有屏幕仍可渲染（`scores / obstacles / prep / context = null` 兜底）
  - [ ] flags 全 ON 时所有数据按真实接口渲染
  - [ ] FeedbackBundle 422 不会出现部分写入提示
  - [ ] Today refresh 调用 3 次后第 4 次 toast "今日刷新次数已用完"
  - [ ] Account deactivate → 后续请求自动清 token 跳登录

> 文件位置：`D:\project\Python\aidrobe-frontend\docs\backend-gaps.md`
