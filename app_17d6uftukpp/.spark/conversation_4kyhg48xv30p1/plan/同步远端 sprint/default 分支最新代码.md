## 目标

将当前工作区代码同步到远端 `origin/sprint/default` 分支最新版本，不做任何业务改动，仅做代码对齐。

## 操作步骤

1. **暂存当前本地修改**：`git stash`（避免 reset 冲突）
2. **拉取远端最新**：`git fetch origin`
3. **强制对齐远端**：`git reset --hard origin/sprint/default`
4. **验证目录存在**：确认 `src/pages/Report`、`src/pages/Analytics`、`src/pages/SubModule` 三个目录存在
5. **验证文件存在**：确认 `src/lib/report.ts`、`src/lib/analytics.ts` 两个文件存在
6. **输出当前 HEAD 提交号**：`git rev-parse HEAD`

## 注意事项

- 不执行设计、不改动任何页面和业务逻辑
- 不点击发布
- 若 stash 后发现本地有需要保留的改动，事后可通过 `git stash pop` 恢复