# aidrobe V2 内部 Smoke Test 清单 v0.2（P0 Release Gate）

适用分支：`redesign/mvp-v0.8-ui`（含已合入的 v2-visual 系列）。
适用包：`preview-v2` profile（`ENABLE_MVP_V2_UI=true`，后端 Tailscale `http://100.89.226.13:8000`）。

## 本轮测什么 / 不测什么

**测（UI 流程验证）**：状态机对不对、路径顺不顺、有没有假数据、有没有卡住、错误文案是否清晰、有没有打扰感。

**不以主观推荐质量作为退出标准**：当前 FE 已消费主要 V2 契约；本轮要验证 flag 开启后约束是否真实生效、状态是否可恢复、事件与数据操作是否可追溯。推荐是否“更准”进入后续受控评测，不以个人观感代替链路验收。

**环境注意**：

- onboarding（1–6 步首启流程）**只在全新安装或清除 App 数据后出现**，覆盖安装看不到。
- Web 预览（RN-web 导出）测不了 API 依赖屏（Today 真数据、导入轮询）；这些必须真机 + Tailscale 后端。
- 记录格式：每项 `PASS / FAIL / N-A` + 备注。FAIL 必须附设备、发生时间、实际 flag 快照、API request id 与复现步骤。

---

## 1. V2 tab 外壳

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 1.1 | 底部 tab 为 今日 / 衣橱 / Ask / 我的，四个都可切换 | | |
| 1.2 | 没有 Discover 一级 tab | | |
| 1.3 | Ask 是一级入口（不是藏在别的页里） | | |
| 1.4 | 「我的」打开是信任面（衣然与你 / 日常设置 / 隐私与数据），不是旧设置整页 | | |

## 2. 首启 onboarding（需清装）

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 2.1 | Welcome(1/6) → 开始整理衣橱 → 权限说明 → 允许或稍后再说 都能前进 | | |
| 2.2 | AddWardrobe(2/6)：拍下衣服 / 从相册选择 / 还有其他添加方式 三个入口都活 | | |
| 2.3 | 拍/选一件 → 识别处理态（无白屏、不伪造百分比/服务端阶段） → 确认页 | | |
| 2.4 | 确认页返回/重拍 回到 AddWardrobe（不允许摔回 Welcome 第 1 步） | | |
| 2.5 | 保存最后一件 → FirstOutfit(4/6) | | |
| 2.6 | FirstOutfit 空衣橱态：说清缺哪个槽位，且有「跳过」可继续（不许死路） | | |
| 2.7 | StyleMemory(5/6)：选图或跳过都能到出门时间(6/6) | | |
| 2.8 | 出门时间保存 → 进入主 App，重启后不再出现 onboarding | | |

## 3. 导入 → 首套（主 App 内）

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 3.1 | 衣橱 → 添加：出现来源弹窗（拍照/相册/穿搭照提取/商品链接） | | |
| 3.2 | 处理中无白屏；失败页说清原因并可重选 | | |
| 3.3 | 多张相册导入按队列逐件确认 | | |
| 3.4 | V2 下最后一件确认后进入 FirstOutfit（不弹回列表） | | |
| 3.5 | no_outfit 态说清缺什么槽位；single_outfit 态不暴露注定失败的「换一套」；ready 态能进 Today | | 三态来自 BE gate 真值（#79 已接） |
| 3.6 | 深夜低打扰：22:00 后确认页只显示 图片+名称+保存，其余折叠进「改一下」；20:00–22:00 隐藏颜色/版型；白天全字段 | | 改系统时间测 |
| 3.7 | First Outfit 等待只显示诚实说明；可点「稍后回来」离开，重新进入后读取已完成结果 | | 不新增前端任务状态；复用已持久化 daily/gate |

## 4. Today v2

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 4.1 | 只显示一套；不出现三套候选；不出现 safe / fast / stylish 字样 | | |
| 4.2 | 推荐理由来自真实字段（天气/衣橱），无凭空理由 | | |
| 4.3 | 仅在服务端 `can_refresh=true` 时显示「换一套」；按当前显示日期 refresh 且有 pending 反馈；离开 Today 后再回来能看到已完成结果 | | Today/Tomorrow cache key 不得互相覆盖；403/额度耗尽后动作消失 |
| 4.4 | 不喜欢 展开原因反馈；原因可选，界面不存在未落库备注或假「提交并换一套」 | | 空原因提交 `reason_tags=[]` |
| 4.5 | 查看详情 进入 outfit 详情，条目可点进单品 | | |
| 4.6 | 空态（后端无推荐）：衣橱有缺口时显示具体缺口（缺下装/鞋…），衣橱查询失败时退回通用文案，**不许编造缺口** | | |
| 4.7 | 仅在 `can_context_override=true` 时显示特殊情况入口 → 底部弹窗（chips 优先 + 文字输入），选完关闭并刷新 | | 验证 7 个 chips / free text 真实影响 `applied_context`；失败、429、flag-off 均不得显示假成功 |

## 5. 时间状态机（改系统时间）

| # | 时间 | 期望模式 | 结果 | 备注 |
|---|---|---|---|---|
| 5.1 | 08:00（出门时间前窗口内） | morning_today（含倒计时） | | |
| 5.2 | 14:00 | daytime_today | | |
| 5.3 | 19:00 | evening_tomorrow（明日预览语气） | | 以服务端用户 timezone 计算；flag-on 请求真实 `target_date` / `mode=tomorrow`；“换一套”只更新明日 revision，不覆盖今日 |
| 5.4 | 23:00 | late_night_tomorrow | | flag-off 后端可回退为中性明日预览，但不得把今日天气/理由伪装成明日数据 |
| 5.5 | 跨过 18:00 / 00:00，或 App 从后台恢复 | 日期与 mode 自动重算 | | query key 使用具体日期；边界前发出的 refresh 回包不得写入边界后的日期 key |

## 6. Ask

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 6.1 | 空态：暖金 hero + 4 条建议行，点建议直接发问 | | |
| 6.2 | 输入发问 → pending → 回答；多轮追问在同一会话（conversation 延续） | | |
| 6.3 | 「还有其他事项」弹窗打开正常；购物/旅行/洞察/风格 分别进入真实 SenseCheck / PackingList / Insights / Style 页面 | | 不新增 Discover 一级 tab；返回 Ask 路径正常 |
| 6.4 | 出错时（断网/后端 503）显示明确错误文案，可重试，不静默 | | |

## 7. Wardrobe 查询正确性

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 7.1 | 准备 60+ 件衣物；首次只加载一页，滚动后继续加载且无重复/跳项 | | 同时间戳数据也必须稳定 |
| 7.2 | 搜索能找到首屏以外的名称、颜色或品类；顶部数量为服务端 filtered total | | 不得用已加载页长度冒充 total |
| 7.3 | 状态 + 季节 + 颜色 + 品类可组合筛选，翻页后条件保持 | | 验证 50+ 件与跨页计数 |
| 7.4 | 整个衣橱为空与当前搜索/筛选无结果使用不同空态 | | 清除条件后能恢复完整列表 |
| 7.5 | 下一页加载失败时保留已加载衣物并提供重试；返回列表保留条件与位置 | | 不得整页清空 |

## 8. Profile 信任面

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 8.1 | 「衣然记住的关于你」能打开；无假记忆（没有的就说没有） | | 已接 `/v1/profile/memory`；覆盖 flag-off 403、真实 empty、纠正、单条删除与全部清除 |
| 8.2 | 你的数据 / 隐私说明是人话，无夸大承诺 | | |
| 8.3 | 日常设置三行点开即编辑（出门时间轮选 / 位置输入 / 语言选择），保存后行值更新 | | |
| 8.4 | 位置行不显示裸坐标（GPS 模式显示「使用当前位置」） | | |
| 8.5 | 清空数据：样式化确认弹窗（不是系统 Alert），文案说清删什么、留什么、不可撤销 | | |
| 8.6 | 注销/退出登录后回到登录/首启，不残留旧数据画面 | | |
| 8.7 | 全 App 无 “Aidrobe” 残留文案（应为 衣然 / YIRAN） | | |

## 9. 反馈 chips

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 9.1 | 反馈单选含 太冷 / 太热 类原因；不选原因也能提交成功 | | |
| 9.2 | 提交后不重复弹出、不打扰 | | passive event 已接；本轮验证事件发送与频率约束，不要求一次反馈立刻改变推荐 |

## 10. V1 回退

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 10.1 | `ENABLE_MVP_V2_UI=false` 的包：V1 四 tab 原样（今日/衣橱/发现/设置）、无 V2 元素 | | 需单独打 flag-off 包 |
| 10.2 | V1 各主路径不回归（今日三套 / 衣橱 / 发现 / 设置） | | |

---

## 已知边界与环境前置

BE #102–#108 对应的 V2 能力已进入 main，当前 FE head 也已消费 `target_date`、`context_override`、`resurface_insight`、passive events、Profile data trust、presign/auth 等契约。以下现象只有在 flag-off、资格未命中或明确产品边界下才是预期；所需 flag 已开启却不生效，应按 bug 记录。

内部环境应显式记录并开启：
`ENABLE_TODAY_REFRESH` / `ENABLE_TODAY_CONTEXT` / `ENABLE_TODAY_REASONING` /
`ENABLE_DATE_AWARE_TODAY` / `ENABLE_CONTEXT_OVERRIDES` / `ENABLE_RESURFACE_INSIGHT` /
`ENABLE_INDOOR_CLIMATE_INFERENCE` / `ENABLE_DATA_TRUST`（passive events 无 flag）。

| 场景 | 当前边界 / 验收口径 | 是否报 bug |
|---|---|---|
| 晚间/深夜 Today | flag-on 必须返回真实 `target_date` 与 `mode=tomorrow`；refresh 使用相同 `target_date` | 请求/日期/文案不一致、明日刷新覆盖今日或旧后端仍显示不可执行动作均报 bug |
| Context Override | FE 已发送 `context_override` 并展示服务端 `applied_context` | flag-on 不生效、失败后假成功或原文进入通用 analytics 均报 bug |
| Resurface Insight | FE 已消费并发送 viewed/opened；未满足资格或冷却期时允许不展示 | 伪造卡片或违反冷却时报 bug |
| Passive learning / indoor climate | 事件入口已接；一次反馈不保证立刻改变下一套 | 事件未发送、频率失控或硬约束被弱信号覆盖时报 bug |
| Profile memory / clear data | FE 已接 `/v1/profile/*`；flag-off 403 与真实 empty 都必须诚实呈现 | 纠正/删除/清空未落到服务端，或 UI 保留旧缓存时报 bug |
| 上传与对象删除 | 默认 presign 路径可用，STS 为受 flag 控制的直传能力；对象 key 必须按用户隔离 | 上传鉴权绕过、跨用户 key、清空/注销后对象残留时报 bug |
| 登录与 token refresh | Android 邀请码、Apple 登录、single-flight refresh 已接 | 同码跨设备共享衣橱、并发 401 多次 refresh、失败后缓存未清时报 bug |
