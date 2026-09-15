# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [数据库, 服务端, 前端]

## 页面路由与导航

### 页面路由
| 页面 | 路径 |
|------|------|
| 供应商管理 | /suppliers |
| IT 报修工单 | /work-orders |
| 许可证管理 | /licenses |

### 导航设计
- 导航机制：页面路由（左侧 Sidebar 新增）
- 新增导航项（在现有8个菜单项后追加）：
  - 供应商管理（/suppliers）
  - IT 报修工单（/work-orders）
  - 许可证管理（/licenses）

## 数据模型

### 数据库设计

#### 供应商表（supplier）
用途：存储供应商基本信息，为资产采购、工单维修、许可证采购提供供应商数据源。
核心字段：
- name: varchar (供应商名称)
- contact_person: varchar (联系人)
- phone: varchar (联系电话)
- email: varchar (邮箱)
- address: varchar (地址)
- business_scope: varchar (主营品类，逗号分隔：硬件/软件/配件/维修服务/其他)
- remark: text (备注)

#### 报修工单表（work_order）
用途：存储 IT 报修工单，支持从提交到关闭的完整生命周期追踪。
核心字段：
- order_no: varchar (工单号，格式 GD-YYYYMMDD-XXXX，唯一)
- reporter: user_profile (报修人)
- contact_phone: varchar (联系电话)
- asset_id: uuid (关联资产ID，可选)
- asset_name: varchar (关联资产名称)
- problem_type: varchar ['hardware', 'software', 'network', 'account', 'peripheral', 'other'] (问题类型)
- urgency: varchar ['low', 'medium', 'high', 'urgent'] (紧急程度)
- description: text (问题描述)
- attachment_urls: text (附件URL，逗号分隔)
- status: varchar ['pending', 'processing', 'waiting_confirm', 'resolved', 'closed'] (处理状态)
- assignee: user_profile (处理人)
- solution: text (解决方案)
- resolved_at: timestamptz (解决时间)
- satisfaction: varchar ['satisfied', 'neutral', 'unsatisfied'] (满意度)
关联关系：可选关联固定资产表

#### 许可证表（license）
用途：存储软件许可证台账信息，管理授权数量与到期状态。
核心字段：
- name: varchar (许可证名称)
- software_type: varchar ['os', 'office', 'design', 'dev_tool', 'security', 'other'] (软件类型)
- license_key: varchar (许可证密钥)
- license_mode: varchar ['per_device', 'per_user', 'per_server', 'subscription'] (授权方式)
- total_seats: int (总座位数)
- purchase_date: date (采购日期)
- purchase_amount: numeric(12,2) (采购金额)
- expire_date: date (到期日期)
- supplier_id: uuid (供应商ID)
- remark: text (备注)

#### 许可证分配表（license_assignment）
用途：记录许可证座位的分配与回收，追踪每个座位的使用状态。
核心字段：
- license_id: uuid (许可证ID)
- assignee: user_profile (分配给)
- device_id: uuid (绑定设备ID，可选)
- assign_date: date (分配日期)
- assigner: user_profile (分配人)
- status: varchar ['active', 'revoked'] (状态：使用中/已回收)
关联关系：多对一关联许可证表，可选关联固定资产表

## 业务模型

### API 设计

#### 供应商管理相关
**页面路径**: /suppliers

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 供应商列表查询 | API | GET /api/suppliers |
| 供应商新增 | API | POST /api/suppliers |
| 供应商编辑 | API | PUT /api/suppliers/:id |
| 供应商删除 | API | DELETE /api/suppliers/:id |

**所需 API**:
```typescript
// 供应商列表查询 [领域模型: SupplierModel] [对应页面功能: 供应商列表展示与搜索]
GET /api/suppliers?keyword=&page=1&pageSize=20
Response: {
  items: Array<{
    id: string;
    name: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
    business_scope: string;
    remark: string;
  }>;
  total: number;
}

// 供应商新增 [领域模型: SupplierModel] [对应页面功能: 新增供应商]
POST /api/suppliers
Request: {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  business_scope?: string;
  remark?: string;
}
Response: { id: string; }

// 供应商编辑 [领域模型: SupplierModel] [对应页面功能: 编辑供应商]
PUT /api/suppliers/:id
Request: { name?: string; contact_person?: string; ... }
Response: { success: boolean; }

// 供应商删除 [领域模型: SupplierModel] [对应页面功能: 删除供应商]
DELETE /api/suppliers/:id
Response: { success: boolean; }
```

#### IT 报修工单相关
**页面路径**: /work-orders

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 工单列表查询 | API | GET /api/work-orders |
| 工单新增 | API | POST /api/work-orders |
| 工单详情 | API | GET /api/work-orders/:id |
| 工单处理 | API | PUT /api/work-orders/:id |
| 工单状态变更 | API | PATCH /api/work-orders/:id/status |
| 获取当前用户信息 | 平台能力 | 内置用户系统 |

**所需 API**:
```typescript
// 工单列表查询 [领域模型: WorkOrderModel] [对应页面功能: 工单列表展示与筛选]
GET /api/work-orders?status=&urgency=&problem_type=&keyword=&page=1&pageSize=20
Response: {
  items: Array<{
    id: string;
    order_no: string;
    reporter_name: string;
    problem_type: string;
    urgency: string;
    description: string;
    status: string;
    assignee_name: string;
    created_at: string;
  }>;
  total: number;
}

// 工单新增 [领域模型: WorkOrderModel] [对应页面功能: 提交报修工单]
POST /api/work-orders
Request: {
  contact_phone?: string;
  asset_id?: string;
  asset_name?: string;
  problem_type: string;
  urgency: string;
  description: string;
  attachment_urls?: string;
}
Response: { id: string; order_no: string; }

// 工单详情 [领域模型: WorkOrderModel] [对应页面功能: 工单详情查看]
GET /api/work-orders/:id
Response: {
  id: string;
  order_no: string;
  reporter: { user_id: string; name: string };
  contact_phone: string;
  asset_id: string;
  asset_name: string;
  problem_type: string;
  urgency: string;
  description: string;
  attachment_urls: string;
  status: string;
  assignee: { user_id: string; name: string };
  solution: string;
  resolved_at: string;
  satisfaction: string;
  created_at: string;
}

// 工单处理（填写解决方案） [领域模型: WorkOrderModel] [对应页面功能: 处理工单]
PUT /api/work-orders/:id
Request: {
  solution: string;
  assignee?: string;
}
Response: { success: boolean; }

// 工单状态变更 [领域模型: WorkOrderModel] [对应页面功能: 状态流转]
PATCH /api/work-orders/:id/status
Request: { status: string; satisfaction?: string; }
Response: { success: boolean; }
```

#### 许可证管理相关
**页面路径**: /licenses

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 许可证列表查询 | API | GET /api/licenses |
| 许可证新增 | API | POST /api/licenses |
| 许可证编辑 | API | PUT /api/licenses/:id |
| 许可证删除 | API | DELETE /api/licenses/:id |
| 许可证分配列表 | API | GET /api/licenses/:id/assignments |
| 分配座位 | API | POST /api/licenses/:id/assignments |
| 回收座位 | API | PATCH /api/license-assignments/:id/revoke |
| 获取当前用户信息 | 平台能力 | 内置用户系统 |

**所需 API**:
```typescript
// 许可证列表查询 [领域模型: LicenseModel] [对应页面功能: 许可证列表展示]
GET /api/licenses?keyword=&software_type=&page=1&pageSize=20
Response: {
  items: Array<{
    id: string;
    name: string;
    software_type: string;
    license_mode: string;
    total_seats: number;
    assigned_count: number;
    purchase_date: string;
    purchase_amount: number;
    expire_date: string;
    supplier_name: string;
    remark: string;
  }>;
  total: number;
}

// 许可证新增 [领域模型: LicenseModel] [对应页面功能: 新增许可证]
POST /api/licenses
Request: {
  name: string;
  software_type: string;
  license_key?: string;
  license_mode: string;
  total_seats: number;
  purchase_date?: string;
  purchase_amount?: number;
  expire_date: string;
  supplier_id?: string;
  remark?: string;
}
Response: { id: string; }

// 许可证编辑 [领域模型: LicenseModel] [对应页面功能: 编辑许可证]
PUT /api/licenses/:id
Request: { name?: string; ... }
Response: { success: boolean; }

// 许可证删除 [领域模型: LicenseModel] [对应页面功能: 删除许可证]
DELETE /api/licenses/:id
Response: { success: boolean; }

// 许可证分配记录列表 [领域模型: LicenseAssignmentModel] [对应页面功能: 查看座位分配]
GET /api/licenses/:id/assignments
Response: {
  items: Array<{
    id: string;
    assignee_name: string;
    device_name: string;
    assign_date: string;
    assigner_name: string;
    status: string;
  }>;
}

// 分配座位 [领域模型: LicenseAssignmentModel] [对应页面功能: 分配座位给用户]
POST /api/licenses/:id/assignments
Request: { assignee: string; device_id?: string; }
Response: { id: string; }

// 回收座位 [领域模型: LicenseAssignmentModel] [对应页面功能: 回收座位]
PATCH /api/license-assignments/:id/revoke
Response: { success: boolean; }
```