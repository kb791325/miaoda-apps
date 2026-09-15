# 贡献指南

## 开发环境搭建

```bash
git clone <repo-url>
cd <project>
npm install
npm run dev
```

- 后端服务运行在 `http://localhost:3000`
- 前端开发服务器运行在 `http://localhost:5173`

## 分支命名规范

| 分支类型         | 命名格式              | 示例                          |
| ---------------- | --------------------- | ----------------------------- |
| 功能分支         | `feature/<描述>`      | `feature/expense-dashboard`   |
| Bug 修复         | `fix/<描述>`          | `fix/asset-pagination`        |
| 热修复           | `hotfix/<描述>`       | `hotfix/critical-login`       |
| 发布分支         | `release/<版本号>`    | `release/v1.2.0`              |
| 文档更新         | `docs/<描述>`         | `docs/api-reference`          |

## 提交信息规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 类型 (type)

| 类型       | 说明                     |
| ---------- | ------------------------ |
| `feat`     | 新功能                   |
| `fix`      | Bug 修复                 |
| `docs`     | 文档更新                 |
| `style`    | 代码格式调整（不影响功能）|
| `refactor` | 代码重构                 |
| `perf`     | 性能优化                 |
| `test`     | 测试相关                 |
| `chore`    | 构建/工具/依赖更新       |
| `ci`       | CI/CD 配置变更           |

### 示例

```
feat(expenses): 添加支出分类筛选功能

fix(inventory): 修复盘点任务分页错误

docs(api): 更新支出管理 API 文档
```

## PR 流程

1. 从 `develop` 分支创建功能分支
2. 在功能分支上开发和测试
3. 提交 PR 到 `develop` 分支
4. 代码审查通过后合并
5. 定期将 `develop` 合并到 `main` 发版

## 代码规范

- 使用 TypeScript，禁止 `any` 类型
- 遵循 ESLint 和 Stylelint 规则
- 后端禁止使用 `console.log`，统一使用 NestJS Logger
- 前端禁止使用 `console.log`，统一使用 `@lark-apaas/client-toolkit/logger`
- 新增页面/组件需遵循 AGENTS.md 中的设计规范
- 禁止硬编码密钥和敏感信息

## 测试要求

- 新增功能必须包含单元测试
- 关键业务流程需要 E2E 测试覆盖
- PR 合并前需通过 CI 流水线所有检查（lint → typecheck → unit-test → build）