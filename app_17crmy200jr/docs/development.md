# 开发指南

## 1. 开发环境搭建

### 1.1 推荐 IDE

- **Visual Studio Code**（推荐）
- 也可使用 WebStorm、Cursor 等支持 TypeScript 的 IDE

### 1.2 推荐插件

| 插件 | 用途 |
|------|------|
| ESLint | 代码质量检查 |
| Prettier | 代码格式化 |
| Tailwind CSS IntelliSense | Tailwind 智能提示 |
| PostgreSQL | 数据库管理 |
| Thunder Client | API 调试 |

### 1.3 代码风格

项目使用 `@eslint/js` + `typescript-eslint` 推荐配置，自动检查代码风格。提交前确保无 ESLint 报错。

---

## 2. 项目结构说明

### 2.1 目录结构

```
├── client/                     # React 前端
│   ├── src/
│   │   ├── index.tsx           # 应用入口（平台关键文件，禁改）
│   │   ├── index.css           # 全局样式
│   │   ├── tailwind-theme.css  # Tailwind CSS 主题变量
│   │   ├── app.tsx             # 路由定义（平台关键文件，禁删）
│   │   ├── api/                # API 请求层
│   │   │   └── index.ts        # API 聚合导出
│   │   ├── pages/              # 页面组件
│   │   │   ├── Dashboard/      # 综合数据看板
│   │   │   ├── Expenses/       # 支出管理
│   │   │   ├── FixedAssets/    # 固定资产管理
│   │   │   ├── InventoryChecks/ # 盘点执行
│   │   │   ├── InventoryDashboard/ # 盘点看板
│   │   │   ├── Budget/         # 预算管理
│   │   │   ├── Categories/     # 类目管理
│   │   │   ├── Reports/        # 数据报表
│   │   │   ├── Settings/       # 系统设置
│   │   │   ├── Roles/          # 角色权限
│   │   │   ├── Notifications/  # 通知中心
│   │   │   ├── AuditLogs/      # 审计日志
│   │   │   └── NotFound/       # 404 页面
│   │   ├── components/         # 可复用组件
│   │   │   ├── ui/             # shadcn/ui 组件
│   │   │   ├── business-ui/    # 用户/部门选择组件
│   │   │   └── Layout.tsx      # 全局布局
│   │   ├── hooks/              # 自定义 Hooks
│   │   └── utils/              # 工具函数
│   └── index.html              # HTML 模板
├── server/                     # NestJS 后端
│   ├── main.ts                 # 应用入口（平台关键文件，禁改）
│   ├── app.module.ts           # 根模块，注册所有业务模块
│   ├── config/                 # 配置文件
│   ├── modules/                # 业务模块
│   │   ├── expenses/           # 支出管理
│   │   ├── fixed-assets/       # 固定资产管理
│   │   ├── inventory/          # 盘点管理（任务+明细）
│   │   ├── dashboard/          # 综合看板
│   │   ├── inventory-dashboard/ # 盘点看板
│   │   ├── budget/             # 预算管理
│   │   ├── categories/         # 类目管理
│   │   ├── reports/            # 报表统计
│   │   ├── roles/              # 角色权限
│   │   ├── notifications/      # 通知管理
│   │   ├── operation-log/      # 操作日志
│   │   ├── feishu-sync/        # 飞书同步
│   │   ├── feishu-bitable/     # 飞书多维表格插件
│   │   ├── users/              # 用户管理
│   │   └── view/               # 前端路由兜底
│   ├── database/               # 数据库
│   │   └── schema.ts           # Drizzle ORM Schema（自动生成）
│   └── common/                 # 通用工具
├── shared/                     # 前后端共享
│   └── api.interface.ts        # 共享类型定义
├── docs/                       # 项目文档
├── test/                       # 测试文件
└── package.json                # 项目配置（禁改）
```

### 2.2 关键文件说明

| 文件 | 说明 | 修改限制 |
|------|------|---------|
| `server/main.ts` | 应用启动入口 | 禁止修改 |
| `client/src/index.tsx` | 前端入口 | 禁止修改 |
| `client/src/app.tsx` | 路由定义 | 可加路由，禁删 Platform Provider |
| `server/app.module.ts` | 模块注册 | 可加模块，ViewModule 保持最后 |
| `server/database/schema.ts` | 数据库 Schema | 自动生成，禁止手动编辑 |
| `shared/api.interface.ts` | 共享类型 | 按需修改，前后端同步 |
| `AGENTS.md` | 研发规范 | 按需更新 |

### 2.3 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `ExpensesPage.tsx` |
| 模块目录 | kebab-case | `fixed-assets/` |
| Controller | PascalCase | `FixedAssetsController` |
| Service | PascalCase | `FixedAssetsService` |
| Module | PascalCase | `FixedAssetsModule` |
| 函数/变量 | camelCase | `getExpenseList` |
| 常量 | UPPER_CASE | `MAX_PAGE_SIZE` |
| 接口/类型 | PascalCase | `ExpenseItem` |
| 数据库表 | snake_case | `fixed_assets` |
| 数据库列 | camelCase | `createdAt` |

---

## 3. 开发规范

### 3.1 TypeScript 规范

- 所有代码使用 TypeScript 编写
- 禁止使用 `any` 类型
- 变量和函数参数必须显式声明类型
- 类型转换必须显式（如 `String(num)`）
- 使用 `interface` 定义对象类型，`type` 用于复杂类型

### 3.2 组件开发规范

**前端页面组件**：

- 使用箭头函数 + `React.FC`，Props 接口用 `组件名Props`
- 编写顺序：Hook 声明 → useEffect → 事件处理 → JSX
- 导入顺序：React → 三方库 → 内置工具 → 相对路径
- 页面文件 ≤ 500 行，组件文件 ≤ 300 行，Hook 文件 ≤ 100 行
- 使用 `logger` from `@lark-apaas/client-toolkit/logger`，禁止 `console`

**API 请求**：

- 必须使用 `axiosForBackend`，禁止 `fetch`
- 禁止 mock 数据（全栈项目）

**样式**：

- 优先使用 Tailwind CSS
- 颜色使用语义化 token（`bg-primary`），禁止 `bg-[--primary]`
- 严格遵循 `AGENTS.md` 中的设计规范

**路由**：

- 使用 `NavLink`/`Link`/`useNavigate`，禁止 `window.location.href`
- 分享链接使用 `resolveAppUrl` 转换

### 3.3 服务端开发规范

**模块结构**：

- 每个功能模块包含：`*.controller.ts`、`*.module.ts`、`*.service.ts`
- 模块目录使用 kebab-case，文件使用 PascalCase
- 新增模块需在 `server/app.module.ts` 中注册，`ViewModule` 保持最后

**Controller**：

- 路径前缀：`/api`（内部接口）或 `/openapi`（对外开放接口）
- 静态路由在前，动态路由在后（`/search` 在 `/:id` 之前）
- 写接口需加 `@NeedLogin()` 装饰器

**Service**：

- 使用注入的 Drizzle 实例，禁止自建数据库连接
- 写操作必须校验生效行数（`.returning({ id })` 检查）
- 禁止 N+1 查询，使用 `inArray` 批量查询
- 异常使用 NestJS 内置 HttpException 子类

**数据库**：

- DDL 通过 `miaoda db` 命令执行
- 执行后立即重新读取 `schema.ts` 获取最新表结构
- 禁止手动编辑 `schema.ts`
- 使用 `@Inject(DRIZZLE_DATABASE)` 注入数据库实例

**日志**：

- 使用 `@nestjs/common` 的 `Logger`，禁止 `console`
- Logger 参数必须为 string，对象需 `JSON.stringify`

### 3.4 API 开发规范

- 遵循 RESTful 规范：GET=读、POST=创建、PUT=全量更新、PATCH=部分更新、DELETE=删除
- 新建/修改接口时，先更新 `shared/api.interface.ts` 类型定义，再编写实现
- 前端 API 调用的 HTTP method 和路径必须与后端 Controller 完全匹配
- 禁止后端直接返回数组而 shared 定义为 `{items: T[]}`

### 3.5 错误处理规范

| 场景 | 异常类型 |
|------|---------|
| 资源不存在 | `NotFoundException` |
| 参数/状态非法 | `BadRequestException` |
| 并发冲突/库存不足 | `ConflictException` |
| 无权限操作 | `ForbiddenException` |

### 3.6 日志规范

- **前端**：使用 `logger` from `@lark-apaas/client-toolkit/logger`
- **后端**：使用 `Logger` from `@nestjs/common`
- 禁止 `console.log` / `console.error`
- 前端禁止静默处理异常，应显示明确错误信息

---

## 4. 测试规范

### 4.1 单元测试

- 测试框架：Jest
- 测试文件目录：`test/unit/<module>/`
- 文件命名：`<module>.service.spec.ts`
- 运行测试：`npm test`

### 4.2 测试编写规范

- 每个 Service 的核心方法至少覆盖正常流程和异常流程
- 使用 `jest.mock` 模拟外部依赖
- 测试数据使用 `[TEST]` 前缀标识
- 测试后清理数据，避免污染数据库

### 4.3 测试覆盖率

- 目标覆盖率：核心业务模块 ≥ 60%
- 关键路径（支出、资产、盘点）必须覆盖

---

## 5. Git 工作流

### 5.1 分支规范

- 主分支：`sprint/default`
- 禁止切换或创建其他分支

### 5.2 提交信息规范

- 格式：`[动词] + [核心对象] + [关键细节]`
- 字数：8-12 个汉字
- 示例：
  - `实现支出管理列表页`
  - `修复资产盘点差异计算`
  - `重构报表导出功能`

### 5.3 代码审查

- 提交前确保 ESLint 检查通过
- 提交前进行接口可用性测试（服务端代码）
- 提交前检查运行时日志

### 5.4 发布流程

1. 完成开发并提交代码
2. 通过 E2E 验收测试
3. 使用 `miaoda deploy` 触发发布
4. 检查发布状态和线上日志

---

## 6. 常见问题

### 6.1 路由 404

**原因**：路由未注册或路径不匹配

**排查**：
1. 检查 `@Controller(...)` 路径是否以 `api/` 或 `openapi/` 开头
2. 检查 Module 是否在 `app.module.ts` 注册
3. 检查静态路由是否在动态路由之前

### 6.2 类型错误 TS2339

**原因**：代码引用了 `schema.ts` 中不存在的字段

**排查**：执行 DDL 后，`schema.ts` 会自动重新生成。如果修改了数据库结构，需要重新读取 `schema.ts` 获取最新字段定义。

### 6.3 数据库连接失败

**原因**：数据库配置问题

**排查**：联系平台技术支持，数据库连接由平台管理。

### 6.4 飞书同步失败

**原因**：飞书应用权限不足或配置错误

**排查**：
1. 检查飞书应用是否已授权多维表格权限
2. 确认 `app_token` 和 `table_id` 有效
3. 查看同步日志获取详细错误信息

### 6.5 调试技巧

- **后端调试**：在 Service 中添加 `logger.log(JSON.stringify(data))` 查看数据
- **前端调试**：使用 `logger.info('message', data)` 输出日志
- **API 调试**：使用 `api_request` 工具直接测试接口
- **数据库调试**：使用 `miaoda db sql` 直接执行查询