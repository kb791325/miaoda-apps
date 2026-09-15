# 架构设计文档

## 1. 系统架构概览

### 1.1 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层 (Client)                      │
│  React 19 + TypeScript + Vite + Tailwind CSS                │
│  14 个页面模块 · 11 条路由 · 懒加载 + Suspense              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP REST (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     业务服务层 (Server)                       │
│  NestJS 10 + TypeScript + Drizzle ORM                       │
│  15 个功能模块 · 90+ API 接口 · RBAC 权限控制               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ 支出管理  │ │ 资产管理  │ │ 盘点管理  │ │ 预算管理      │  │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────────┤  │
│  │ 数据看板  │ │ 盘点看板  │ │ 报表统计  │ │ 飞书同步      │  │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────────┤  │
│  │ 类目管理  │ │ 角色权限  │ │ 通知管理  │ │ 操作日志/用户  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Drizzle ORM
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据层 (Data)                          │
│  PostgreSQL 14+ · 17 张业务表 · RLS 行级安全                 │
│  ┌──────────────────────────────────────────────────┐       │
│  │          飞书多维表格双向同步                       │       │
│  │  支出表 · 资产表 · 盘点表 · 类目表 · 数据记录表    │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术选型

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19 |
| 前端语言 | TypeScript | 5.x |
| 构建工具 | Vite | 6.x |
| CSS 框架 | Tailwind CSS | 4.x |
| UI 组件库 | shadcn/ui | latest |
| 图表库 | ReactECharts | latest |
| 后端框架 | NestJS | 10.x |
| 后端语言 | TypeScript | 5.x |
| ORM | Drizzle ORM | latest |
| 数据库 | PostgreSQL | 14+ |
| 运行环境 | Node.js | ≥ 22.0.0 |

---

## 2. 模块架构

### 2.1 前端模块（14 个页面）

| 页面 | 路由 | 说明 |
|------|------|------|
| DashboardPage | `/dashboard` | 综合数据看板，含 4 张指标卡片 + 5 种图表 |
| ExpensesPage | `/expenses` | 支出管理列表，含筛选/新增/详情/审批 |
| FixedAssetsPage | `/fixed-assets` | 固定资产列表，含操作面板/库存阈值 |
| InventoryChecksPage | `/inventory/:taskId` | 盘点执行区，逐项确认与差异处理 |
| InventoryDashboardPage | `/inventory-dashboard` | 盘点看板，含矩阵热力图/时间线/库存 |
| BudgetPage | `/budget` | 预算管理，含编制/调整/执行监控 |
| CategoriesPage | `/categories` | 类目管理，一级/二级联动 |
| ReportsPage | `/reports` | 数据报表，含支出/资产/盘点分析 |
| SettingsPage | `/settings` | 系统设置，含飞书同步/审批/权限/日志 |
| RolesPage | `/roles` | 角色权限管理 |
| NotificationsPage | `/notifications` | 通知中心 |
| AuditLogsPage | `/audit-logs` | 审计日志 |
| NotFound | `/404` | 404 页面 |
| ExamplePage | `/example` | 示例页面 |

### 2.2 后端模块（15 个）

| 模块 | 路径 | 说明 |
|------|------|------|
| ExpensesModule | `api/expenses` | 支出 CRUD、批量操作 |
| FixedAssetsModule | `api/fixed-assets` | 资产全生命周期管理 |
| InventoryModule | `api/inventory-tasks` / `api/inventory-checks` | 盘点任务与明细 |
| DashboardModule | `api/dashboard` | 综合看板统计 |
| InventoryDashboardModule | `api/inventory-dashboard` | 盘点看板统计 |
| BudgetModule | `api/budget` | 预算编制与执行 |
| CategoriesModule | `api/categories` | 类目管理 |
| ReportsModule | `api/reports` | 报表分析 |
| RolesModule | `api/roles` | RBAC 角色权限 |
| NotificationsModule | `api/notifications` | 通知管理 |
| OperationLogModule | `api/operation-logs` | 操作日志 |
| FeishuSyncModule | `api/feishu-sync` | 飞书同步配置与触发 |
| FeishuBitableModule | — | 飞书多维表格插件调用（无 HTTP 接口） |
| UsersModule | `api/users` | 用户搜索 |
| ViewModule | `*` | 前端路由通配符兜底 |

### 2.3 模块依赖关系

```
Dashboard ──────┬── Expenses
                ├── FixedAssets
                ├── InventoryTasks
                └── Budget

InventoryDashboard ──┬── InventoryTasks
                      ├── InventoryChecks
                      └── FixedAssets

Reports ──────┬── Expenses
              ├── FixedAssets
              └── InventoryTasks

FeishuSync ──┬── Expenses
             ├── FixedAssets
             ├── InventoryTasks
             └── Categories

Expenses ──── Categories
FixedAssets ─ Categories
InventoryTasks ─ FixedAssets
```

---

## 3. 核心业务流程

### 3.1 支出管理流程

```
创建支出 → 选择类目 → 填写金额/部门/主体 → 提交审批
                                                    │
                                          ┌─────────┴─────────┐
                                          ▼                   ▼
                                       审批通过            审批驳回
                                          │                   │
                                          ▼                   ▼
                                    同步到飞书表格        返回修改
                                          │
                                          ▼
                                    纳入看板统计
```

### 3.2 资产生命周期

```
采购入库 → 在库 → 领用 → 使用中 → 归还 → 在库
                    │                │
                    ├─ 维修 ──────────┘
                    └─ 调拨 → 新部门/新归属人
                                     │
                                     ▼
                                   报废
```

### 3.3 盘点流程

```
创建盘点任务（指定范围/月份） → 自动生成盘点明细
                                        │
                                        ▼
                              逐项录入实盘数量
                                        │
                              ┌─────────┴─────────┐
                              ▼                   ▼
                           数量一致             数量差异
                              │                   │
                              ▼                   ▼
                           确认无误    ┌──── 盘盈（实际 > 账面）
                                      └──── 盘亏（实际 < 账面）
                                        │
                                        ▼
                                    确认差异 → 更新库存
                                        │
                                        ▼
                                    完成盘点任务
```

---

## 4. 数据架构

### 4.1 数据库表（17 张）

| 表名 | 说明 |
|------|------|
| `categories` | 二级分类（L1 + L2 唯一约束） |
| `expenses` | 支出主表，含审批流/金额/分类 |
| `fixed_assets` | 固定资产主表，含折旧/状态/库存 |
| `inventory_tasks` | 盘点任务，含范围/进度/统计 |
| `inventory_checks` | 盘点明细，关联 task 和 asset |
| `budgets` | 预算主表，按年月+部门唯一 |
| `budget_adjustments` | 预算调整记录 |
| `approval_records` | 审批记录，关联 expense |
| `approval_flows` | 审批流配置，含节点 JSON |
| `asset_operation_records` | 资产操作记录（借用/归还/转移/报废等） |
| `feishu_sync_configs` | 飞书同步配置，含字段映射 JSON |
| `feishu_sync_logs` | 飞书同步日志 |
| `data_records` | 通用数据记录，含飞书记录 ID |
| `notifications` | 用户通知，含类型/优先级/已读状态 |
| `roles` | 角色定义，含菜单/数据/操作三级权限 JSON |
| `user_roles` | 用户-角色关联 |
| `operation_logs` | 操作日志 |

### 4.2 核心关系图（ER）

```
categories ───1:N─── expenses
categories ───1:N─── fixed_assets

expenses ───1:N─── approval_records
expenses ───1:N─── data_records

fixed_assets ───1:N─── inventory_checks
fixed_assets ───1:N─── asset_operation_records

inventory_tasks ───1:N─── inventory_checks

budgets ───1:N─── budget_adjustments

roles ───1:N─── user_roles

feishu_sync_configs ───1:N─── feishu_sync_logs
```

### 4.3 飞书多维表格同步机制

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│  应用数据库   │ ◄─────► │  FeishuSyncService │ ◄─────► │ 飞书多维表格  │
│  (PostgreSQL) │  pull   │  - 字段映射转换    │  push   │ (Base/Table)  │
│              │  push   │  - 增删改同步      │         │              │
│              │         │  - 同步日志记录    │         │              │
└──────────────┘         └──────────────────┘         └──────────────┘
```

同步覆盖 5 个业务域：支出、资产、盘点、类目、数据记录。支持手动触发和定时同步，每次同步记录日志并支持失败重试。

---

## 5. 安全架构

### 5.1 RBAC 三级权限模型

| 权限层级 | 说明 | 示例 |
|---------|------|------|
| 菜单权限 | 控制可见的导航菜单项 | 是否显示"系统设置"入口 |
| 数据权限 | 控制可查看的数据范围 | 只能查看本部门数据 vs 全部数据 |
| 操作权限 | 控制可执行的操作 | 能否删除支出、能否审批 |

### 5.2 认证机制

- 基于飞书身份认证，通过 `@NeedLogin()` 装饰器控制接口访问
- 前端使用 `axiosForBackend` 自动携带认证凭证
- 后端通过 `req.userContext` 获取当前用户身份（userId / tenantId / roles）

### 5.3 数据安全措施

- 所有写操作接口必须登录（`@NeedLogin()`）
- 操作日志记录所有关键操作（操作人/时间/类型/目标）
- 权限校验在服务端执行，前端权限仅用于 UI 展示控制
- 禁止前端传递用户身份信息，统一从 `req.userContext` 获取