# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [插件, 服务端, 前端]
- 数据来源说明：业务数据全部存储于飞书多维表格（Base），应用不自建本地数据库；后端 API 通过 feishu-bitable 插件实例读写多维表格，前端为独立 UI，不嵌入多维表格页面。

## 页面路由与导航

### 页面路由
| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 数据仪表盘 | 默认首页，经营总览 |
| `/orders` | 订单管理 | 订单全生命周期管理 |
| `/inventory` | 库存管理 | 商品档案与出入库管理 |
| `/customers` | 客户管理 | 客户档案与消费画像 |

页面跳转关系：
- 仪表盘「待发货订单数」卡片 → `/orders?status=待发货`（订单管理页按待发货状态预筛选）
- 客户画像弹窗「查看他的订单」→ `/orders?customerId=xxx`（订单管理页按该客户预筛选）
- 订单管理、库存管理、客户管理均通过侧边栏导航互达

### 导航设计
- 导航机制：页面路由
- 导航项（左侧固定侧边栏）：
  - 数据仪表盘
  - 订单管理
  - 库存管理
  - 客户管理

## 数据模型

### 飞书多维表格设计
所有业务数据存储于同一个飞书多维表格（Base）中的 4 张数据表。**前置依赖**：需用户提供该 Base 的 appToken 与各数据表 tableID（或在插件配置页完成配置）；表结构按下方定义创建/对齐，并预置示例数据（商品 8~10 条、客户 5~6 条、订单 30 条以上且覆盖近 30 天、库存变动若干条），保证仪表盘与列表页有数据可渲染。

#### 订单表（order）
用途：存储订单全生命周期数据，是订单管理、客户画像、仪表盘统计的核心事实表。
核心字段（多维表格字段名 / bizType）：
- 订单号 / Text
- 客户ID / Text（客户表记录 ID，用于画像聚合与筛选跳转）
- 客户姓名 / Text（冗余存储，用于列表展示与客户名称筛选）
- 商品ID / Text
- 商品名称 / Text
- 数量 / Number
- 金额 / Number
- 下单时间 / DateTime
- 状态 / SingleSelect，enumValues：['待发货', '已发货', '已取消']
- 发货时间 / DateTime
- 备注 / Text

#### 商品表（product）
用途：存储商品档案、当前库存与预警阈值。
核心字段：
- 商品编号 / Text
- 商品名称 / Text
- 分类 / SingleSelect，enumValues：['大家电', '厨房电器', '生活电器', '个护数码']
- 单价 / Number
- 当前库存 / Number
- 预警阈值 / Number

#### 客户表（customer）
用途：存储客户档案。累计消费金额与累计订单数为派生数据，由订单表聚合计算，不落表。
核心字段：
- 客户姓名 / Text
- 手机号 / Text
- 收货地址 / Text

#### 库存变动表（stock_change）
用途：记录每次入库/出库流水，保证库存变动有据可查。
核心字段：
- 商品ID / Text
- 商品名称 / Text
- 变动类型 / SingleSelect，enumValues：['入库', '出库']
- 变动数量 / Number
- 变动时间 / DateTime
- 备注 / Text

读写格式约定：Text 写入 string、读取 `{ text }`；Number 读写均为 number；DateTime 写入/读取均为毫秒时间戳；SingleSelect 必须严格匹配 enumValues。

## 插件设计

| 插件名称 | 基础插件 | 用途 | 调用方式 | 关联页面 | 输入参数 | 输出类型 |
|---------|---------|------|---------|---------|---------|---------|
| bitable_order | feishu-bitable | 订单表 CRUD 与聚合统计 | 服务端 CapabilityService | 订单管理、数据仪表盘、客户管理 | searchRecords / getRecord / batchAddRecords / batchUpdateRecords / aggregateQuery 各 action 入参 | 视 action 而定（records 列表 / 聚合结果 result） |
| bitable_product | feishu-bitable | 商品表读写与预警统计 | 服务端 CapabilityService | 库存管理、数据仪表盘 | searchRecords / getRecord / batchUpdateRecords 各 action 入参 | 视 action 而定 |
| bitable_customer | feishu-bitable | 客户表 CRUD | 服务端 CapabilityService | 客户管理 | searchRecords / batchAddRecords / batchUpdateRecords 各 action 入参 | 视 action 而定 |
| bitable_stock_change | feishu-bitable | 库存变动流水写入与查询 | 服务端 CapabilityService | 库存管理 | searchRecords / batchAddRecords 各 action 入参 | 视 action 而定 |

插件设计说明：
- 每张数据表对应一个独立的 feishu-bitable 插件实例（实例配置绑定各自的 tableID），共 4 个实例；实例必须通过 `plugin_instance` 工具创建，禁止手改配置文件。
- 调用方式选择服务端（CapabilityService）而非前端直调：后端 API 是统一数据读写出口，且涉及库存事务校验（出库量与当前库存比对）、订单-客户跨表聚合、仪表盘统计编排。
- 实例的 appToken / tableID 由用户在插件配置页提供；若配置缺失，接口返回明确错误信息并引导用户完成配置，禁止 mock 插件返回值。
- 生成调用代码前必须先调 `get_plugin_ai_json` 获取运行时投影，入参出参严格按 Schema 摘录卡构造。

## 业务模型

### API 设计
后端 API（NestJS）统一封装对多维表格的读写：列表查询走 searchRecords（游标分页、filter 筛选、sort 排序）；统计走 aggregateQuery（禁止全量拉取后内存计算）；排行榜走 searchRecords + sort + pageSize。所有 API 返回结构与多维表格字段格式解耦，由服务端完成字段映射与格式转换。

#### 数据仪表盘 相关
**页面路径**: /
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 统计卡片（本月订单数/待发货数/本月销售额/预警商品数） | API | GET /api/dashboard/summary |
| 近30天订单量与销售额趋势折线图 | API | GET /api/dashboard/trend |
| 订单状态分布环形图 | API | GET /api/dashboard/order-status-distribution |
| 商品销量排行柱状图 | API | GET /api/dashboard/product-sales-rank |
| 待发货卡片跳转订单筛选 | 前端路由 | 跳转 /orders?status=待发货 |

**所需 API**:
```typescript
// 仪表盘统计卡片汇总 [领域模型: DashboardSummary] [对应页面功能: 统计卡片区]
// 本月订单数/本月销售额口径：下单时间在本月且状态≠已取消；预警商品数：当前库存低于预警阈值的商品数量
GET /api/dashboard/summary
Response: {
  monthOrderCount: number;        // 本月订单数
  pendingShipmentCount: number;   // 待发货订单数（全量）
  monthSalesAmount: number;       // 本月销售额
  warningProductCount: number;    // 库存预警商品数
}

// 近30天订单量与销售额趋势（按天聚合） [领域模型: TrendPoint] [对应页面功能: 趋势图表区]
GET /api/dashboard/trend?days=30
Response: {
  items: Array<{
    date: string;          // 日期，格式 YYYY-MM-DD
    orderCount: number;    // 当日订单量
    salesAmount: number;   // 当日销售额
  }>;
}

// 订单状态分布 [领域模型: StatusDistribution] [对应页面功能: 分布图表区-环形图]
GET /api/dashboard/order-status-distribution
Response: { items: Array<{ status: string; count: number }> }

// 商品销量排行 TOP N [领域模型: SalesRankItem] [对应页面功能: 分布图表区-柱状图]
GET /api/dashboard/product-sales-rank?limit=10
Response: { items: Array<{ productName: string; salesCount: number }> }
```

#### 订单管理 相关
**页面路径**: /orders
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 订单列表（筛选/排序/分页） | API | GET /api/orders |
| 新增订单 | API | POST /api/orders |
| 编辑订单 | API | PUT /api/orders/:id |
| 订单发货 | API | POST /api/orders/:id/ship |
| 订单取消（含二次确认） | API | POST /api/orders/:id/cancel |
| 客户下拉选择 | API | GET /api/customers（复用客户模块） |
| 商品下拉选择 | API | GET /api/products（复用库存模块） |

**所需 API**:
```typescript
// 订单列表查询，按下单时间倒序 [领域模型: Order] [对应页面功能: 筛选区 + 订单列表区]
GET /api/orders?status=&customerName=&dateStart=&dateEnd=&pageSize=20&pageToken=
Response: {
  items: Array<{
    id: string;            // 多维表格记录 ID
    orderNo: string;       // 订单号
    customerId: string;
    customerName: string;
    productId: string;
    productName: string;
    quantity: number;      // 数量
    amount: number;        // 金额
    orderTime: string;     // 下单时间 ISO 字符串
    status: '待发货' | '已发货' | '已取消';
    shipTime?: string;     // 发货时间
    remark?: string;       // 备注
  }>;
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

// 新增订单（必填：客户、商品、数量、金额） [领域模型: Order] [对应页面功能: 订单表单弹窗-新增]
POST /api/orders
Body: {
  customerId: string; customerName: string;
  productId: string; productName: string;
  quantity: number; amount: number; remark?: string;
}
Response: { id: string }

// 编辑订单（回填后全量提交变更字段） [领域模型: Order] [对应页面功能: 订单表单弹窗-编辑]
PUT /api/orders/:id
Body: 同新增 Body（customerId/customerName/productId/productName/quantity/amount/remark）
Response: { success: boolean }

// 订单发货：状态→已发货并记录发货时间（仅待发货状态可发货） [领域模型: Order] [对应页面功能: 行操作-发货]
POST /api/orders/:id/ship
Response: { success: boolean }

// 订单取消：状态→已取消（仅待发货状态可取消） [领域模型: Order] [对应页面功能: 行操作-取消]
POST /api/orders/:id/cancel
Response: { success: boolean }
```

#### 库存管理 相关
**页面路径**: /inventory
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 商品列表（关键字/分类筛选） | API | GET /api/products |
| 库存预警汇总与「仅看预警」筛选 | API | GET /api/products?warningOnly=true |
| 维护商品信息/预警阈值 | API | PUT /api/products/:id |
| 入库/出库登记（含库存校验与流水落表） | API | POST /api/products/:id/stock-changes |
| 库存变动流水查询 | API | GET /api/stock-changes |

**所需 API**:
```typescript
// 商品列表查询 [领域模型: Product] [对应页面功能: 预警汇总条 + 商品列表区]
// warningOnly=true 时仅返回当前库存低于预警阈值的商品
GET /api/products?keyword=&category=&warningOnly=false
Response: {
  items: Array<{
    id: string;              // 多维表格记录 ID
    productNo: string;       // 商品编号
    productName: string;     // 商品名称
    category: string;        // 分类
    price: number;           // 单价
    stock: number;           // 当前库存
    warningThreshold: number;// 预警阈值
  }>;
  total: number;
}

// 维护商品信息（商品名称/分类/单价/预警阈值/商品编号） [领域模型: Product] [对应页面功能: 预警阈值维护]
PUT /api/products/:id
Body: { productNo: string; productName: string; category: string; price: number; warningThreshold: number }
Response: { success: boolean }

// 入库/出库登记：服务端先校验（数量为正整数；出库不得超过当前库存），再更新商品表库存并写入库存变动表流水 [领域模型: StockChange] [对应页面功能: 行操作-入库/出库弹窗]
POST /api/products/:id/stock-changes
Body: { changeType: 'in' | 'out'; quantity: number; remark?: string }
Response: { success: boolean; currentStock: number }  // currentStock 为变更后的最新库存

// 库存变动流水查询（按变动时间倒序） [领域模型: StockChange] [对应页面功能: 出入库有据可查]
GET /api/stock-changes?productId=&pageSize=20
Response: {
  items: Array<{
    id: string; productId: string; productName: string;
    changeType: '入库' | '出库';
    quantity: number;
    changeTime: string;
    remark?: string;
  }>;
  total: number;
}
```

#### 客户管理 相关
**页面路径**: /customers
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 客户列表（姓名/手机号搜索） | API | GET /api/customers |
| 新建客户 | API | POST /api/customers |
| 编辑客户档案 | API | PUT /api/customers/:id |
| 客户消费画像（聚合统计+常购商品+最近订单） | API | GET /api/customers/:id/profile |
| 画像弹窗跳转该客户订单 | 前端路由 | 跳转 /orders?customerId=xxx |

**所需 API**:
```typescript
// 客户列表查询（keyword 模糊匹配姓名或手机号）；items 内消费统计字段由订单表聚合计算 [领域模型: Customer] [对应页面功能: 搜索与操作区 + 客户列表区]
GET /api/customers?keyword=
Response: {
  items: Array<{
    id: string;             // 多维表格记录 ID
    customerName: string;   // 客户姓名
    phone: string;          // 手机号
    address: string;        // 收货地址
    totalAmount: number;    // 累计消费金额（状态≠已取消订单金额合计）
    orderCount: number;     // 累计订单数
  }>;
  total: number;
}

// 新建客户 [领域模型: Customer] [对应页面功能: 客户档案表单弹窗-新建]
POST /api/customers
Body: { customerName: string; phone: string; address: string }
Response: { id: string }

// 编辑客户档案 [领域模型: Customer] [对应页面功能: 客户档案表单弹窗-编辑]
PUT /api/customers/:id
Body: { customerName: string; phone: string; address: string }
Response: { success: boolean }

// 客户消费画像：服务端基于订单表 aggregateQuery 汇总（按客户ID过滤，状态≠已取消），常购商品排行取销量 TOP5，最近订单取最近 5 条 [领域模型: CustomerProfile] [对应页面功能: 消费画像详情弹窗]
GET /api/customers/:id/profile
Response: {
  customerId: string;
  customerName: string;
  totalAmount: number;      // 累计消费金额
  orderCount: number;       // 累计订单数
  avgOrderAmount: number;   // 客单价 = totalAmount / orderCount
  lastOrderTime?: string;   // 最近下单时间
  topProducts: Array<{ productName: string; quantity: number }>;  // 常购商品排行
  recentOrders: Array<{     // 最近订单列表
    id: string; orderNo: string; productName: string;
    quantity: number; amount: number; orderTime: string; status: string;
  }>;
}
```
