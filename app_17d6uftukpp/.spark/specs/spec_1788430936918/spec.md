# 需求分析

## 用户故事

1. 工作台总览：查看全公司经营关键指标与待办任务
  - 1.1 用户进入工作台能看到客户总数、进行中广告/视频项目数、本月合同额、本月收支、待办任务数等 KPI 指标卡
  - 1.2 KPI 数据来自飞书多维表格实时查询后程序内统计，非硬编码
  - 1.3 展示近期合同金额趋势折线图与广告/视频项目状态分布环形图
  - 1.4 待办任务列表展示 TOP 5 未完成任务，点击可跳转任务详情
  - 1.5 提供快捷入口卡片（新建客户/新建合同/新建任务），一键跳转对应表单页

2. 客户管理：浏览、检索、管理客户信息
  - 2.1 用户能够查看客户列表，按客户等级筛选并看到对应结果
  - 2.2 列表展示客户名称、行业、联系人、电话、客户等级、跟进状态、所属销售
  - 2.3 点击行可查看客户详情，操作列可编辑客户信息
  - 2.4 工具栏「新建客户」按钮跳转表单页，填写客户名称/行业/联系人/电话/客户等级/跟进状态/所属销售后提交

3. 广告业务管理：管理广告项目全生命周期
  - 3.1 用户能够查看广告项目列表，按项目状态筛选
  - 3.2 列表展示项目编号、关联客户、广告类型、投放渠道、预算金额、排期、项目状态
  - 3.3 支持新建广告项目（填写项目编号/客户/广告类型/投放渠道/预算/排期/状态）
  - 3.4 点击行查看详情，操作列可编辑项目信息

4. 视频业务管理：管理视频制作项目
  - 4.1 用户能够查看视频项目列表，按交付状态筛选
  - 4.2 列表展示项目编号、关联客户、视频类型、导演、制作周期、预算、交付状态
  - 4.3 支持新建视频项目，编辑已有项目信息

5. 合同业务管理：管理合同全生命周期
  - 5.1 用户能够查看合同列表，按状态 Tab（草稿/审批中/生效/到期）切换筛选
  - 5.2 列表展示合同编号、关联客户、合同金额、签订日期、到期日期、合同状态
  - 5.3 支持新建合同、编辑合同信息

6. 财务管理：管理收支记录
  - 6.1 用户能够查看财务收支列表，列表页顶部展示本页收入/支出/净额汇总
  - 6.2 列表展示单据编号、类型（收入/支出）、关联合同、金额、收支日期、经手人、凭证说明
  - 6.3 支持新建收支记录、编辑已有记录

7. 人资管理：管理员工档案
  - 7.1 用户能够查看员工列表，列表展示姓名、部门、岗位、入职日期、在职状态、联系方式
  - 7.2 支持新建员工档案、编辑员工信息

8. 行政管理：管理行政资产与事项
  - 8.1 用户能够查看行政资产/事项列表，列表展示名称、类别、负责人、日期、状态
  - 8.2 支持新建资产/事项登记、编辑已有记录

9. 任务中心：管理任务流转
  - 9.1 用户能够查看任务列表，按状态 Tab + 优先级筛选
  - 9.2 列表展示任务标题、负责人、优先级、截止日期、关联模块、任务状态
  - 9.3 行内可快捷「标记完成」任务
  - 9.4 支持新建任务、编辑任务信息

10. 系统管理：管理用户账号
  - 10.1 用户能够查看系统用户列表，列表展示用户姓名、角色、账号状态、所属部门
  - 10.2 行操作支持「启用/禁用」切换账号状态，操作后弹确认并更新
  - 10.3 支持新建用户、编辑用户信息

11. 业务支持：管理工单流转
  - 11.1 用户能够查看工单列表，列表展示工单编号、提交人、问题类型、问题描述、处理人、处理状态
  - 11.2 行操作支持「受理/关闭」状态流转
  - 11.3 支持新建工单、编辑工单信息

## 页面列表

### 工作台
1. 页面加载时查询飞书多维表格多张业务表，统计并渲染 KPI 指标卡（客户总数、进行中广告/视频项目数、本月合同额、本月收支、待办任务数）
2. 近期合同金额趋势折线图与广告/视频项目状态分布环形图，数据来自插件查询
3. 待办任务 TOP 5 列表，点击跳转任务详情页
4. 快捷入口卡片区（新建客户/新建合同/新建任务），点击跳转对应表单页
5. 加载中显示骨架屏，查询失败显示错误提示与重试按钮，数据为空时指标卡显示「--」

### 客户列表页
1. 工具栏：搜索框（按客户名称过滤）、客户等级筛选下拉、新建客户按钮
2. 数据表格：客户名称、行业、联系人、电话、客户等级 Badge、跟进状态、所属销售、操作列（查看/编辑）
3. 行点击跳转详情页，操作列编辑跳转表单页
4. 空状态显示引导「暂无客户数据，点击新建客户开始」

### 客户详情页
1. 主信息卡展示全部客户字段（名称、行业、联系人、电话、等级、跟进状态、所属销售）
2. 侧卡展示元信息（创建时间、负责人等）
3. 顶部操作栏：编辑按钮（跳转编辑表单）、返回按钮（回列表）

### 客户表单页
1. 表单字段：客户名称（必填）、行业、联系人、电话、客户等级（下拉选择）、跟进状态、所属销售
2. 编辑模式下预填原记录数据
3. 提交后调插件创建/更新记录，成功 toast 并返回列表，失败 toast 错误信息
4. 取消按钮返回列表，不产生数据变更

### 广告业务列表页
1. 工具栏：搜索框（按项目编号/客户名称过滤）、状态筛选下拉、新建广告项目按钮
2. 数据表格：项目编号、关联客户、广告类型、投放渠道、预算金额、排期、项目状态 Badge、操作列
3. 行点击跳转详情页，操作列编辑跳转表单页

### 广告业务详情页
1. 主信息卡展示全部字段（项目编号、客户、广告类型、投放渠道、预算、排期、状态）
2. 侧卡展示元信息
3. 顶部编辑按钮与返回按钮

### 广告业务表单页
1. 表单字段：项目编号（必填）、关联客户（下拉选择，数据来自客户表缓存）、广告类型、投放渠道、预算金额、排期起止、项目状态
2. 编辑预填、提交反馈、取消返回

### 视频业务列表页
1. 工具栏：搜索框、交付状态筛选、新建按钮
2. 数据表格：项目编号、关联客户、视频类型、导演、制作周期、预算、交付状态 Badge、操作列

### 视频业务详情页
1. 主信息卡展示全部字段，侧卡元信息，顶部编辑/返回按钮

### 视频业务表单页
1. 表单字段：项目编号（必填）、关联客户、视频类型、导演、制作周期、预算、交付状态

### 合同列表页
1. 工具栏：搜索框、状态 Tab 切换（全部/草稿/审批中/生效/到期）、新建合同按钮
2. 数据表格：合同编号、关联客户、合同金额、签订日期、到期日期、合同状态 Badge、操作列

### 合同详情页
1. 主信息卡展示全部字段，侧卡元信息，顶部编辑/返回按钮

### 合同表单页
1. 表单字段：合同编号（必填）、关联客户、合同金额、签订日期、到期日期、合同状态

### 财务列表页
1. 顶部汇总栏：收入合计、支出合计、净额（前端计算已加载数据）
2. 工具栏：搜索框、类型筛选、新建按钮
3. 数据表格：单据编号、类型（收入/支出 Badge）、关联合同、金额、收支日期、经手人、凭证说明、操作列

### 财务详情页
1. 主信息卡展示全部字段，侧卡元信息，顶部编辑/返回按钮

### 财务表单页
1. 表单字段：单据编号（必填）、类型（收入/支出）、关联合同、金额、收支日期、经手人、凭证说明

### 人资列表页
1. 工具栏：搜索框、在职状态筛选、新建员工按钮
2. 数据表格：姓名、部门、岗位、入职日期、在职状态 Badge、联系方式、操作列

### 人资详情页
1. 主信息卡展示全部字段，侧卡元信息，顶部编辑/返回按钮

### 人资表单页
1. 表单字段：姓名（必填）、部门、岗位、入职日期、在职状态、联系方式

### 行政列表页
1. 工具栏：搜索框、类别筛选、新建按钮
2. 数据表格：名称、类别、负责人、日期、状态 Badge、操作列

### 行政详情页
1. 主信息卡展示全部字段，侧卡元信息，顶部编辑/返回按钮

### 行政表单页
1. 表单字段：名称（必填）、类别、负责人、日期、状态

### 任务中心列表页
1. 工具栏：搜索框、状态 Tab（待处理/进行中/已完成）+ 优先级筛选、新建任务按钮
2. 数据表格：任务标题、负责人、优先级 Badge、截止日期、关联模块、状态 Badge、操作列（编辑/标记完成）
3. 行内「标记完成」按钮点击后弹确认，确认后调插件更新状态

### 任务详情页
1. 主信息卡展示全部字段，侧卡元信息，顶部编辑/返回按钮

### 任务表单页
1. 表单字段：任务标题（必填）、负责人、优先级、截止日期、关联模块、任务状态

### 系统管理列表页
1. 工具栏：搜索框、角色筛选、新建用户按钮
2. 数据表格：用户姓名、角色 Badge、账号状态 Badge、所属部门、操作列（编辑/启用/禁用）
3. 行内「启用/禁用」按钮点击后弹确认，确认后调插件更新账号状态

### 系统管理详情页
1. 主信息卡展示全部字段，侧卡元信息，顶部编辑/返回按钮

### 系统管理表单页
1. 表单字段：用户姓名（必填）、角色、所属部门、账号状态

### 业务支持列表页
1. 工具栏：搜索框、处理状态筛选、新建工单按钮
2. 数据表格：工单编号、提交人、问题类型、问题描述、处理人、处理状态 Badge、操作列（编辑/受理/关闭）
3. 行内「受理/关闭」按钮点击后调插件更新状态

### 业务支持详情页
1. 主信息卡展示全部字段，侧卡元信息，顶部编辑/返回按钮

### 业务支持表单页
1. 表单字段：工单编号（必填）、提交人、问题类型、问题描述、处理人、处理状态

# 技术方案

## 开发元信息
- 开发模式: 全栈应用
- 涉及层级: [插件, 前端]

## 页面路由与导航

### 页面路由

| 路由 | 页面组件 | 说明 |
|------|---------|------|
| `/` | WorkbenchPage | 工作台首页 |
| `/customers` | CustomerListPage | 客户列表 |
| `/customers/:id` | CustomerDetailPage | 客户详情 |
| `/customers/new` | CustomerFormPage | 新建客户 |
| `/customers/:id/edit` | CustomerFormPage | 编辑客户 |
| `/ads` | AdProjectListPage | 广告业务列表 |
| `/ads/:id` | AdProjectDetailPage | 广告业务详情 |
| `/ads/new` | AdProjectFormPage | 新建广告项目 |
| `/ads/:id/edit` | AdProjectFormPage | 编辑广告项目 |
| `/videos` | VideoProjectListPage | 视频业务列表 |
| `/videos/:id` | VideoProjectDetailPage | 视频业务详情 |
| `/videos/new` | VideoProjectFormPage | 新建视频项目 |
| `/videos/:id/edit` | VideoProjectFormPage | 编辑视频项目 |
| `/contracts` | ContractListPage | 合同列表 |
| `/contracts/:id` | ContractDetailPage | 合同详情 |
| `/contracts/new` | ContractFormPage | 新建合同 |
| `/contracts/:id/edit` | ContractFormPage | 编辑合同 |
| `/finance` | FinanceListPage | 财务列表 |
| `/finance/:id` | FinanceDetailPage | 财务详情 |
| `/finance/new` | FinanceFormPage | 新建收支记录 |
| `/finance/:id/edit` | FinanceFormPage | 编辑收支记录 |
| `/hr` | HrListPage | 人资列表 |
| `/hr/:id` | HrDetailPage | 人资详情 |
| `/hr/new` | HrFormPage | 新建员工档案 |
| `/hr/:id/edit` | HrFormPage | 编辑员工档案 |
| `/admin` | AdminListPage | 行政列表 |
| `/admin/:id` | AdminDetailPage | 行政详情 |
| `/admin/new` | AdminFormPage | 新建资产/事项 |
| `/admin/:id/edit` | AdminFormPage | 编辑资产/事项 |
| `/tasks` | TaskListPage | 任务中心列表 |
| `/tasks/:id` | TaskDetailPage | 任务详情 |
| `/tasks/new` | TaskFormPage | 新建任务 |
| `/tasks/:id/edit` | TaskFormPage | 编辑任务 |
| `/system` | SystemListPage | 系统管理列表 |
| `/system/:id` | SystemDetailPage | 系统管理详情 |
| `/system/new` | SystemFormPage | 新建用户 |
| `/system/:id/edit` | SystemFormPage | 编辑用户 |
| `/support` | SupportListPage | 业务支持列表 |
| `/support/:id` | SupportDetailPage | 业务支持详情 |
| `/support/new` | SupportFormPage | 新建工单 |
| `/support/:id/edit` | SupportFormPage | 编辑工单 |

### 导航设计
- 导航机制：页面路由
- 导航项：
  - 工作台（`/`）
  - 客户管理（`/customers`）
  - 广告业务（`/ads`）
  - 视频业务（`/videos`）
  - 合同业务（`/contracts`）
  - 财务管理（`/finance`）
  - 人资管理（`/hr`）
  - 行政管理（`/admin`）
  - 任务中心（`/tasks`）
  - 系统管理（`/system`）
  - 业务支持（`/support`）

## 插件设计

本项目以飞书多维表格「牧唐数智一体化系统」为唯一数据源，通过 feishu-bitable 插件实例实现全部数据的读写操作。

| 插件名称 | 基础插件 | 用途 | 调用方式 | 关联页面 | 输入参数 | 输出类型 |
|---------|---------|------|---------|---------|---------|---------|
| mt-bitable | feishu-bitable | 读写飞书多维表格中各业务数据表，支持查询记录列表、读取单条详情、新建/更新记录、聚合查询 | 前端 capabilityClient | 全部页面 | appToken（多维表格ID）、tableId（各模块对应表格ID）、查询/写入参数 | 根据 action 而定（searchRecords 返回记录数组、getRecord 返回单条记录、batchAddRecords/batchUpdateRecords 返回操作结果） |

**插件实例规划**：创建一个 mt-bitable 实例，配置 appToken 指向飞书多维表格「牧唐数智一体化系统」。各模块通过传入不同的 tableId 参数区分操作的业务数据表。

**数据操作映射**：

| 操作 | 插件 Action | 说明 |
|------|------------|------|
| 列表查询 | searchRecords | 分页查询、排序、筛选 |
| 详情读取 | getRecord | 按 recordId 查询单条 |
| 新建记录 | batchAddRecords | 单条记录新增 |
| 编辑记录 | batchUpdateRecords | 按 recordId 更新单条 |
| 工作台统计 | searchRecords + aggregateQuery | 查询各业务表记录后在程序内统计计算 |

## 数据模型

本项目以飞书多维表格为数据源，不创建本地数据库表。前端通过插件直接读写多维表格，各模块数据接口定义在 `shared/` 目录下作为 TypeScript 类型契约。

### 核心数据类型

```typescript
// 通用记录基础字段
interface IBaseRecord {
  recordId: string;
  createdAt?: string;
  updatedAt?: string;
}

// 客户
interface ICustomer extends IBaseRecord {
  name: string;
  industry?: string;
  contact?: string;
  phone?: string;
  level: 'A' | 'B' | 'C';
  followStatus: string;
  owner?: string;
}

// 广告项目
interface IAdProject extends IBaseRecord {
  code: string;
  customerId?: string;
  adType: string;
  channel?: string;
  budget: number;
  scheduleStart?: string;
  scheduleEnd?: string;
  status: 'pending' | 'running' | 'closed';
}

// 视频项目
interface IVideoProject extends IBaseRecord {
  code: string;
  customerId?: string;
  videoType: string;
  director?: string;
  productionCycle?: string;
  budget: number;
  status: string;
}

// 合同
interface IContract extends IBaseRecord {
  code: string;
  customerId?: string;
  amount: number;
  signDate?: string;
  expireDate?: string;
  status: 'draft' | 'reviewing' | 'active' | 'expired';
}

// 财务记录
interface IFinanceRecord extends IBaseRecord {
  code: string;
  type: 'income' | 'expense';
  contractId?: string;
  amount: number;
  date?: string;
  handler?: string;
  note?: string;
}

// 员工
interface IEmployee extends IBaseRecord {
  name: string;
  department?: string;
  position?: string;
  hireDate?: string;
  status: 'active' | 'resigned';
  phone?: string;
}

// 行政资产
interface IAdminAsset extends IBaseRecord {
  name: string;
  category?: string;
  owner?: string;
  date?: string;
  status: string;
}

// 任务
interface ITask extends IBaseRecord {
  title: string;
  assignee?: string;
  priority: 'high' | 'mid' | 'low';
  dueDate?: string;
  relatedModule?: string;
  status: 'todo' | 'doing' | 'done';
}

// 系统用户
interface ISystemUser extends IBaseRecord {
  name: string;
  role: 'admin' | 'member';
  department?: string;
  accountStatus: 'enabled' | 'disabled';
}

// 业务支持工单
interface ISupportTicket extends IBaseRecord {
  code: string;
  submitter?: string;
  issueType?: string;
  description?: string;
  handler?: string;
  status: 'open' | 'processing' | 'resolved';
}
```

## 业务模型

本项目前端直接通过 capabilityClient 调用 mt-bitable 插件完成数据读写，不创建自建 HTTP API。各页面功能实现方式如下：

### 工作台 相关

**页面路径**: `/`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| KPI 指标卡数据 | 插件 | capabilityClient 调 mt-bitable 分别查询各业务表，程序内统计计数/求和 |
| 合同金额趋势图 | 插件 | 查询合同表记录，前端按月份聚合金额渲染折线图 |
| 项目状态分布图 | 插件 | 查询广告/视频项目表，前端按状态分组计数渲染环形图 |
| 待办任务 TOP 5 | 插件 | 查询任务表，筛选未完成任务，前端排序取前5条 |
| 快捷入口 | 前端路由 | 路由跳转至对应表单页 |

### 客户管理 相关

**页面路径**: `/customers`、`/customers/:id`、`/customers/new`、`/customers/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 客户列表查询 | 插件 | capabilityClient 调 mt-bitable searchRecords 查询客户表 |
| 客户详情读取 | 插件 | capabilityClient 调 mt-bitable getRecord 按 recordId 读取 |
| 新建客户 | 插件 | capabilityClient 调 mt-bitable batchAddRecords 创建记录 |
| 编辑客户 | 插件 | capabilityClient 调 mt-bitable batchUpdateRecords 更新记录 |
| 搜索与筛选 | 前端逻辑 | 对已加载记录做前端 filter（按名称/等级） |

### 广告业务 相关

**页面路径**: `/ads`、`/ads/:id`、`/ads/new`、`/ads/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 广告项目列表查询 | 插件 | searchRecords 查询广告项目表 |
| 详情/新建/编辑 | 插件 | getRecord / batchAddRecords / batchUpdateRecords |
| 搜索与状态筛选 | 前端逻辑 | 对已加载记录做前端 filter |

### 视频业务 相关

**页面路径**: `/videos`、`/videos/:id`、`/videos/new`、`/videos/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 视频项目列表查询 | 插件 | searchRecords 查询视频项目表 |
| 详情/新建/编辑 | 插件 | getRecord / batchAddRecords / batchUpdateRecords |
| 搜索与交付状态筛选 | 前端逻辑 | 对已加载记录做前端 filter |

### 合同业务 相关

**页面路径**: `/contracts`、`/contracts/:id`、`/contracts/new`、`/contracts/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 合同列表查询 | 插件 | searchRecords 查询合同表 |
| 详情/新建/编辑 | 插件 | getRecord / batchAddRecords / batchUpdateRecords |
| 状态 Tab 切换筛选 | 前端逻辑 | 对已加载记录做前端 filter |

### 财务管理 相关

**页面路径**: `/finance`、`/finance/:id`、`/finance/new`、`/finance/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 财务列表查询 | 插件 | searchRecords 查询财务表 |
| 详情/新建/编辑 | 插件 | getRecord / batchAddRecords / batchUpdateRecords |
| 收支汇总计算 | 前端逻辑 | 对已加载记录按类型求和 |
| 搜索与类型筛选 | 前端逻辑 | 对已加载记录做前端 filter |

### 人资管理 相关

**页面路径**: `/hr`、`/hr/:id`、`/hr/new`、`/hr/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 员工列表查询 | 插件 | searchRecords 查询员工表 |
| 详情/新建/编辑 | 插件 | getRecord / batchAddRecords / batchUpdateRecords |
| 搜索与状态筛选 | 前端逻辑 | 对已加载记录做前端 filter |

### 行政管理 相关

**页面路径**: `/admin`、`/admin/:id`、`/admin/new`、`/admin/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 行政列表查询 | 插件 | searchRecords 查询行政资产表 |
| 详情/新建/编辑 | 插件 | getRecord / batchAddRecords / batchUpdateRecords |
| 搜索与类别筛选 | 前端逻辑 | 对已加载记录做前端 filter |

### 任务中心 相关

**页面路径**: `/tasks`、`/tasks/:id`、`/tasks/new`、`/tasks/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 任务列表查询 | 插件 | searchRecords 查询任务表 |
| 详情/新建/编辑 | 插件 | getRecord / batchAddRecords / batchUpdateRecords |
| 标记完成 | 插件 | batchUpdateRecords 更新任务状态为已完成 |
| 搜索与状态/优先级筛选 | 前端逻辑 | 对已加载记录做前端 filter |

### 系统管理 相关

**页面路径**: `/system`、`/system/:id`、`/system/new`、`/system/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 用户列表查询 | 插件 | searchRecords 查询系统用户表 |
| 详情/新建/编辑 | 插件 | getRecord / batchAddRecords / batchUpdateRecords |
| 启用/禁用账号 | 插件 | batchUpdateRecords 更新 accountStatus |
| 搜索与角色筛选 | 前端逻辑 | 对已加载记录做前端 filter |

### 业务支持 相关

**页面路径**: `/support`、`/support/:id`、`/support/new`、`/support/:id/edit`

**功能全景**：
| 功能 | 实现方式 | 说明 |
|------|----------|------|
| 工单列表查询 | 插件 | searchRecords 查询工单表 |
| 详情/新建/编辑 | 插件 | getRecord / batchAddRecords / batchUpdateRecords |
| 受理/关闭工单 | 插件 | batchUpdateRecords 更新处理状态 |
| 搜索与状态筛选 | 前端逻辑 | 对已加载记录做前端 filter |