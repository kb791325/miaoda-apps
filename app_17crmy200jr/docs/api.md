# API 接口文档

## 1. API 概览

- **Base URL**: `/api`
- **认证方式**: 飞书身份认证（通过 `@NeedLogin()` 装饰器控制）
- **响应格式**: JSON
- **分页格式**: `{ items: T[], total: number, page: number, pageSize: number }`

### 1.1 通用错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或登录已过期 |
| 403 | 无权限执行该操作 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如库存不足、重复创建） |
| 500 | 服务器内部错误 |

---

## 2. 支出管理 `/api/expenses`

### 2.1 分页查询支出列表

```
GET /api/expenses
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |
| startDate | string | 否 | 开始日期 YYYY-MM-DD |
| endDate | string | 否 | 结束日期 YYYY-MM-DD |
| categoryL1 | string | 否 | 一级类目 |
| categoryL2 | string | 否 | 二级类目 |
| paymentEntity | string | 否 | 付款主体 |
| floor | string | 否 | 楼层 |
| department | string | 否 | 部门 |
| handler | string | 否 | 经办人 |
| keyword | string | 否 | 关键词搜索 |
| sortBy | string | 否 | 排序字段 |
| sortOrder | string | 否 | 排序方向 asc/desc |

**响应**:

```json
{
  "items": [{
    "id": "uuid",
    "title": "string",
    "amount": "number",
    "categoryL1": "string",
    "categoryL2": "string",
    "paymentEntity": "string",
    "floor": "string",
    "department": "string",
    "handler": "string",
    "status": "string",
    "createdAt": "string"
  }],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### 2.2 新增支出

```
POST /api/expenses
```

**请求体**:

```json
{
  "title": "string",
  "amount": "number",
  "categoryL1": "string",
  "categoryL2": "string",
  "paymentEntity": "string",
  "floor": "string",
  "department": "string",
  "handler": "string",
  "description": "string",
  "attachments": ["file_path"]
}
```

### 2.3 批量更新支出类目

```
POST /api/expenses/batch-update-category
```

**请求体**:

```json
{
  "ids": ["uuid"],
  "categoryL1": "string",
  "categoryL2": "string"
}
```

### 2.4 批量更新支出部门

```
POST /api/expenses/batch-update-department
```

**请求体**:

```json
{
  "ids": ["uuid"],
  "department": "string"
}
```

### 2.5 查询支出详情

```
GET /api/expenses/:id
```

### 2.6 更新支出

```
PUT /api/expenses/:id
```

### 2.7 删除支出

```
DELETE /api/expenses/:id
```

---

## 3. 固定资产 `/api/fixed-assets`

### 3.1 汇总统计

```
GET /api/fixed-assets/summary
```

**查询参数**: assetType, floor, department, paymentEntity, ownerName, keyword

### 3.2 用户选项列表

```
GET /api/fixed-assets/user-options
```

### 3.3 分页查询资产列表

```
GET /api/fixed-assets
```

**查询参数**: page, pageSize, assetType, status, floor, department, paymentEntity, ownerName, keyword, sortBy, sortOrder, stockBelowThreshold

### 3.4 查询资产盘点历史

```
GET /api/fixed-assets/:id/check-history
```

### 3.5 查询资产操作记录

```
GET /api/fixed-assets/:id/operation-history
```

### 3.6 查询资产详情

```
GET /api/fixed-assets/:id
```

### 3.7 新增资产

```
POST /api/fixed-assets
```

### 3.8 批量更新资产类目

```
POST /api/fixed-assets/batch-update-category
```

### 3.9 批量更新资产楼层

```
POST /api/fixed-assets/batch-update-floor
```

### 3.10 批量调拨

```
POST /api/fixed-assets/batch-transfer
```

### 3.11 批量报废

```
POST /api/fixed-assets/batch-scrap
```

### 3.12 编辑资产

```
PUT /api/fixed-assets/:id
```

### 3.13 删除资产

```
DELETE /api/fixed-assets/:id
```

### 3.14 领用资产

```
POST /api/fixed-assets/:id/borrow
```

### 3.15 归还资产

```
POST /api/fixed-assets/:id/return
```

### 3.16 发起维修

```
POST /api/fixed-assets/:id/repair/start
```

### 3.17 完成维修

```
POST /api/fixed-assets/:id/repair/complete
```

### 3.18 发起调拨

```
POST /api/fixed-assets/:id/transfer/start
```

### 3.19 完成调拨

```
POST /api/fixed-assets/:id/transfer/complete
```

### 3.20 报废资产

```
POST /api/fixed-assets/:id/scrap
```

---

## 4. 盘点管理 `/api/inventory-tasks`

### 4.1 分页查询盘点任务

```
GET /api/inventory-tasks
```

**查询参数**: page, pageSize, status, inventoryMonth, keyword

### 4.2 创建盘点任务

```
POST /api/inventory-tasks
```

### 4.3 删除盘点任务

```
DELETE /api/inventory-tasks/:id
```

### 4.4 查询盘点明细

```
GET /api/inventory-tasks/:id/checks
```

### 4.5 查询盘点任务详情

```
GET /api/inventory-tasks/:id
```

### 4.6 重新生成盘点明细

```
POST /api/inventory-tasks/:id/regenerate-checks
```

### 4.7 完成盘点任务

```
POST /api/inventory-tasks/:id/complete
```

### 4.8 重置盘点明细

```
POST /api/inventory-tasks/:id/reset-checks
```

### 4.9 更新盘点明细

```
PATCH /api/inventory-checks/:id
```

### 4.10 确认盘点差异

```
POST /api/inventory-checks/:id/confirm-diff
```

---

## 5. 综合看板 `/api/dashboard`

### 5.1 支出总览

```
GET /api/dashboard/expense-overview
```

响应：总金额、笔数、同比增长率

### 5.2 支出趋势

```
GET /api/dashboard/expense-trend?months=12
```

### 5.3 按类目统计

```
GET /api/dashboard/expense-by-category
```

### 5.4 按付款主体统计

```
GET /api/dashboard/expense-by-entity
```

### 5.5 按楼层统计

```
GET /api/dashboard/expense-by-floor
```

### 5.6 按部门统计

```
GET /api/dashboard/expense-by-department?top=10
```

### 5.7 资产总览

```
GET /api/dashboard/asset-overview
```

### 5.8 预算执行情况

```
GET /api/dashboard/expense-budget-execution
```

### 5.9 支出排名

```
GET /api/dashboard/expense-ranking?type=department
```

### 5.10 资产状态分布

```
GET /api/dashboard/asset-status-distribution
```

### 5.11 资产折旧汇总

```
GET /api/dashboard/asset-depreciation
```

### 5.12 待维修资产列表

```
GET /api/dashboard/asset-repair-pending
```

---

## 6. 盘点看板 `/api/inventory-dashboard`

### 6.1 盘点看板总览

```
GET /api/inventory-dashboard/overview
```

### 6.2 负责人矩阵

```
GET /api/inventory-dashboard/owner-matrix?department=xxx&keyword=xxx
```

### 6.3 盘点时间线

```
GET /api/inventory-dashboard/timeline
```

### 6.4 库存总览

```
GET /api/inventory-dashboard/stock
```

### 6.5 库存趋势

```
GET /api/inventory-dashboard/stock-trend
```

### 6.6 异常盘点项列表

```
GET /api/inventory-dashboard/abnormal-list?page=1&pageSize=20
```

### 6.7 完成率趋势

```
GET /api/inventory-dashboard/completion-rate-trend
```

### 6.8 批量清理异常

```
POST /api/inventory-dashboard/batch-clean-abnormal
```

### 6.9 部门完成率排名

```
GET /api/inventory-dashboard/department-completion-ranking
```

### 6.10 标记异常已处理

```
PATCH /api/inventory-dashboard/checks/:id/resolve
```

---

## 7. 预算管理 `/api/budget`

### 7.1 分页查询预算

```
GET /api/budget?year=2026&month=9&department=xxx
```

### 7.2 预算执行汇总

```
GET /api/budget/execution/summary?year=2026&month=9
```

### 7.3 检查超预算

```
GET /api/budget/check-overrun?department=xxx&month=2026-09&amount=50000
```

### 7.4 批量创建预算

```
POST /api/budget/batch
```

### 7.5 查询预算详情

```
GET /api/budget/:id
```

### 7.6 创建预算

```
POST /api/budget
```

### 7.7 更新预算

```
PUT /api/budget/:id
```

### 7.8 删除预算

```
DELETE /api/budget/:id
```

### 7.9 查询调整记录

```
GET /api/budget/:id/adjustments
```

---

## 8. 类目管理 `/api/categories`

### 8.1 一级类目列表

```
GET /api/categories/l1
```

### 8.2 二级类目列表

```
GET /api/categories/l2?l1=xxx&keyword=xxx&page=1&pageSize=20
```

### 8.3 类目联动选项

```
GET /api/categories/options
```

响应：一级+二级树形结构，供下拉选择使用

### 8.4 新增一级类目

```
POST /api/categories/l1
```

### 8.5 新增二级类目

```
POST /api/categories/l2
```

### 8.6 编辑类目

```
PUT /api/categories/:id
```

### 8.7 删除类目

```
DELETE /api/categories/:id
```

---

## 9. 角色权限 `/api/roles`

### 9.1 角色列表

```
GET /api/roles
```

响应：含每个角色的用户数量

### 9.2 获取当前用户权限

```
GET /api/roles/permissions/me
```

### 9.3 用户列表

```
GET /api/roles/users/list?keyword=xxx&roleId=xxx&page=1&pageSize=20
```

### 9.4 查询用户角色

```
GET /api/roles/users/:userId
```

### 9.5 为用户分配角色

```
POST /api/roles/users/:userId/roles
```

### 9.6 移除用户角色

```
DELETE /api/roles/users/:userId/roles/:roleId
```

### 9.7 角色详情

```
GET /api/roles/:id
```

### 9.8 角色下用户列表

```
GET /api/roles/:id/users
```

### 9.9 创建角色

```
POST /api/roles
```

### 9.10 更新角色

```
PUT /api/roles/:id
```

### 9.11 删除角色

```
DELETE /api/roles/:id
```

### 9.12 复制角色

```
POST /api/roles/:id/copy
```

---

## 10. 通知管理 `/api/notifications`

### 10.1 通知列表

```
GET /api/notifications?type=xxx&read=false&page=1&pageSize=20
```

### 10.2 未读数量

```
GET /api/notifications/unread-count
```

### 10.3 通知详情

```
GET /api/notifications/:id
```

### 10.4 标记已读

```
POST /api/notifications/:id/read
```

### 10.5 全部已读

```
POST /api/notifications/read-all
```

### 10.6 创建通知

```
POST /api/notifications
```

### 10.7 删除通知

```
DELETE /api/notifications/:id
```

---

## 11. 操作日志 `/api/operation-logs`

### 11.1 分页查询日志

```
GET /api/operation-logs?operator=xxx&operationType=xxx&targetType=xxx&startDate=xxx&endDate=xxx&page=1&pageSize=20
```

### 11.2 日志统计

```
GET /api/operation-logs/stats
```

### 11.3 日志详情

```
GET /api/operation-logs/:id
```

---

## 12. 报表 `/api/reports`

### 12.1 支出分析报表

```
GET /api/reports/expense-analysis?timeDimension=month&analysisDimension=category&startDate=xxx&endDate=xxx
```

### 12.2 资产分析报表

```
GET /api/reports/asset-analysis
```

### 12.3 盘点分析报表

```
GET /api/reports/inventory-analysis?year=2026
```

---

## 13. 飞书同步 `/api/feishu-sync`

### 13.1 获取同步配置

```
GET /api/feishu-sync/configs
```

### 13.2 更新同步配置

```
PUT /api/feishu-sync/configs/:domain
```

### 13.3 同步日志

```
GET /api/feishu-sync/logs?domain=xxx&direction=xxx&status=xxx&page=1&pageSize=20
```

### 13.4 探测字段

```
GET /api/feishu-sync/:domain/probe-fields
```

### 13.5 手动触发同步

```
POST /api/feishu-sync/:domain/sync
```

**请求体**:

```json
{
  "direction": "pull"
}
```

---

## 14. 用户搜索 `/api/users`

### 14.1 搜索用户

```
GET /api/users/search?keyword=xxx&limit=20
```

---

## 接口统计

| 模块 | 接口数 |
|------|--------|
| 支出管理 | 7 |
| 固定资产 | 20 |
| 盘点管理 | 10 |
| 综合看板 | 12 |
| 盘点看板 | 10 |
| 预算管理 | 9 |
| 类目管理 | 7 |
| 角色权限 | 12 |
| 通知管理 | 7 |
| 操作日志 | 3 |
| 报表 | 3 |
| 飞书同步 | 5 |
| 用户搜索 | 1 |
| **合计** | **106** |