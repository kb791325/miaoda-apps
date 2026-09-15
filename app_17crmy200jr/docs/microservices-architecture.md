# 牧唐行政资产盘点看板 — 微服务架构拆分评估报告

> 评估日期：2026-09-05
> 评估版本：v1.0
> 评估范围：当前全栈 NestJS + React 单体应用

---

## 1. 执行摘要

本报告对「牧唐行政资产盘点看板」当前单体架构进行全面的微服务拆分评估。经分析，**当前阶段不建议进行微服务拆分**，推荐采用「模块化单体」架构演进策略——在保持单体部署形态的前提下，通过强化模块边界、接口抽象和独立测试，为未来拆分做好准备。

**核心结论：**

| 维度 | 评估 |
|------|------|
| 当前系统规模 | 中等（18 模块 / 17 表 / 15 页面），远未达到拆分临界点 |
| 拆分必要性 | **低** — 无独立部署、团队自治、技术栈多样性需求 |
| 拆分风险 | **高** — 共享数据密集（userProfile / feishuRecordId / RLS），分布式一致性代价大 |
| 推荐策略 | 模块化单体 → 按需渐进式拆分 |

---

## 2. 当前架构分析

### 2.1 模块划分

当前应用共 **18 个后端模块**，按职责分为三层：

#### 核心业务模块（6 个）

| 模块 | 路径 | 路由 | 职责 |
|------|------|------|------|
| ExpensesModule | `server/modules/expenses/` | `/api/expenses` | 行政支出记录管理、审批状态流转、批量操作 |
| FixedAssetsModule | `server/modules/fixed-assets/` | `/api/fixed-assets` | 固定资产全生命周期管理、折旧计算、库存管理 |
| InventoryModule | `server/modules/inventory/` | `/api/inventory-tasks`, `/api/inventory-checks` | 盘点任务管理、检查项执行、差异处理 |
| BudgetModule | `server/modules/budget/` | `/api/budget` | 部门月度预算管理、执行监控、调整记录 |
| CategoriesModule | `server/modules/categories/` | `/api/categories` | 二级费用分类字典维护 |
| DashboardModule | `server/modules/dashboard/` | `/api/dashboard` | 综合数据看板聚合（支出/资产/预算/盘点摘要） |

#### 支撑服务模块（6 个）

| 模块 | 职责 |
|------|------|
| FeishuBitableModule | 核心数据层，封装飞书多维表格读写，被 8 个模块依赖 |
| FeishuSyncModule | 飞书多维表格同步调度、配置管理、字段映射 |
| InventoryDashboardModule | 盘点专用看板（矩阵/趋势/异常/完成率） |
| ReportsModule | 跨域数据统计报表（支出/资产/盘点分析） |
| NotificationsModule | 系统通知推送、已读管理 |
| OperationLogModule | 操作审计日志记录与查询 |

#### 系统基础设施模块（6 个）

| 模块 | 职责 |
|------|------|
| RolesModule | RBAC 角色权限管理（菜单/数据/操作三级权限） |
| UsersModule | 用户搜索（飞书通讯录集成） |
| SecurityModule | 安全日志、凭据管理 |
| MonitoringModule | 性能监控、错误统计、业务指标、告警 |
| PerformanceModule | 前端性能指标收集、慢请求追踪 |
| ViewModule | 前端 SPA 模板渲染（fallback 路由） |

### 2.2 模块依赖关系

```
FeishuBitableModule ◄── BudgetModule
                    ◄── CategoriesModule
                    ◄── DashboardModule
                    ◄── ExpensesModule ◄── FixedAssetsModule
                    |                   ◄── BudgetModule
                    |                   ◄── RolesModule
                    ◄── FixedAssetsModule
                    ◄── InventoryModule ◄── RolesModule
                    ◄── InventoryDashboardModule
                    ◄── ReportsModule

RolesModule ◄── ExpensesModule
            ◄── InventoryModule

CacheModule (@Global) ◄── MonitoringModule
HttpModule ◄── UsersModule
```

**关键观察：**

- FeishuBitableModule 是**核心数据枢纽**，8 个模块直接依赖它，形成星型依赖拓扑
- ExpensesModule 和 InventoryModule 是**依赖最重的模块**（分别依赖 4 个和 2 个外部模块）
- 其余模块无外部模块依赖，**边界清晰**

### 2.3 数据模型分析

#### 表清单与业务域归属

| 业务域 | 表 | 数量 |
|--------|-----|------|
| 支出管理域 | `expenses`, `approvalRecords`, `approvalFlows` | 3 |
| 资产管理域 | `fixedAssets`, `assetOperationRecords`, `inventoryTasks`, `inventoryChecks` | 4 |
| 预算管理域 | `budgets`, `budgetAdjustments` | 2 |
| 分类管理域 | `categories` | 1 |
| 用户权限域 | `roles`, `userRoles` | 2 |
| 系统管理域 | `notifications`, `operationLogs`, `feishuSyncLogs`, `feishuSyncConfigs`, `dataRecords` | 5 |

#### 跨域数据耦合

| 耦合类型 | 涉及表 | 影响 |
|---------|--------|------|
| 显式外键 | `inventoryChecks.assetId` → `fixedAssets.id` | 盘点域直接依赖资产域 |
| 隐式引用 | `budgetAdjustments.budgetId` → `budgets.id` | 同域内关联 |
| 共享类型 | `userProfile` (7+ 表), `feishuRecordId` (5 表) | 所有域共享用户标识与飞书同步键 |
| 共享维度 | `department`, `floor`, `categoryL1/L2` | 支出与资产域共享业务维度标签 |

**核心问题：** `userProfile` 复合类型被几乎所有表引用，`feishuRecordId` 被 5 个核心业务表作为唯一索引使用。这两者在微服务拆分中构成**最严重的跨服务数据耦合**。

### 2.4 业务领域分析

基于 DDD（领域驱动设计）视角：

| 领域类型 | 领域 | 聚合根 | 边界 |
|---------|------|--------|------|
| **核心域** | 支出管理 | Expense | 费用记录 + 审批流程 + 审批记录 |
| **核心域** | 资产管理 | FixedAsset | 资产台账 + 操作记录 + 库存 |
| **核心域** | 盘点执行 | InventoryTask | 盘点任务 + 检查项 + 差异 |
| **支撑域** | 预算管理 | Budget | 预算 + 调整记录 |
| **支撑域** | 分类管理 | Category | 二级分类字典 |
| **支撑域** | 数据看板 | Dashboard（聚合根） | 跨域聚合查询 |
| **支撑域** | 报表统计 | Report（聚合根） | 跨域分析查询 |
| **通用域** | 用户与权限 | Role | RBAC 三层权限 |
| **通用域** | 通知推送 | Notification | 系统消息 |
| **通用域** | 审计日志 | OperationLog | 操作审计 |
| **通用域** | 飞书同步 | FeishuSyncConfig | 外部系统集成 |

### 2.5 技术架构分析

| 维度 | 现状 |
|------|------|
| 运行时 | NestJS 10.x + Node.js 22 |
| 数据库 | PostgreSQL（Drizzle ORM，单数据库单 schema） |
| 缓存 | Redis + 内存双引擎 |
| 前端 | React 19 + React Router v6 + Tailwind CSS |
| 部署 | FaaS 平台（妙搭），单实例部署 |
| 认证 | 飞书 OAuth 2.0 + JWT 双令牌 |
| 权限 | RBAC（菜单/数据/操作三级，JSONB 存储） |
| 外部集成 | 飞书多维表格（Base/Bitable）双向同步 |
| 监控 | 内置性能/错误/业务/告警四维监控体系 |
| 日志 | 结构化日志 + 操作审计日志 |

---

## 3. 微服务拆分评估

### 3.1 拆分必要性评估

| 评估维度 | 现状 | 结论 |
|---------|------|------|
| 系统规模 | 18 模块 / 17 表 / ~90 API 端点 | 中等偏小，单体可维护 |
| 团队规模 | 单团队（推断） | 无团队自治需求 |
| 部署频率 | 统一发布 | 无独立部署需求 |
| 扩展性需求 | 单实例 FaaS | 无弹性伸缩需求 |
| 技术栈多样性 | 统一 NestJS | 无多语言/多框架需求 |
| 数据量级 | 企业行政资产（中小规模） | 无分库分表需求 |

**结论：当前没有足够的驱动力进行微服务拆分。**

### 3.2 拆分风险评估

| 风险 | 严重程度 | 说明 |
|------|---------|------|
| 分布式事务 | 🔴 高 | 支出与预算联动、盘点与资产联动需要跨服务一致性 |
| 数据一致性 | 🔴 高 | `userProfile` 跨 7+ 表共享，拆库后数据同步复杂 |
| 服务间通信延迟 | 🟡 中 | 看板/报表服务需要跨 5+ 个服务聚合数据 |
| 运维复杂度 | 🟡 中 | 从 1 个服务 → 10+ 个服务，监控/日志/链路追踪量级增长 |
| 调试排障 | 🟡 中 | 分布式链路追踪基础设施需要从零搭建 |
| 飞书同步耦合 | 🔴 高 | `feishuRecordId` 跨 5 表唯一索引，拆分后同步一致性难以保证 |

### 3.3 拆分收益评估

| 收益 | 当前阶段获益程度 | 说明 |
|------|----------------|------|
| 独立部署 | 低 | 单体部署已满足需求 |
| 技术栈灵活性 | 低 | 无多语言需求 |
| 团队自治 | 低 | 单团队 |
| 故障隔离 | 中 | 飞书同步故障可影响其他模块，值得隔离 |
| 代码可维护性 | 中 | 模块化单体已能做到，无需微服务 |
| 独立扩展 | 低 | 无热点服务需要独立扩缩 |

### 3.4 拆分成本评估

| 成本类别 | 估算 | 说明 |
|---------|------|------|
| 开发成本 | 3-6 人月 | 服务拆分、通信层、数据迁移、测试 |
| 测试成本 | 2-3 人月 | 集成测试、契约测试、端到端测试 |
| 运维成本 | 持续增加 | CI/CD 流水线 × N、监控 × N、日志聚合 |
| 迁移成本 | 2-4 人月 | 数据迁移、双写过渡、灰度切换 |
| 学习成本 | 1-2 人月 | 分布式系统、服务网格、事件驱动 |

**总计估算：8-15 人月**，且运维成本永久增加。

---

## 4. 微服务拆分方案

### 方案 A：按业务领域拆分（DDD 推荐，10 个服务）

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│          (路由 / 认证 / 限流 / 日志 / 链路追踪)                │
└──────┬──────┬──────┬──────┬──────┬──────┬──────┬────────────┘
       │      │      │      │      │      │      │
       ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Expense│ │Asset │ │Inv   │ │Budget│ │Cat   │ │Dash  │ │Report│
│Svc   │ │Svc   │ │Svc   │ │Svc   │ │Svc   │ │board │ │Svc   │
│      │ │      │ │      │ │      │ │      │ │Svc   │ │      │
│ DB   │ │ DB   │ │ DB   │ │ DB   │ │ DB   │ │(聚合) │ │(聚合) │
└──────┘ └──────┘ └──┬───┘ └──────┘ └──────┘ └──────┘ └──────┘
                     │ 外键引用 Asset
                     │
┌──────┐ ┌──────┐ ┌──────┐
│User  │ │Notif │ │Audit │
│Svc   │ │Svc   │ │Svc   │
│      │ │      │ │      │
│ DB   │ │ DB   │ │ DB   │
└──────┘ └──────┘ └──────┘
```

**服务清单：**

| # | 服务名 | 数据 | 对外 API | 依赖 |
|---|--------|------|---------|------|
| 1 | expense-service | expenses, approvalRecords, approvalFlows | `/api/expenses` | asset-service, budget-service, user-service |
| 2 | asset-service | fixedAssets, assetOperationRecords | `/api/fixed-assets` | user-service |
| 3 | inventory-service | inventoryTasks, inventoryChecks | `/api/inventory-tasks`, `/api/inventory-checks` | asset-service, user-service |
| 4 | budget-service | budgets, budgetAdjustments | `/api/budget` | user-service |
| 5 | category-service | categories | `/api/categories` | — |
| 6 | dashboard-service | 无自有数据（聚合） | `/api/dashboard` | expense/asset/inventory/budget-service |
| 7 | report-service | 无自有数据（聚合） | `/api/reports` | expense/asset/inventory-service |
| 8 | user-service | roles, userRoles | `/api/roles`, `/api/users` | — |
| 9 | notification-service | notifications | `/api/notifications` | user-service |
| 10 | audit-service | operationLogs | `/api/operation-logs` | — |

**优点：** 边界清晰，符合 DDD 限界上下文；独立部署和扩展。
**缺点：** 服务数量多（10 个），dashboard/report 服务需要跨 4-5 个服务聚合数据，延迟叠加；`userProfile` 数据需要在每个服务中冗余存储或通过 user-service 查询。

### 方案 B：按模块合并拆分（中等粒度，5 个服务）

```
┌─────────────────────────────────────────────┐
│                API Gateway                   │
└────┬──────────┬──────────┬──────────┬───────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
┌─────────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│ 资产域   │ │ 支出域│ │ 系统域│ │ 数据服务  │
│Svc      │ │Svc   │ │Svc   │ │Svc       │
│         │ │      │ │      │ │          │
│fixedAssets││expenses││roles │ │dashboard │
│inventory ││budget │ │users │ │reports   │
│(盘点)    │ │categories│notif │ │inventory-│
│         │ │      │ │audit │ │dashboard │
│ DB      │ │ DB   │ │ DB   │ │(聚合)    │
└─────────┘ └──────┘ └──────┘ └──────────┘
     │
     │ 飞书同步
     ▼
┌──────────┐
│ 飞书集成  │
│Svc       │
│feishu-   │
│sync      │
│feishu-   │
│bitable   │
└──────────┘
```

**服务清单：**

| # | 服务名 | 包含模块 | 数据 |
|---|--------|---------|------|
| 1 | asset-service | FixedAssets + Inventory + InventoryDashboard | fixedAssets, assetOperationRecords, inventoryTasks, inventoryChecks |
| 2 | expense-service | Expenses + Budget + Categories | expenses, approvalRecords, approvalFlows, budgets, budgetAdjustments, categories |
| 3 | system-service | Roles + Users + Notifications + Audit | roles, userRoles, notifications, operationLogs |
| 4 | data-service | Dashboard + Reports | 无自有数据（聚合） |
| 5 | feishu-integration | FeishuBitable + FeishuSync | feishuSyncConfigs, feishuSyncLogs, dataRecords |

**优点：** 服务数量适中（5 个），资产域内盘点与资产天然耦合，内部可用本地事务；飞书同步独立隔离。
**缺点：** 资产域服务过重（4 表 + 3 模块），dashboard/report 仍需跨服务聚合。

### 方案 C：模块化单体（推荐当前阶段）

```
┌──────────────────────────────────────────────────────┐
│                   Monolith (单进程)                    │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ 支出模块  │ │ 资产模块  │ │ 盘点模块  │  ... 18 模块 │
│  │          │ │          │ │          │             │
│  │ 接口抽象  │ │ 接口抽象  │ │ 接口抽象  │             │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘             │
│       │            │            │                    │
│       ▼            ▼            ▼                    │
│  ┌──────────────────────────────────────┐            │
│  │        共享内核（Shared Kernel）       │            │
│  │  FeishuBitableService / Drizzle DB   │            │
│  │  AuthNPaasService / CacheService     │            │
│  └──────────────────────────────────────┘            │
│                                                      │
│  ┌──────────────────────────────────────┐            │
│  │          PostgreSQL (单数据库)         │            │
│  └──────────────────────────────────────┘            │
└──────────────────────────────────────────────────────┘
```

**核心原则：**

1. **严格的模块边界**：每个模块只通过 `exports` 暴露明确的接口（Service 方法），禁止跨模块直接访问数据库表
2. **接口抽象**：关键依赖（如 FeishuBitableService）通过 NestJS 接口注入，便于未来替换为 RPC 调用
3. **独立测试**：每个模块有独立的单元测试和集成测试，不依赖其他模块的数据库状态
4. **为拆分准备**：模块目录结构、API 契约、数据访问层保持与微服务方案一致，未来拆分为微服务时只需替换通信层

**优点：** 零额外成本，保持当前开发效率；所有优化收益（模块化、接口抽象）可立即获得。
**缺点：** 无法获得故障隔离、独立部署等微服务核心收益。

---

## 5. 推荐方案与决策矩阵

| 评估维度 | 方案 A（10 服务） | 方案 B（5 服务） | 方案 C（模块化单体） |
|---------|-----------------|-----------------|-------------------|
| 开发成本 | 🔴 高 | 🟡 中 | 🟢 低 |
| 运维复杂度 | 🔴 高 | 🟡 中 | 🟢 低 |
| 故障隔离 | 🟢 好 | 🟡 中 | 🔴 差 |
| 独立部署 | 🟢 完全 | 🟡 部分 | 🔴 无 |
| 数据一致性 | 🔴 复杂 | 🟡 中等 | 🟢 简单 |
| 代码可维护性 | 🟢 好 | 🟢 好 | 🟡 中 |
| 当前适配度 | 🔴 过度设计 | 🟡 偏重 | 🟢 最佳 |

**推荐：方案 C（模块化单体），按需渐进式演进至方案 B。**

---

## 6. 服务间通信方案（远期参考）

### 6.1 同步通信

| 场景 | 推荐方案 | 说明 |
|------|---------|------|
| 服务间查询 | REST API（HTTP/2） | 简单、成熟，NestJS 原生支持 |
| 高频聚合查询 | gRPC | Dashboard/Report 服务跨多服务聚合场景 |
| 前端 BFF 层 | GraphQL | 可选，减少前端多次请求 |

### 6.2 异步通信

| 场景 | 推荐方案 | 说明 |
|------|---------|------|
| 领域事件 | 消息队列（建议 RabbitMQ） | 支出创建 → 预算扣减、资产状态变更 → 盘点同步 |
| 数据同步 | 事件溯源 | 飞书同步结果 → 各服务更新 |
| 审计日志 | 事件驱动 | 所有写操作 → 审计服务 |

### 6.3 事件设计

```
# 支出域事件
expense.created    → budget-service（预算执行更新）
expense.approved   → notification-service（审批通知）
                   → audit-service（审计记录）

# 资产域事件
asset.status_changed → inventory-service（盘点状态同步）
asset.repaired       → notification-service（维修完成通知）

# 盘点域事件
inventory.completed  → dashboard-service（看板数据刷新）
inventory.abnormal_found → notification-service（异常告警）
```

### 6.4 API 网关

推荐使用平台内置网关或 Nginx/Kong：

- 路由转发：`/api/expenses` → expense-service
- 认证鉴权：统一 JWT 验证
- 限流熔断：基于令牌桶算法
- 日志聚合：统一请求日志

---

## 7. 数据管理方案（远期参考）

### 7.1 数据库拆分策略

**方案：每个服务独立数据库（Database per Service）**

| 服务 | 数据库 | 包含表 |
|------|--------|--------|
| expense-service | expense_db | expenses, approvalRecords, approvalFlows |
| asset-service | asset_db | fixedAssets, assetOperationRecords |
| inventory-service | inventory_db | inventoryTasks, inventoryChecks |
| budget-service | budget_db | budgets, budgetAdjustments |
| category-service | category_db | categories |
| system-service | system_db | roles, userRoles, notifications, operationLogs |
| feishu-integration | feishu_db | feishuSyncConfigs, feishuSyncLogs, dataRecords |

### 7.2 共享数据策略

| 共享数据 | 处理策略 |
|---------|---------|
| userProfile | 每个服务独立存储用户 ID（字符串），通过 user-service 查询用户名/头像 |
| feishuRecordId | 保留在各服务中，通过 feishu-integration 服务同步时更新 |
| department / floor | 作为业务维度标签，在各服务中独立存储 |
| categoryL1/L2 | 通过 category-service API 查询，各服务缓存结果 |

### 7.3 数据一致性

| 场景 | 方案 |
|------|------|
| 支出创建 → 预算更新 | Saga 编排：支出服务创建 → 发送事件 → 预算服务扣减 → 成功确认 / 失败补偿 |
| 盘点完成 → 资产状态更新 | Saga 编排：盘点服务完成 → 发送事件 → 资产服务更新状态 |
| 看板/报表聚合 | CQRS：各服务发布领域事件 → 看板服务维护只读查询模型 |

### 7.4 数据迁移

采用 **Strangler Fig** 模式，分阶段迁移：

1. **Phase 1**：新建服务，保持共享数据库（1 数据库多 schema）
2. **Phase 2**：逐步拆分数据库，通过 CDC（Change Data Capture）同步
3. **Phase 3**：各服务独立数据库，移除共享数据库
4. **回滚**：每个 Phase 保留回滚脚本，通过双写 + 数据校验确保一致性

---

## 8. 部署与运维方案（远期参考）

### 8.1 容器化

```
每个服务 → Dockerfile → Docker Image → Kubernetes Deployment
```

- 基础镜像：`node:22-alpine`
- 构建工具：Docker BuildKit + 多阶段构建
- 编排：Kubernetes（Deployment + Service + Ingress）

### 8.2 CI/CD 流水线

```
Git Push → Build → Unit Test → Integration Test → 
Build Image → Push Registry → Deploy Staging → 
Smoke Test → Deploy Production
```

每个服务独立流水线，触发条件：对应目录文件变更。

### 8.3 可观测性

| 维度 | 工具 |
|------|------|
| 链路追踪 | OpenTelemetry + Jaeger |
| 日志聚合 | 结构化 JSON 日志 → ELK / Loki |
| 指标监控 | Prometheus + Grafana |
| 告警通知 | AlertManager → 飞书消息 |

### 8.4 配置管理

- 开发环境：`.env` 文件
- 生产环境：环境变量注入（Kubernetes ConfigMap/Secret）
- 敏感凭据：Kubernetes Secret + 加密存储

---

## 9. 迁移路线图

### Phase 1：模块化重构（当前 — 2 个月）

**目标：在不改变部署形态的前提下，为拆分做好准备。**

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 消除 FeishuBitableModule 直接依赖 | P0 | 每个模块封装自己的数据访问层，通过抽象接口调用 |
| 建立模块间接口契约 | P0 | 定义清晰的 Service 接口，禁止跨模块直接访问表 |
| 统一模块目录结构 | P1 | 确保每个模块有独立的 dto/、接口定义 |
| 提升测试覆盖率 | P1 | 每个模块独立集成测试，不依赖其他模块 |
| 分离共享类型 | P1 | 将 `shared/api.interface.ts` 按域拆分 |

### Phase 2：基础设施准备（2 — 3 个月）

**目标：搭建微服务所需的基础设施，选择试点模块。**

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 搭建 API 网关 | P0 | 路由转发、认证、限流 |
| 搭建消息队列 | P1 | RabbitMQ 或平台内置消息服务 |
| 搭建链路追踪 | P1 | OpenTelemetry 集成 |
| 选择试点模块 | P0 | 推荐飞书同步模块（边界清晰、无业务耦合） |

### Phase 3：试点拆分（3 — 4 个月）

**目标：拆分一个低风险模块，验证方案可行性。**

1. 拆分 feishu-integration 服务（feishuSync + feishuBitable）
2. 飞书同步独立部署，通过事件通知其他模块
3. 验证：同步延迟、数据一致性、故障恢复
4. 总结拆分经验，更新方案

### Phase 4：逐步拆分核心业务（4 — 12 个月，按需）

**目标：按优先级拆分核心业务模块。**

| 优先级 | 服务 | 原因 |
|--------|------|------|
| 1 | notification-service | 边界清晰，无外部依赖 |
| 2 | audit-service | 事件驱动天然适合 |
| 3 | category-service | 独立字典服务 |
| 4 | budget-service | 与支出域耦合，但可独立 |
| 5 | expense-service | 核心域，需 Saga 协调 |
| 6 | asset-service + inventory-service | 资产与盘点高耦合，建议一起拆分 |

---

## 10. 风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 拆分后性能下降 | 中 | 高 | 实施前进行性能基准测试，设置性能回归阈值 |
| 分布式事务数据不一致 | 高 | 高 | Saga 补偿机制 + 定期数据对账 |
| 飞书同步一致性破坏 | 高 | 高 | 飞书同步独立服务 + 事件溯源保证 |
| 团队学习曲线陡峭 | 中 | 中 | 渐进式拆分，从简单模块开始 |
| 运维成本失控 | 高 | 中 | 优先使用平台托管服务，减少自建 |
| 拆分后无法回退 | 低 | 高 | 保留单体回退能力，双写过渡 |

---

## 11. 结论与建议

### 11.1 核心结论

**当前阶段不推荐进行微服务拆分。** 推荐采用「模块化单体」架构，通过强化模块边界、接口抽象和独立测试，在不增加分布式复杂度的前提下获得代码可维护性收益。

### 11.2 立即行动项

1. **消除 FeishuBitableModule 星型依赖**：将各模块对 FeishuBitableService 的直接依赖改为通过抽象接口，为未来替换为 RPC 调用做准备
2. **拆分 shared/api.interface.ts**：当前 1071 行单文件，按业务域拆分为多个文件
3. **建立模块间接口契约**：禁止跨模块直接访问数据库表，所有跨模块数据访问通过 Service 接口
4. **提升测试覆盖率**：确保每个模块有独立的集成测试

### 11.3 触发拆分的条件

当以下条件**同时满足 ≥ 3 项**时，重新评估拆分：

- [ ] 系统 API 端点超过 200 个
- [ ] 数据库表超过 40 张
- [ ] 团队规模超过 3 个独立小组
- [ ] 某个模块需要独立扩缩容
- [ ] 某个模块需要不同的技术栈
- [ ] 部署频率需要解耦（不同模块不同发布节奏）

---

> **文档维护者：** 架构团队
> **下次评审日期：** 2027-03-05
> **关联文档：** [architecture.md](./architecture.md) · [deployment.md](./deployment.md) · [credential-rotation.md](./credential-rotation.md)