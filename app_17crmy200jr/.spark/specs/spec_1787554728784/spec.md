# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [数据库, 插件, 服务端, 前端]

## 页面路由与导航

### 页面路由
| 页面 | 路径 |
|------|------|
| 综合数据看板 | /dashboard |
| 资产盘点看板 | /inventory-dashboard |
| 行政支出管理 | /expenses |
| 固定资产管理 | /fixed-assets |
| 资产盘点执行 | /inventory-checks |
| 类目管理 | /categories |
| 数据统计与报表 | /reports |
| 系统设置 | /settings |

### 导航设计
- 导航机制：页面路由（左侧 Sidebar）
- 导航项：
  - 综合数据看板（/dashboard）
  - 资产盘点看板（/inventory-dashboard）
  - 行政支出管理（/expenses）
  - 固定资产管理（/fixed-assets）
  - 资产盘点执行（/inventory-checks）
  - 类目管理（/categories）
  - 数据统计与报表（/reports）
  - 系统设置（/settings）

## 业务组件
| 组件 | 来源 | 关联页面 | 对应功能点 |
|------|------|---------|-----------|
| UserSelect | 内置业务组件 | 支出管理/资产管理/盘点执行/系统设置 | 经办人、归属人、盘点人、审批人选择 |
| FileUpload | 内置文件服务 | 支出管理 | 发票附件、购买截屏上传 |
| DataTable | shadcn/ui 组合 | 所有列表页 | 数据表格展示、排序、分页 |
| Dialog | shadcn/ui | 所有新增/编辑弹窗 | 表单弹窗 |
| Drawer | shadcn/ui | 支出/资产详情 | 详情侧滑面板 |
| Tabs | shadcn/ui | 数据统计与报表/系统设置 | Tab 切换 |

## 数据模型

### 数据库设计

#### 行政支出表（expenses）
用途：存储每一笔行政支出记录的完整信息，包括金额、类目、主体、部门、审批状态等。
核心字段：
- expense_date: date (支出日期)
- amount: numeric(12,2) (支出金额，2位小数)
- description: text (支出说明)
- category_l1: varchar (一级类目)
- category_l2: varchar (二级类目)
- payer_entity: varchar (付费主体)
- floor: varchar (使用楼层)
- department: varchar (部门)
- purchase_department: varchar (采购申请部门)
- handler: user_profile (经办人)
- approval_status: varchar ['draft', 'pending', 'approved', 'rejected'] (审批状态：草稿/审批中/已通过/已驳回)
- invoice_url: text (发票附件URL)
- screenshot_url: text (购买截屏URL)
- year: int (年度，根据支出日期自动计算)
- month: int (月份，根据支出日期自动计算)
- quarter: int (季度，根据支出日期自动计算)
- feishu_record_id: varchar (飞书多维表格记录ID)
关联关系：通过 category_l1 + category_l2 与类目表关联

#### 固定资产表（fixed_assets）
用途：存储企业固定资产台账信息，包括资产基本信息、采购信息、归属和库存。
核心字段：
- asset_name: varchar (资产名称)
- asset_type: varchar ['other', 'office_furniture', 'phone', 'laptop', 'camera', 'desktop'] (资产类型)
- asset_category: varchar (资产类目)
- purchase_date: date (采购日期)
- purchase_amount: numeric(12,2) (采购金额)
- purchase_department: varchar (采购申请部门)
- payer_entity: varchar (付费主体)
- floor: varchar (使用楼层)
- handler: user_profile (经办人)
- owner: user_profile (归属人)
- last_check_date: date (最近盘点日期)
- safety_stock: int (安全库存阈值)
- current_stock: int (当前库存数量)
- feishu_record_id: varchar (飞书多维表格记录ID)
关联关系：与资产盘点表是一对多关系（一个资产有多条盘点记录）

#### 资产盘点表（inventory_checks）
用途：存储每次盘点任务中的资产盘点明细记录，包括账面数量、实盘数量、差异和状态。
核心字段：
- check_no: varchar (盘点单号，格式 CK-YYYYMMDD-XXXX，唯一)
- check_task_id: uuid (盘点任务ID，关联盘点任务表)
- check_year: int (盘点年份)
- check_month: varchar (盘点月份)
- check_date: date (盘点日期)
- checker: user_profile (盘点人)
- owner: user_profile (归属人)
- asset_id: uuid (资产ID，关联固定资产表)
- asset_name: varchar (资产名称)
- asset_type: varchar (资产类型)
- book_quantity: int (账面数量)
- actual_quantity: int (实盘数量)
- difference: int (差异数量，实盘-账面)
- status: varchar ['checked', 'unchecked', 'abnormal'] (盘点状态：已盘点/未盘点/异常)
- remark: text (盘点备注)
- feishu_record_id: varchar (飞书多维表格记录ID)
关联关系：多对一关联固定资产表、盘点任务表

#### 盘点任务表（inventory_tasks）
用途：存储盘点任务的元信息，作为盘点明细的容器。
核心字段：
- task_no: varchar (任务单号，CK-YYYYMMDD-XXXX，唯一)
- check_year: int (盘点年份)
- check_month: varchar (盘点月份)
- status: varchar ['pending', 'in_progress', 'completed', 'abnormal'] (任务状态)
- scope_type: varchar ['all', 'department', 'owner', 'floor', 'asset_type'] (盘点范围类型)
- scope_value: text (范围值，JSON格式存储部门/归属人/楼层/类型列表)
- progress: int (进度百分比)
- total_count: int (待盘点资产总数)
- checked_count: int (已盘点数)
- abnormal_count: int (异常数)
关联关系：一对多关联资产盘点表

#### 类目对照表（categories）
用途：存储一级类目和二级类目的映射关系，为支出录入和统计提供基础数据。
核心字段：
- category_l1: varchar (一级类目)
- category_l2: varchar (二级类目)
- sort_order: int (排序号)
- feishu_record_id: varchar (飞书多维表格记录ID)

#### 飞书同步配置表（feishu_sync_configs）
用途：存储各业务域的飞书多维表格同步配置。
核心字段：
- domain: varchar ['expenses', 'fixed_assets', 'inventory_checks', 'categories', 'data'] (业务域)
- base_token: varchar (飞书多维表格 base token)
- table_id: varchar (飞书多维表格 table ID)
- sync_direction: varchar ['bidirectional', 'push', 'pull'] (同步方向)
- field_mapping: json (字段映射关系)
- unique_key: varchar (同步唯一键字段)
- is_enabled: boolean (是否启用)
- last_sync_time: timestamptz (上次同步时间)
- last_sync_status: varchar ['success', 'failed', 'syncing'] (上次同步状态)

#### 飞书同步日志表（feishu_sync_logs）
用途：记录每次飞书同步的执行日志，便于排查问题。
核心字段：
- domain: varchar (业务域)
- sync_type: varchar ['manual', 'auto'] (同步类型：手动/自动)
- direction: varchar ['push', 'pull'] (方向)
- status: varchar ['success', 'failed'] (状态)
- record_count: int (同步记录数)
- error_message: text (错误信息)
- sync_started_at: timestamptz (开始时间)
- sync_finished_at: timestamptz (结束时间)

#### 审批流程配置表（approval_flows）
用途：存储各业务类型的审批流程配置。
核心字段：
- flow_type: varchar ['expense', 'asset', 'inventory'] (流程类型)
- flow_name: varchar (流程名称)
- node_config: json (节点配置，包含节点顺序、审批人类型、审批人ID)
- is_active: boolean (是否启用)

#### 操作日志表（operation_logs）
用途：记录系统关键操作的审计日志。
核心字段：
- operator: user_profile (操作人)
- operation_type: varchar (操作类型：create/update/delete/approve/sync等)
- target_type: varchar (操作对象类型)
- target_id: uuid (操作对象ID)
- content: text (操作内容详情)
- ip_address: varchar (IP地址)

## 插件设计

| 插件名称 | 基础插件 | 用途 | 调用方式 | 关联页面 | 输入参数 | 输出类型 |
|---------|---------|------|---------|---------|---------|---------|
| feishu-bitable-expenses | feishu-bitable | 行政支出多维表格读写 | 服务端调用 | 系统设置/支出管理 | base_token, table_id, action | 视 action 而定 |
| feishu-bitable-assets | feishu-bitable | 固定资产多维表格读写 | 服务端调用 | 系统设置/固定资产管理 | base_token, table_id, action | 视 action 而定 |
| feishu-bitable-inventory | feishu-bitable | 盘点记录多维表格读写 | 服务端调用 | 系统设置/盘点执行 | base_token, table_id, action | 视 action 而定 |
| feishu-bitable-categories | feishu-bitable | 类目对照多维表格读写 | 服务端调用 | 系统设置/类目管理 | base_token, table_id, action | 视 action 而定 |
| feishu-bitable-data | feishu-bitable | 数据表多维表格读写 | 服务端调用 | 系统设置 | base_token, table_id, action | 视 action 而定 |

## 业务模型

### API 设计

#### 综合数据看板相关
**页面路径**: /dashboard

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 支出总览卡片 | API | GET /api/dashboard/expense-overview |
| 支出趋势折线图 | API | GET /api/dashboard/expense-trend |
| 类目支出饼图 | API | GET /api/dashboard/expense-by-category |
| 付费主体柱状图 | API | GET /api/dashboard/expense-by-entity |
| 楼层支出条形图 | API | GET /api/dashboard/expense-by-floor |
| 部门支出排行 | API | GET /api/dashboard/expense-by-department |
| 固定资产统计 | API | GET /api/dashboard/asset-overview |
| 待审批提醒 | API | GET /api/dashboard/pending-approvals |

**所需 API**:
```typescript
// 支出总览卡片 [领域模型: ExpenseModel] [对应页面功能: 支出总览卡片]
GET /api/dashboard/expense-overview
Response: {
  monthlyTotal: number;
  monthlyCount: number;
  yearlyTotal: number;
  yearOnYearGrowth: number;
}

// 支出趋势（近12个月） [领域模型: ExpenseModel] [对应页面功能: 支出趋势折线图]
GET /api/dashboard/expense-trend?months=12
Response: {
  items: Array<{ month: string; amount: number; count: number }>;
}

// 一级类目支出分布 [领域模型: ExpenseModel] [对应页面功能: 一级类目支出分布饼图]
GET /api/dashboard/expense-by-category
Response: {
  items: Array<{ category: string; amount: number; percentage: number }>;
}

// 付费主体支出对比 [领域模型: ExpenseModel] [对应页面功能: 付费主体支出对比柱状图]
GET /api/dashboard/expense-by-entity
Response: {
  items: Array<{ entity: string; amount: number }>;
}

// 楼层支出对比 [领域模型: ExpenseModel] [对应页面功能: 楼层支出对比条形图]
GET /api/dashboard/expense-by-floor
Response: {
  items: Array<{ floor: string; amount: number }>;
}

// 部门支出排行TOP10 [领域模型: ExpenseModel] [对应页面功能: 部门支出排行TOP10]
GET /api/dashboard/expense-by-department?limit=10
Response: {
  items: Array<{ department: string; amount: number }>;
}

// 固定资产统计 [领域模型: FixedAssetModel] [对应页面功能: 固定资产统计卡片]
GET /api/dashboard/asset-overview
Response: {
  totalCount: number;
  totalValue: number;
}

// 待审批事项提醒 [领域模型: ExpenseModel] [对应页面功能: 待审批事项提醒列表]
GET /api/dashboard/pending-approvals?limit=10
Response: {
  items: Array<{ id: string; type: string; title: string; amount: number; applicant: string; submittedAt: string }>;
}
```

#### 资产盘点看板相关
**页面路径**: /inventory-dashboard

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 盘点概览卡片 | API | GET /api/inventory-dashboard/overview |
| 归属人盘点矩阵 | API | GET /api/inventory-dashboard/owner-matrix |
| 盘点时间线 | API | GET /api/inventory-dashboard/timeline |
| 剩余库存看板 | API | GET /api/inventory-dashboard/stock |
| 库存趋势折线图 | API | GET /api/inventory-dashboard/stock-trend |
| 盘点异常列表 | API | GET /api/inventory-dashboard/abnormal-list |
| 发起盘点 | API | POST /api/inventory-tasks |
| 标记异常已处理 | API | PATCH /api/inventory-checks/:id/resolve |

**所需 API**:
```typescript
// 盘点概览卡片 [领域模型: InventoryCheckModel] [对应页面功能: 盘点概览卡片]
GET /api/inventory-dashboard/overview
Response: {
  totalAssets: number;
  checkedThisMonth: number;
  uncheckedCount: number;
  abnormalCount: number;
  completionRate: number;
  overdueCount: number;
  stockWarningCount: number;
}

// 归属人盘点矩阵 [领域模型: InventoryCheckModel] [对应页面功能: 归属人盘点矩阵热力图]
GET /api/inventory-dashboard/owner-matrix?department=&search=
Response: {
  items: Array<{
    ownerId: string;
    ownerName: string;
    department: string;
    monthly: Array<{ month: number; status: 'checked'|'unchecked'|'abnormal'; checkDate?: string; checker?: string }>;
  }>;
}

// 盘点时间线 [领域模型: FixedAssetModel + InventoryCheckModel] [对应页面功能: 盘点时间线]
GET /api/inventory-dashboard/timeline?sort=days_desc
Response: {
  items: Array<{
    ownerId: string;
    ownerName: string;
    department: string;
    assetCount: number;
    lastCheckDate: string;
    daysSinceLastCheck: number;
    nextSuggestedDate: string;
  }>;
}

// 剩余库存看板 [领域模型: FixedAssetModel] [对应页面功能: 剩余库存看板]
GET /api/inventory-dashboard/stock
Response: {
  byType: Array<{ assetType: string; count: number; value: number; safetyThreshold: number; belowThreshold: boolean; suggestedPurchase: number }>;
  totalValue: number;
  topOwners: Array<{ ownerId: string; ownerName: string; count: number }>;
}

// 近6个月库存趋势 [领域模型: FixedAssetModel] [对应页面功能: 近6个月库存数量折线图]
GET /api/inventory-dashboard/stock-trend?months=6
Response: {
  items: Array<{ month: string; byType: Array<{ assetType: string; count: number }> }>;
}

// 盘点异常列表 [领域模型: InventoryCheckModel] [对应页面功能: 盘点异常列表]
GET /api/inventory-dashboard/abnormal-list?page=1&pageSize=20
Response: {
  items: Array<{
    id: string;
    ownerName: string;
    assetName: string;
    assetType: string;
    bookQuantity: number;
    actualQuantity: number;
    difference: number;
    checkDate: string;
    status: string;
  }>;
  total: number;
}

// 标记异常已处理 [领域模型: InventoryCheckModel] [对应页面功能: 标记已处理操作]
PATCH /api/inventory-checks/:id/resolve
Body: { remark?: string }
Response: { success: boolean }
```

#### 行政支出管理相关
**页面路径**: /expenses

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 支出列表查询 | API | GET /api/expenses |
| 新增支出 | API | POST /api/expenses |
| 编辑支出 | API | PUT /api/expenses/:id |
| 删除支出 | API | DELETE /api/expenses/:id |
| 支出详情 | API | GET /api/expenses/:id |
| 提交审批 | API | POST /api/expenses/:id/submit |
| 审批通过 | API | POST /api/expenses/:id/approve |
| 审批驳回 | API | POST /api/expenses/:id/reject |
| 批量导出 | API | GET /api/expenses/export |
| 文件上传 | 平台能力 | 内置文件存储服务 |
| 获取当前用户 | 平台能力 | 内置用户系统 |

**所需 API**:
```typescript
// 支出列表 [领域模型: ExpenseModel] [对应页面功能: 支出列表查询]
GET /api/expenses?page=1&pageSize=20&startDate=&endDate=&categoryL1=&categoryL2=&payerEntity=&floor=&department=&approvalStatus=&handler=&keyword=&sortBy=&sortOrder=
Response: {
  items: Array<{
    id: string;
    expenseDate: string;
    amount: number;
    categoryL1: string;
    categoryL2: string;
    payerEntity: string;
    floor: string;
    department: string;
    handler: string;
    approvalStatus: string;
    description: string;
  }>;
  total: number;
  summary: { totalAmount: number };
}

// 支出详情 [领域模型: ExpenseModel] [对应页面功能: 详情查看]
GET /api/expenses/:id
Response: {
  id: string;
  expenseDate: string;
  amount: number;
  description: string;
  categoryL1: string;
  categoryL2: string;
  payerEntity: string;
  floor: string;
  department: string;
  purchaseDepartment: string;
  handler: { userId: string; name: string };
  approvalStatus: string;
  invoiceUrl: string;
  screenshotUrl: string;
  year: number;
  month: number;
  quarter: number;
  approvalHistory: Array<{ node: string; status: string; operator: string; time: string; remark?: string }>;
  createdAt: string;
  updatedAt: string;
}

// 新增支出 [领域模型: ExpenseModel] [对应页面功能: 新增支出]
POST /api/expenses
Body: {
  expenseDate: string;
  amount: number;
  description: string;
  categoryL1: string;
  categoryL2: string;
  payerEntity: string;
  floor: string;
  department: string;
  purchaseDepartment: string;
  handler: string;
  approvalStatus: string;
  invoiceUrl?: string;
  screenshotUrl?: string;
}
Response: { id: string }

// 编辑支出 [领域模型: ExpenseModel] [对应页面功能: 编辑支出]
PUT /api/expenses/:id
Body: 同上
Response: { success: boolean }

// 删除支出 [领域模型: ExpenseModel]
DELETE /api/expenses/:id
Response: { success: boolean }

// 提交审批 [领域模型: ExpenseModel] [对应页面功能: 提交审批]
POST /api/expenses/:id/submit
Response: { success: boolean }

// 审批通过 [领域模型: ExpenseModel] [对应页面功能: 审批通过]
POST /api/expenses/:id/approve
Body: { remark?: string }
Response: { success: boolean }

// 审批驳回 [领域模型: ExpenseModel] [对应页面功能: 审批驳回]
POST /api/expenses/:id/reject
Body: { remark: string }
Response: { success: boolean }

// 批量导出 [领域模型: ExpenseModel] [对应页面功能: 批量导出]
GET /api/expenses/export?startDate=&endDate=&categoryL1=&...
Response: application/octet-stream (Excel file)
```

#### 固定资产管理相关
**页面路径**: /fixed-assets

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 资产列表 | API | GET /api/fixed-assets |
| 新增资产 | API | POST /api/fixed-assets |
| 编辑资产 | API | PUT /api/fixed-assets/:id |
| 删除资产 | API | DELETE /api/fixed-assets/:id |
| 资产详情 | API | GET /api/fixed-assets/:id |
| 资产盘点历史 | API | GET /api/fixed-assets/:id/check-history |
| 汇总统计 | API | GET /api/fixed-assets/summary |

**所需 API**:
```typescript
// 资产列表 [领域模型: FixedAssetModel] [对应页面功能: 资产列表查询]
GET /api/fixed-assets?page=1&pageSize=20&assetType=&floor=&purchaseDepartment=&payerEntity=&owner=&keyword=&sortBy=&sortOrder=
Response: {
  items: Array<{
    id: string;
    assetName: string;
    assetType: string;
    assetCategory: string;
    purchaseDate: string;
    purchaseAmount: number;
    owner: { userId: string; name: string };
    floor: string;
    safetyStock: number;
    currentStock: number;
    belowThreshold: boolean;
  }>;
  total: number;
}

// 资产汇总 [领域模型: FixedAssetModel] [对应页面功能: 汇总统计]
GET /api/fixed-assets/summary?assetType=&floor=&...
Response: {
  totalCount: number;
  totalValue: number;
  inStockCount: number;
  inUseCount: number;
}

// 资产详情 [领域模型: FixedAssetModel] [对应页面功能: 详情查看]
GET /api/fixed-assets/:id
Response: {
  id: string;
  assetName: string;
  assetType: string;
  assetCategory: string;
  purchaseDate: string;
  purchaseAmount: number;
  purchaseDepartment: string;
  payerEntity: string;
  floor: string;
  handler: { userId: string; name: string };
  owner: { userId: string; name: string };
  lastCheckDate: string;
  safetyStock: number;
  currentStock: number;
}

// 新增资产 [领域模型: FixedAssetModel] [对应页面功能: 新增资产]
POST /api/fixed-assets
Body: {
  assetName: string;
  assetType: string;
  assetCategory: string;
  purchaseDate: string;
  purchaseAmount: number;
  purchaseDepartment: string;
  payerEntity: string;
  floor: string;
  handler: string;
  owner: string;
  safetyStock: number;
  currentStock: number;
}
Response: { id: string }

// 编辑资产 [领域模型: FixedAssetModel] [对应页面功能: 编辑资产]
PUT /api/fixed-assets/:id
Body: 同上
Response: { success: boolean }

// 删除资产 [领域模型: FixedAssetModel]
DELETE /api/fixed-assets/:id
Response: { success: boolean }

// 资产盘点历史 [领域模型: InventoryCheckModel] [对应页面功能: 盘点历史记录]
GET /api/fixed-assets/:id/check-history?page=1&pageSize=10
Response: {
  items: Array<{
    id: string;
    checkDate: string;
    checker: string;
    actualQuantity: number;
    difference: number;
    status: string;
    checkNo: string;
  }>;
  total: number;
}
```

#### 资产盘点执行相关
**页面路径**: /inventory-checks

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 盘点任务列表 | API | GET /api/inventory-tasks |
| 创建盘点任务 | API | POST /api/inventory-tasks |
| 盘点任务详情 | API | GET /api/inventory-tasks/:id |
| 盘点明细列表 | API | GET /api/inventory-tasks/:id/checks |
| 提交盘点结果 | API | PATCH /api/inventory-checks/:id |
| 全部完成并提交 | API | POST /api/inventory-tasks/:id/complete |
| 确认盘盈/盘亏 | API | POST /api/inventory-checks/:id/confirm-diff |
| 盘点报告导出 | API | GET /api/inventory-tasks/:id/export |
| 获取当前用户 | 平台能力 | 内置用户系统 |

**所需 API**:
```typescript
// 盘点任务列表 [领域模型: InventoryTaskModel] [对应页面功能: 盘点任务列表]
GET /api/inventory-tasks?page=1&pageSize=20&status=&month=&keyword=
Response: {
  items: Array<{
    id: string;
    taskNo: string;
    checkYear: number;
    checkMonth: string;
    checker: string;
    status: string;
    progress: number;
    totalCount: number;
    checkedCount: number;
    createdAt: string;
  }>;
  total: number;
}

// 创建盘点任务 [领域模型: InventoryTaskModel] [对应页面功能: 创建盘点任务]
POST /api/inventory-tasks
Body: {
  checkYear: number;
  checkMonth: string;
  scopeType: 'all' | 'department' | 'owner' | 'floor' | 'asset_type';
  scopeValue: string[];
}
Response: { id: string; taskNo: string }

// 生成盘点单号（预览） [领域模型: InventoryTaskModel] [对应页面功能: 自动生成盘点单号]
GET /api/inventory-tasks/generate-no
Response: { taskNo: string }

// 盘点任务详情 [领域模型: InventoryTaskModel] [对应页面功能: 盘点任务详情]
GET /api/inventory-tasks/:id
Response: {
  id: string;
  taskNo: string;
  checkYear: number;
  checkMonth: string;
  status: string;
  scopeType: string;
  scopeValue: string[];
  progress: number;
  totalCount: number;
  checkedCount: number;
  abnormalCount: number;
  createdAt: string;
}

// 盘点明细列表 [领域模型: InventoryCheckModel] [对应页面功能: 盘点执行列表]
GET /api/inventory-tasks/:id/checks?page=1&pageSize=50&status=
Response: {
  items: Array<{
    id: string;
    assetId: string;
    assetName: string;
    assetType: string;
    owner: string;
    bookQuantity: number;
    actualQuantity: number | null;
    difference: number | null;
    status: string;
    remark: string;
    isAbnormal: boolean;
  }>;
  total: number;
}

// 更新单条盘点记录 [领域模型: InventoryCheckModel] [对应页面功能: 录入实盘数量]
PATCH /api/inventory-checks/:id
Body: {
  actualQuantity: number;
  remark?: string;
}
Response: {
  id: string;
  difference: number;
  isAbnormal: boolean;
  status: string;
}

// 完成盘点任务 [领域模型: InventoryTaskModel] [对应页面功能: 全部完成并提交]
POST /api/inventory-tasks/:id/complete
Response: {
  success: boolean;
  completionRate: number;
  abnormalCount: number;
  surplusTotal: number;
  lossTotal: number;
}

// 确认盘盈/盘亏 [领域模型: InventoryCheckModel + FixedAssetModel] [对应页面功能: 差异处理]
POST /api/inventory-checks/:id/confirm-diff
Body: { adjustStock: boolean }
Response: { success: boolean; newStock: number }

// 盘点报告导出 [领域模型: InventoryTaskModel] [对应页面功能: 导出盘点报告]
GET /api/inventory-tasks/:id/export
Response: application/octet-stream (Excel file)
```

#### 类目管理相关
**页面路径**: /categories

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 一级类目列表 | API | GET /api/categories/l1 |
| 二级类目列表 | API | GET /api/categories/l2 |
| 新增一级类目 | API | POST /api/categories/l1 |
| 新增二级类目 | API | POST /api/categories/l2 |
| 编辑类目 | API | PUT /api/categories/:id |
| 删除类目 | API | DELETE /api/categories/:id |
| 类目联动选项 | API | GET /api/categories/options |

**所需 API**:
```typescript
// 一级类目列表 [领域模型: CategoryModel] [对应页面功能: 一级类目列表]
GET /api/categories/l1
Response: {
  items: Array<{
    id: string;
    categoryL1: string;
    childCount: number;
  }>;
}

// 二级类目列表 [领域模型: CategoryModel] [对应页面功能: 二级类目列表]
GET /api/categories/l2?categoryL1=&keyword=&page=1&pageSize=50
Response: {
  items: Array<{
    id: string;
    categoryL1: string;
    categoryL2: string;
    sortOrder: number;
  }>;
  total: number;
}

// 类目选项（供表单联动） [领域模型: CategoryModel] [对应页面功能: 一级二级联动]
GET /api/categories/options
Response: {
  items: Array<{
    categoryL1: string;
    children: Array<{ categoryL2: string }>;
  }>;
}

// 新增一级类目 [领域模型: CategoryModel] [对应页面功能: 新增一级类目]
POST /api/categories/l1
Body: { categoryL1: string }
Response: { id: string }

// 新增二级类目 [领域模型: CategoryModel] [对应页面功能: 新增二级类目]
POST /api/categories/l2
Body: { categoryL1: string; categoryL2: string; sortOrder: number }
Response: { id: string }

// 编辑类目 [领域模型: CategoryModel] [对应页面功能: 编辑类目]
PUT /api/categories/:id
Body: { categoryL1?: string; categoryL2?: string; sortOrder?: number }
Response: { success: boolean }

// 删除类目 [领域模型: CategoryModel] [对应页面功能: 删除类目]
DELETE /api/categories/:id
Response: { success: boolean }
```

#### 数据统计与报表相关
**页面路径**: /reports

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 支出分析（趋势/维度/排行） | API | GET /api/reports/expense-analysis |
| 资产分析（分布/价值） | API | GET /api/reports/asset-analysis |
| 盘点分析（完成率/异常率/趋势） | API | GET /api/reports/inventory-analysis |
| 报表导出 | API | GET /api/reports/export |

**所需 API**:
```typescript
// 支出分析报表 [领域模型: ExpenseModel] [对应页面功能: 支出分析报表]
GET /api/reports/expense-analysis?timeDimension=month&dimension=category&startDate=&endDate=
Response: {
  trend: Array<{ period: string; amount: number }>;
  dimensionBreakdown: Array<{ name: string; amount: number; percentage: number }>;
  topRanking: Array<{ name: string; amount: number }>;
}

// 资产分析报表 [领域模型: FixedAssetModel] [对应页面功能: 资产分析报表]
GET /api/reports/asset-analysis
Response: {
  typeDistribution: Array<{ type: string; count: number; value: number }>;
  valueDistribution: Array<{ range: string; count: number; value: number }>;
  floorDistribution: Array<{ floor: string; count: number; value: number }>;
}

// 盘点分析报表 [领域模型: InventoryCheckModel] [对应页面功能: 盘点分析报表]
GET /api/reports/inventory-analysis?year=2026
Response: {
  completionTrend: Array<{ month: string; rate: number }>;
  abnormalRate: Array<{ month: string; rate: number; count: number }>;
  departmentRanking: Array<{ department: string; completionRate: number }>;
}

// 报表导出 [领域模型: ExpenseModel/FixedAssetModel/InventoryCheckModel] [对应页面功能: 报表导出]
GET /api/reports/export?type=expense|asset|inventory&format=excel|pdf
Response: application/octet-stream
```

#### 系统设置相关
**页面路径**: /settings

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 飞书同步配置列表 | API | GET /api/feishu-sync/configs |
| 更新同步配置 | API | PUT /api/feishu-sync/configs/:domain |
| 同步日志查询 | API | GET /api/feishu-sync/logs |
| 手动触发同步 | API | POST /api/feishu-sync/:domain/sync |
| 审批流程配置 | API | GET/PUT /api/approval-flows |
| 操作日志查询 | API | GET /api/operation-logs |
| 飞书多维表格读写 | 插件 | feishu-bitable |

**所需 API**:
```typescript
// 获取所有同步配置 [领域模型: FeishuSyncConfigModel] [对应页面功能: 飞书同步配置]
GET /api/feishu-sync/configs
Response: {
  items: Array<{
    id: string;
    domain: string;
    baseToken: string;
    tableId: string;
    syncDirection: string;
    fieldMapping: Record<string, string>;
    uniqueKey: string;
    isEnabled: boolean;
    lastSyncTime: string;
    lastSyncStatus: string;
  }>;
}

// 更新同步配置 [领域模型: FeishuSyncConfigModel] [对应页面功能: 字段映射配置]
PUT /api/feishu-sync/configs/:domain
Body: {
  baseToken: string;
  tableId: string;
  syncDirection: string;
  fieldMapping: Record<string, string>;
  uniqueKey: string;
  isEnabled: boolean;
}
Response: { success: boolean }

// 同步日志 [领域模型: FeishuSyncLogModel] [对应页面功能: 同步日志查看]
GET /api/feishu-sync/logs?domain=&page=1&pageSize=20
Response: {
  items: Array<{
    id: string;
    domain: string;
    syncType: string;
    direction: string;
    status: string;
    recordCount: number;
    errorMessage: string;
    syncStartedAt: string;
    syncFinishedAt: string;
  }>;
  total: number;
}

// 手动触发同步 [领域模型: FeishuSyncConfigModel] [对应页面功能: 手动触发同步]
POST /api/feishu-sync/:domain/sync
Body: { direction: 'push' | 'pull' }
Response: { success: boolean; syncLogId: string }

// 获取审批流程配置 [领域模型: ApprovalFlowModel] [对应页面功能: 审批流程配置]
GET /api/approval-flows
Response: {
  items: Array<{
    id: string;
    flowType: string;
    flowName: string;
    nodeConfig: Array<{ nodeOrder: number; nodeName: string; approverType: string; approverIds: string[] }>;
    isActive: boolean;
  }>;
}

// 更新审批流程 [领域模型: ApprovalFlowModel] [对应页面功能: 编辑审批节点]
PUT /api/approval-flows/:id
Body: {
  flowName: string;
  nodeConfig: Array<{ nodeOrder: number; nodeName: string; approverType: string; approverIds: string[] }>;
  isActive: boolean;
}
Response: { success: boolean }

// 操作日志 [领域模型: OperationLogModel] [对应页面功能: 操作日志查看]
GET /api/operation-logs?page=1&pageSize=20&startDate=&endDate=&operator=&operationType=
Response: {
  items: Array<{
    id: string;
    operator: string;
    operationType: string;
    targetType: string;
    content: string;
    ipAddress: string;
    createdAt: string;
  }>;
  total: number;
}
```