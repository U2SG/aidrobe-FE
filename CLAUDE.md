
---

## 本仓工程坑 (device testing / import / refresh)

Hard-won during on-device testing — check these before "fixing" a symptom:

- **Uploads are presigned POST; the client rewrites the internal host.** `POST /v1/uploads/presign` returns an `upload_url` whose host is the *in-cluster* endpoint (`minio:9000`). A real device (over Tailscale) can't resolve that, so `src/api/uploads.ts` `normalizePresignedUploadUrl()` rewrites internal hosts (`minio`/`localhost`/`127.0.0.1`/`0.0.0.0`) to the `file_url` host+port. This is SAFE because a presigned **POST** signs the form policy/fields, NOT the host. **So "device upload fails" is almost never the backend** — check `file_url` points at a device-reachable host (backend `S3_PUBLIC_BASE_URL` = Tailscale IP) and that `normalize` still runs, before touching storage config. Do NOT add a second upload-endpoint env; the client-side rewrite already owns this.
- **`file_url` (read) vs internal endpoint (server put/get) are intentionally different hosts** — public/Tailscale for the device, `minio:9000` inside the cluster. Don't "unify" them.
- **Wardrobe / Today / Ask / Profile are persistent tabs — they never unmount on tab switch.** So a mutation's `invalidateQueries` only marks an *inactive* tab's query stale; React Query won't auto-refetch it, and switching back does NOT remount → the screen shows the stale cache. If "list doesn't update after an action on another tab", add a **focus refetch** (`useFocusEffect` + refetch-when-stale), like `WardrobeListScreen`. Pull-to-refresh working while auto-refresh doesn't is the tell.
- **Import is async**: `POST /v1/import-tasks` → 202 + arq worker `import_drain`. `task_status`: `waiting_confirm` (recognized, awaiting the confirm form) → `completed` (confirmed → a real `WardrobeItem` exists) → `failed` (`error_code=vision_failed`, e.g. `image_url is required` when the image didn't upload or a link parser returned no image). Batch album import fans out one task per image and **skips** failures (toast "N 张未导入") — partial failure is by-design degradation, not a bug.
- **Link import (淘宝/京东/小红书/抖音) via server `og:image` scrape is unreliable** (JS render + anti-bot + login walls; og:image is often a logo → false positive). Real path is on-device webview capture; server scrape is best-effort only and must degrade to screenshot import, never silently fail.
- **On-device gotcha (RN new arch):** a `Pressable` whose LAYOUT/visual props live in its `style={({pressed})=>({...})}` FUNCTION loses them on device (children stack, solid backgrounds vanish → white text on light bg). Web renders fine — so web preview won't catch it. Put layout on an inner `<View>`; keep only `opacity` in the style function.

---

## Worktree 并行工作流

多个 Claude session 并行干活，每个 worktree = 独立目录 + 独立分支，互不干扰；每个 session 出一个 PR。

### 粒度判断（标准：能否独立 review/merge）

- 新功能 / 独立模块 → 一个 worktree 一个分支一个 PR
- 测试期零散 bugfix → 全部塞同一个 worktree，打包一个 PR
- 同一任务多步骤拆解 → 一个 worktree 走完

### Windows 标准流程

```powershell
# 1) 主目录开 worktree（分支名语义化，不带 Jira 编号）
cd D:\project\<this-repo>
claude -w <branch-name>          # 例：claude -w oauth-token-rotation
# 自动建 .claude\worktrees\<branch>\ + 同名分支 + 启动 session

# 2) session 里改完，一键 commit + push + 建 PR
/commit-commands:commit-push-pr  # 走完 commit → git push → tea pr create

# 3) 退出但保留 worktree（等 review），主目录可继续 claude -w 跑下一个

# 4) Review 期间改动：恢复 session
cd D:\project\<this-repo>\.claude\worktrees\<branch>
claude --resume                  # 完整上下文恢复，不用重述背景

# 5) Merge 后清理
git worktree remove .claude\worktrees\<branch>
git branch -d <branch>
# 或：/clean_gone 一键清所有 [gone] 分支
```

### 注意

- **分支名语义化，不带 Jira 编号**（用 `oauth-token-rotation` 而非 `feat-fms-1234-oauth`）
- 并行 3–5 个为宜，开多了自己 review 不过来
- 主目录只作入口，所有改动都在 `.claude\worktrees\<name>\` 子目录内完成
- 多 worktree 共享同一份 `.git`，磁盘成本可忽略
- `CLAUDE.md` / `.claudeignore` 自动继承主分支当前版本
- 每个 worktree 可独立配对 Happy，手机端显示为多个独立项目卡片
