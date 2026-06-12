
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
