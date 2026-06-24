# API Gaps（前端体验依赖的后端接口缺口）

> 这是**前向追踪清单**：记录"页面想做、但后端接口还没有/不够"的缺口，避免它们散落在聊天、临时文档或 TODO 里失焦。
>
> 历史交付记录见 [`backend-gaps.md`](./backend-gaps.md)（V3+ 已交付 12/13 项）。本文件只跟踪**仍开放**的缺口与对应 fallback。

## 标注约定（代码内）

在前端依赖后端接口、且当前用 mock/local 兜底的**边界处**加一行注释（只在 fallback 边界标，不在每个调用点重复）：

```ts
// API_GAP[BE#xx]: short description
// Fallback: current local/mock behavior
```

还没有对应 BE issue 时用：

```ts
// API_GAP[untracked]: short description
```

BE issue 关闭、真实接口接入后，**必须删除对应 fallback 与标注**，并把本表条目移到 `backend-gaps.md` 的已交付区。

## 缺口清单

| Gap | FE file | Needed API | Current fallback | BE issue | Priority |
|---|---|---|---|---|---|
| 出门搭配分享板（无自拍的真实 board 渲染） | `src/screens/today/TodayScreen.tsx` | `POST /v1/outfits/{outfit_id}/share-asset`（服务端渲染可分享图）或客户端原生图片导出 | `Share.share({ message })` 纯文本分享，无视觉资产 | untracked | P0 |
| OOTD 海报支持 outfit_id | `src/screens/today/OotdPosterScreen.tsx`、`src/types/navigation.ts` | `POST /v1/ootd-posters { outfit_id }` 变体 | 海报仅基于自拍；`outfitId` 只用于埋点，不进生成 | FE#15 | P1 |
| 倒计时分钟数 | `src/api/recommendations.ts` | TodayRecommendation 返回 `countdown_minutes` | 硬编码 `countdownMinutes: null`，Today 不渲染 | untracked | P2 |
| I18nMessage key 查表 | `src/utils/i18n.ts` | 发布 `I18nMessage.key` 的翻译目录（catalog） | `renderI18n` 只返回 `fallback_text`，忽略 key | untracked | P2 |
| 分享/海报资产轮询状态 | `src/api/outfitVisual.ts` | 分享板生成的 `generation_status` 轮询（同 outfit-visual-assets） | 仅自拍海报有轮询；分享板无端点 | untracked | P2 |
| 反馈标签目录 | `src/screens/today/FeedbackSheetScreen.tsx` | `GET /v1/recommendations/feedback-tags?scene=`（已存在） | 接口缺失时回退 `FALLBACK_TAGS` 静态字典（容错，已可用） | — | P3 |
| 数据导出状态轮询 | `src/api/account.ts` | `GET /v1/me/data-export/{job_id}` 状态查询 | `POST` 仅返回 job_id，依赖推送/邮件，无进度 | — | P4 |
| 出门时间保存返回刷新提示 | `src/screens/settings/SettingsScreen.tsx` | `PATCH /v1/user/settings` 返回 `next_recommendation_refresh` 等提示 | 保存后本地 invalidate `todayRecommendation`，无服务端提示 | — | P4 |
| 提醒 / 预计算调度元数据 | `src/screens/settings/SettingsScreen.tsx` | settings 内携带 reminder/precompute 调度信息 | 无后端，纯本地 | — | P4 |
| 限流 retry_after | `src/api/recommendations.ts` | 429 响应含 `retry_after_at: ISO8601` | 文案硬编码"明天再来" | — | P5 |
| 错误响应结构化 | `src/api/client.ts` | 错误体含 `display_message` / `retryable` / `retry_after` | 按 error_code 本地映射文案 | — | P5 |

### 说明

- **Ask（BE#28/#29/#30）/ Import 多件识别（BE#24/#25）/ Today 上下文与评分（ENABLE_*）** 等原缺口已在后端交付并接入，见 `backend-gaps.md`，不再列入本表。
- P0/P1 是当前最影响体验的缺口（分享视觉资产）；建议优先为"出门搭配分享板"开一个 BE issue 并回填到本表 `BE issue` 列。

## PR 检查项

新增 UI 时在 PR 描述勾选：

- [ ] 新增 UI 是否依赖后端接口？如有，是否在 fallback 边界标了 `API_GAP`？
- [ ] 是否有对应 BE issue（或标 `untracked`）？
- [ ] 是否有明确的 fallback 行为？
- [ ] 若接入了真实接口，是否删除了旧 fallback 与本表对应条目？
