# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [数据库, 插件, 服务端, 前端]

## 页面路由与导航

### 页面路由
- `/` → 库存看板（首页）
- `/operations` → 库存操作
- `/ai-tools` → AI工具
- `/records` → 记录管理
- `/product/add` → 新增商品

### 导航设计
- 导航机制：页面路由
- 导航项：
  - 库存看板
  - 库存操作
  - AI工具
  - 记录管理

## 业务组件

| 组件 | 来源 | 关联页面 | 对应功能点 |
|------|------|---------|-----------|
| Card | shadcn/ui | 库存看板 | KPI概览卡片 |
| Tabs | shadcn/ui | 库存操作、AI工具 | 标签页切换 |
| Select | shadcn/ui | 全局 | 下拉筛选与表单选择 |
| Table | shadcn/ui | 全局 | 数据表格展示 |
| Dialog | shadcn/ui | 库存操作 | 告警弹窗 |
| Badge | shadcn/ui | 全局 | 状态标签 |
| Input | shadcn/ui | 全局 | 表单输入 |
| Button | shadcn/ui | 全局 | 操作按钮 |

## 数据模型

### 数据库设计

#### 商品表（product）
用途：存储商品基础信息，作为库存管理的核心实体。
核心字段：
- code: varchar (商品编码，唯一)
- name: varchar (商品名称)
- category: varchar (品类：电子产品/服装鞋帽/食品饮料/家居用品/美妆个护/母婴用品)
- brand: varchar (品牌，选填)
- specification: varchar (规格型号，选填)
- unit: varchar (单位：件/个/箱/套/瓶/盒)
- safety_stock: integer (安全库存阈值)
- reference_price: decimal (参考单价)
- status: varchar (状态：normal/warning/shortage/delisted，默认 normal)
关联关系：与库存表是一对多关系（一个商品在多个仓库有库存）

#### 仓库表（warehouse）
用途：预置仓库基础信息，系统固定四个仓库。
核心字段：
- name: varchar (仓库名称：上海仓/北京仓/广州仓/成都仓)
- location: varchar (所在城市)
关联关系：与库存表是一对多关系

#### 库存表（inventory）
用途：记录每个商品在每个仓库的实时库存数量。
核心字段：
- product_id: integer (关联商品表)
- warehouse_id: integer (关联仓库表)
- quantity: integer (当前库存数量)
关联关系：与商品表多对一，与仓库表多对一

#### 出入库记录表（stock_record）
用途：记录每次入库和出库操作的详细信息。
核心字段：
- product_id: integer (关联商品表)
- warehouse_id: integer (关联仓库表)
- type: varchar (类型：in/out)
- subtype: varchar (子类型：purchase/sales/transfer/return/scrap)
- quantity: integer (数量)
- unit_price: decimal (单价，入库时填写)
- amount: decimal (金额)
- order_no: varchar (单据编号)
- operator: varchar (操作人)
- record_date: date (操作日期)
- remark: text (备注)
关联关系：与商品表多对一，与仓库表多对一

#### 调拨记录表（transfer_record）
用途：记录仓库间商品调拨操作。
核心字段：
- product_id: integer (关联商品表)
- source_warehouse_id: integer (源仓库)
- target_warehouse_id: integer (目标仓库)
- quantity: integer (调拨数量)
- transfer_date: date (调拨日期)
- remark: text (备注)
关联关系：与商品表多对一，与源/目标仓库表多对一

#### 盘点记录表（stock_check）
用途：记录库存盘点结果。
核心字段：
- product_id: integer (关联商品表)
- warehouse_id: integer (关联仓库表)
- system_quantity: integer (系统库存)
- actual_quantity: integer (实盘数量)
- difference: integer (差异)
- location_code: varchar (库位编码)
- remark: text (备注)
- check_date: date (盘点日期)
关联关系：与商品表多对一，与仓库表多对一

## 插件设计

| 插件名称 | 基础插件 | 用途 | 调用方式 | 关联页面 | 输入参数 | 输出类型 |
|---------|---------|------|---------|---------|---------|---------|
| ai-replenishment | ai-text-generate | 根据库存数据生成智能补货建议 | 前端 capabilityClient | AI工具 | 商品库存信息文本 | stream\<string\> |
| ai-nl-query | ai-text-generate | 解析自然语言查询为结构化库存筛选条件 | 前端 capabilityClient | AI工具 | 用户自然语言查询文本 | stream\<string\> |
| ai-sales-forecast | ai-text-generate | 基于历史数据生成销售预测分析 | 前端 capabilityClient | AI工具 | 商品销售历史数据文本 | stream\<string\> |
| ai-health-score | ai-text-generate | 评估商品库存健康度并给出评分与建议 | 前端 capabilityClient | AI工具 | 商品库存与周转数据文本 | stream\<string\> |
| ai-transfer-advice | ai-text-generate | 分析各仓库库存分布生成最优调拨方案 | 前端 capabilityClient | AI工具 | 各仓库库存分布数据文本 | stream\<string\> |
| ai-anomaly-detect | ai-text-generate | 检测库存异动、出库异常、积压等问题 | 前端 capabilityClient | AI工具 | 库存变动数据文本 | stream\<string\> |

## 业务模型

### API 设计

#### 库存看板 相关
**页面路径**: /
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 获取KPI统计概览 | API | GET /api/dashboard/stats |
| 获取预警商品列表 | API | GET /api/dashboard/alerts |
| 获取商品库存列表（含筛选分页） | API | GET /api/products |
| 获取仓库库存分布 | API | GET /api/dashboard/warehouse-distribution |
| 获取品类库存周转率 | API | GET /api/dashboard/turnover |
| 获取近7天出入库趋势 | API | GET /api/dashboard/trend |
| 获取库存金额分布 | API | GET /api/dashboard/amount-distribution |
| 获取库存金额TOP10 | API | GET /api/dashboard/top-amount |
| 导出CSV | API | GET /api/products/export |

**所需 API**:
```typescript
// 获取KPI统计概览 [领域模型: Product/Inventory] [对应页面功能: KPI概览卡片]
GET /api/dashboard/stats
Response: { totalSku: number; totalQuantity: number; totalAmount: number; alertCount: number; }

// 获取预警商品列表 [领域模型: Product/Inventory] [对应页面功能: 预警横幅/预警清单]
GET /api/dashboard/alerts
Response: { items: Array<{ id: string; name: string; currentStock: number; safetyStock: number; gap: number; }>; }

// 获取商品库存列表（含筛选分页） [领域模型: Product/Inventory] [对应页面功能: 商品库存数据表格]
GET /api/products?category=&status=&keyword=&page=1&pageSize=20
Response: { items: Array<{ id: string; code: string; name: string; category: string; warehouseStocks: Record<string, number>; totalStock: number; safetyStock: number; status: string; amount: number; }>; total: number; }

// 获取仓库库存分布 [领域模型: Inventory/Warehouse] [对应页面功能: 仓库库存分布柱状图]
GET /api/dashboard/warehouse-distribution
Response: { items: Array<{ warehouse: string; quantity: number; }>; }

// 获取品类库存周转率 [领域模型: Product/Inventory] [对应页面功能: 品类库存周转率柱状图]
GET /api/dashboard/turnover
Response: { items: Array<{ category: string; turnoverDays: number; }>; }

// 获取近7天出入库趋势 [领域模型: StockRecord] [对应页面功能: 近7天出入库趋势折线图]
GET /api/dashboard/trend
Response: { items: Array<{ date: string; inQuantity: number; outQuantity: number; }>; }

// 获取库存金额分布 [领域模型: Product/Inventory] [对应页面功能: 库存金额分布饼图]
GET /api/dashboard/amount-distribution
Response: { items: Array<{ category: string; amount: number; }>; }

// 获取库存金额TOP10 [领域模型: Product/Inventory] [对应页面功能: 库存金额TOP10表格]
GET /api/dashboard/top-amount
Response: { items: Array<{ name: string; category: string; quantity: number; unitPrice: number; amount: number; }>; }

// 导出商品CSV [领域模型: Product/Inventory] [对应页面功能: 导出CSV]
GET /api/products/export?category=&status=&keyword=
Response: CSV file stream
```

#### 库存操作 相关
**页面路径**: /operations
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 获取商品下拉列表 | API | GET /api/products（复用看板接口） |
| 获取仓库下拉列表 | API | GET /api/warehouses |
| 获取商品在指定仓库的库存 | API | GET /api/inventory |
| 提交入库操作 | API | POST /api/stock-records/in |
| 提交出库操作 | API | POST /api/stock-records/out |
| 提交调拨操作 | API | POST /api/transfer-records |

**所需 API**:
```typescript
// 获取仓库列表 [领域模型: Warehouse] [对应页面功能: 仓库下拉选择]
GET /api/warehouses
Response: { items: Array<{ id: string; name: string; location: string; }>; }

// 获取商品在指定仓库的库存 [领域模型: Inventory] [对应页面功能: 可用库存展示]
GET /api/inventory?productId=&warehouseId=
Response: { quantity: number; safetyStock: number; }

// 提交入库 [领域模型: StockRecord/Inventory] [对应页面功能: 入库表单提交]
POST /api/stock-records/in
Request: { productId: string; warehouseId: string; quantity: number; unitPrice: number; supplier?: string; recordDate: string; orderNo: string; remark?: string; }
Response: { success: boolean; }

// 提交出库 [领域模型: StockRecord/Inventory] [对应页面功能: 出库表单提交]
POST /api/stock-records/out
Request: { productId: string; warehouseId: string; quantity: number; subtype: string; orderNo: string; recordDate: string; operator: string; remark?: string; }
Response: { success: boolean; }

// 提交调拨 [领域模型: TransferRecord/Inventory] [对应页面功能: 调拨表单提交]
POST /api/transfer-records
Request: { productId: string; sourceWarehouseId: string; targetWarehouseId: string; quantity: number; transferDate: string; remark?: string; }
Response: { success: boolean; }
```

#### AI工具 相关
**页面路径**: /ai-tools
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| AI智能补货建议 | 插件 | ai-replenishment |
| 自然语言查询库存 | 插件 | ai-nl-query |
| AI销售预测 | 插件 | ai-sales-forecast |
| AI库存健康度评分 | 插件 | ai-health-score |
| AI智能调拨建议 | 插件 | ai-transfer-advice |
| AI异常检测 | 插件 | ai-anomaly-detect |
| 获取商品库存数据（供AI分析） | API | GET /api/products（复用） |
| 获取仓库库存分布（供AI分析） | API | GET /api/dashboard/warehouse-distribution（复用） |

#### 记录管理 相关
**页面路径**: /records
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 获取出入库记录列表 | API | GET /api/stock-records |
| 导出出入库记录 | API | GET /api/stock-records/export |
| 创建盘点单 | API | POST /api/stock-checks |
| 提交盘点结果 | API | PUT /api/stock-checks/:id |
| 获取调拨记录列表 | API | GET /api/transfer-records |

**所需 API**:
```typescript
// 获取出入库记录列表 [领域模型: StockRecord] [对应页面功能: 出入库记录表格]
GET /api/stock-records?type=&page=1&pageSize=20
Response: { items: Array<{ id: string; type: string; productName: string; warehouseName: string; quantity: number; amount: number; subtype: string; recordDate: string; operator: string; }>; total: number; }

// 导出出入库记录 [领域模型: StockRecord] [对应页面功能: 导出按钮]
GET /api/stock-records/export?type=
Response: CSV file stream

// 创建盘点单 [领域模型: StockCheck/Inventory] [对应页面功能: 库存盘点]
POST /api/stock-checks
Request: { warehouseId: string; }
Response: { id: string; items: Array<{ productId: string; productCode: string; productName: string; locationCode: string; systemQuantity: number; }>; }

// 提交盘点结果 [领域模型: StockCheck/Inventory] [对应页面功能: 库存盘点提交]
PUT /api/stock-checks/:id
Request: { items: Array<{ productId: string; actualQuantity: number; remark?: string; }>; }
Response: { success: boolean; }

// 获取调拨记录列表 [领域模型: TransferRecord] [对应页面功能: 最近调拨记录]
GET /api/transfer-records?page=1&pageSize=20
Response: { items: Array<{ id: string; productName: string; sourceWarehouse: string; targetWarehouse: string; quantity: number; transferDate: string; }>; total: number; }
```

#### 新增商品 相关
**页面路径**: /product/add
**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 新增商品 | API | POST /api/products |

**所需 API**:
```typescript
// 新增商品 [领域模型: Product/Inventory] [对应页面功能: 商品信息表单保存]
POST /api/products
Request: { code: string; name: string; category: string; brand?: string; specification?: string; unit: string; safetyStock: number; referencePrice: number; }
Response: { success: boolean; id: string; }
```
