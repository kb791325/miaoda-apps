# 牧唐数智一体化管理系统 - 需求拆解文档

## 产品概述

- **产品类型**: 广告代理公司一体化管理系统（中后台 SaaS）
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 牧唐数智广告代理公司的内部员工（销售/客户经理、项目执行、财务、人事行政、管理层）
- **核心价值**: 以飞书多维表格「牧唐数智一体化系统」为唯一数据源，打通客户、广告/视频业务、合同、财务、人资、行政、任务等全流程的一体化管理工作台
- **界面语言**: 中文
- **主题偏好**: user_specified（商务蓝主色调，浅色基底）
- **导航模式**: 路径导航
- **导航布局**: Sidebar（左侧导航菜单，内部员工 CRUD 工作台，多模块管理系统）
- **数据源**: 飞书多维表格「牧唐数智一体化系统」（appToken / tableId 等具体配置由 design 阶段填入，不在本文档硬编码）

> **说明**: 用户明确锁定 11 个模块且每个模块含列表页/详情页/表单页（lockSpec），页面数较多，采用「通用列表页 / 通用详情页 / 通用表单页」复用组件模式承载各业务模块，避免重复开发。

---

## 插件规划

| 插件实例名称 | 基于官方插件 | 业务用途 | 输出模式 | 所属页面 |
|------------|-----------|---------|---------|---------|
| mt-bitable | feishu-bitable | 读写多维表格「牧唐数智一体化系统」中各业务数据表（客户、广告项目、视频项目、合同、财务、员工、行政资产、任务、系统用户等），支持查询记录列表、读取单条详情、新建/更新记录 | unary | 全部页面 |

---

## 页面结构总览

> **说明**：此表为页面生成的唯一数据源。10 个业务模块（除工作台外）采用统一的三页模式：列表页（一级，导航进入）→ 详情页 / 表单页（二级，列表页内触发）。建议以通用 ListPage / DetailPage / FormPage 组件 + 各模块字段配置实现。

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 工作台 | `WorkbenchPage.tsx` | `/` | 一级 | 导航 |
| 客户列表 | `CustomerListPage.tsx` | `/customers` | 一级 | 导航 |
| 客户详情 | `CustomerDetailPage.tsx` | `/customers/:id` | 二级 | 客户列表 → 行点击 |
| 客户表单 | `CustomerFormPage.tsx` | `/customers/new`、`/customers/:id/edit` | 二级 | 客户列表 → “新建客户” / 行操作 “编辑” |
| 广告业务列表 | `AdProjectListPage.tsx` | `/ads` | 一级 | 导航 |
| 广告业务详情 | `AdProjectDetailPage.tsx` | `/ads/:id` | 二级 | 广告业务列表 → 行点击 |
| 广告业务表单 | `AdProjectFormPage.tsx` | `/ads/new`、`/ads/:id/edit` | 二级 | 广告业务列表 → “新建” / 行操作 “编辑” |
| 视频业务列表 | `VideoProjectListPage.tsx` | `/videos` | 一级 | 导航 |
| 视频业务详情 | `VideoProjectDetailPage.tsx` | `/videos/:id` | 二级 | 视频业务列表 → 行点击 |
| 视频业务表单 | `VideoProjectFormPage.tsx` | `/videos/new`、`/videos/:id/edit` | 二级 | 视频业务列表 → “新建” / 行操作 “编辑” |
| 合同列表 | `ContractListPage.tsx` | `/contracts` | 一级 | 导航 |
| 合同详情 | `ContractDetailPage.tsx` | `/contracts/:id` | 二级 | 合同列表 → 行点击 |
| 合同表单 | `ContractFormPage.tsx` | `/contracts/new`、`/contracts/:id/edit` | 二级 | 合同列表 → “新建合同” / 行操作 “编辑” |
| 财务列表 | `FinanceListPage.tsx` | `/finance` | 一级 | 导航 |
| 财务详情 | `FinanceDetailPage.tsx` | `/finance/:id` | 二级 | 财务列表 → 行点击 |
| 财务表单 | `FinanceFormPage.tsx` | `/finance/new`、`/finance/:id/edit` | 二级 | 财务列表 → “新建收支记录” / 行操作 “编辑” |
| 人资列表 | `HrListPage.tsx` | `/hr` | 一级 | 导航 |
| 人资详情 | `HrDetailPage.tsx` | `/hr/:id` | 二级 | 人资列表 → 行点击 |
| 人资表单 | `HrFormPage.tsx` | `/hr/new`、`/hr/:id/edit` | 二级 | 人资列表 → “新建员工档案” / 行操作 “编辑” |
| 行政列表 | `AdminListPage.tsx` | `/admin` | 一级 | 导航 |
| 行政详情 | `AdminDetailPage.tsx` | `/admin/:id` | 二级 | 行政列表 → 行点击 |
| 行政表单 | `AdminFormPage.tsx` | `/admin/new`、`/admin/:id/edit` | 二级 | 行政列表 → “新建” / 行操作 “编辑” |
| 任务中心列表 | `TaskListPage.tsx` | `/tasks` | 一级 | 导航 |
| 任务详情 | `TaskDetailPage.tsx` | `/tasks/:id` | 二级 | 任务列表 → 行点击 |
| 任务表单 | `TaskFormPage.tsx` | `/tasks/new`、`/tasks/:id/edit` | 二级 | 任务列表 → “新建任务” / 行操作 “编辑” |
| 系统管理列表 | `SystemListPage.tsx` | `/system` | 一级 | 导航 |
| 系统管理详情 | `SystemDetailPage.tsx` | `/system/:id` | 二级 | 系统管理列表 → 行点击 |
| 系统管理表单 | `SystemFormPage.tsx` | `/system/new`、`/system/:id/edit` | 二级 | 系统管理列表 → “新建” / 行操作 “编辑” |
| 业务支持列表 | `SupportListPage.tsx` | `/support` | 一级 | 导航 |
| 业务支持详情 | `SupportDetailPage.tsx` | `/support/:id` | 二级 | 业务支持列表 → 行点击 |
| 业务支持表单 | `SupportFormPage.tsx` | `/support/new`、`/support/:id/edit` | 二级 | 业务支持列表 → “新建” / 行操作 “编辑” |

> 各模块列表页内的数据表名（tableId 映射）由 mt-bitable 插件实例配置承载，design 阶段统一维护在各模块的字段配置文件中。

---

## 页面布局建议

- **布局模式**: 全局为 [Sidebar | main] 控制台布局；列表页内部为「工具栏（搜索+筛选+新建按钮）+ 数据表格」上下分区；表单页为单栏居中表单卡片；详情页为左右分栏（左侧基础信息主卡 + 右侧状态/关联信息侧卡）。
- **视觉重心**: 列表页在「表格数据」，表单页在「表单内容」，详情页在「主信息卡」；商务蓝（深蓝导航 + 蓝色主按钮/链接/选中态）贯穿全局。
- **结果承载区**: 列表页表格为结果承载区，初始态为插件加载中 skeleton / 加载失败提示（含重试按钮），无数据时显示空状态 + “新建”引导按钮；详情/表单页初始态为 skeleton，提交后有 toast 反馈。

---

## 导航配置

- **导航布局**: Sidebar（左侧固定，商务蓝深色底，含 Logo「牧唐数智一体化」+ 11 个模块导航项 + 底部当前用户信息）
- **导航项**（仅一级页面）:

  | 导航文字 | 路由 | 图标(可选) |
  |---------|------|-----------|
  | 工作台 | `/` | LayoutDashboard |
  | 客户管理 | `/customers` | Users |
  | 广告业务 | `/ads` | Megaphone |
  | 视频业务 | `/videos` | Video |
  | 合同业务 | `/contracts` | FileText |
  | 财务管理 | `/finance` | Wallet |
  | 人资管理 | `/hr` | IdCard |
  | 行政管理 | `/admin` | Building |
  | 任务中心 | `/tasks` | CheckSquare |
  | 系统管理 | `/system` | Settings |
  | 业务支持 | `/support` | Headphones |

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 各模块列表数据查询（客户/广告/视频/合同/财务/人资/行政/任务/系统/业务支持 10 张数据表） | real-plugin | capabilityClient 调 mt-bitable 实例，按模块传入对应的表格配置，查询记录列表并渲染到表格 | 失败提示 (toast “数据源暂不可用，请检查多维表格配置”) |
| 详情数据读取 | real-plugin | capabilityClient 调 mt-bitable 实例，传入目标记录标识与表格配置，读取单条记录展示详情 | 失败提示 (toast “数据源暂不可用”) |
| 新建记录提交 | real-plugin | capabilityClient 调 mt-bitable 实例，传入表单填写的内容与表格配置，创建记录 | 失败提示 (toast “提交失败，请稍后重试”) |
| 编辑记录提交 | real-plugin | capabilityClient 调 mt-bitable 实例，传入修改后的内容与目标记录标识，更新记录 | 失败提示 (toast “提交失败，请稍后重试”) |
| 工作台统计数据（KPI 汇总） | real-plugin | capabilityClient 调 mt-bitable 实例查询各业务表后在程序内统计计算（计数/求和），禁止硬编码数值 | 失败提示 (KPI 卡片显示 “--” + 数据源不可用提示) |
| 列表筛选/搜索/排序 | demo-mock | 纯前端对已加载的记录数组做 filter/sort（不回写数据源） | ✅ 本身即前端逻辑 |

> **一致性声明**: 「插件规划」中 mt-bitate 实例对应的所有数据行均为 `real-plugin`，无 mock 旁路；具体 appToken/tableId 配置由 design 阶段填入。

---

## 功能列表

> 10 个业务模块的列表/详情/表单页采用统一交互模式，以下先定义**通用模式功能点**（含操作 5 要素语义），再列出各模块的差异化字段与功能。

### 通用模式功能点（适用全部业务模块）

- **页面/区块**: 列表页（通用模式）
  - **页面目标**: 浏览、检索、管理本模块全部记录，并作为详情/表单页的入口
  - **功能点**:
    - **查询记录列表**: 页面加载时调 mt-bitable 查询本模块表格，渲染表格（列含业务字段 + 状态 Badge + 操作列）；加载中显示 skeleton，失败显示错误提示 + 重试按钮，空数据显示空状态引导
    - **搜索**: 工具栏搜索框，按主字段（名称/编号）对已加载记录做前端过滤
    - **状态筛选**: 工具栏状态 Tab 或 Select（如 全部/进行中/已完成），前端过滤列表
    - **新建记录**（操作型）:
      - 触发: 工具栏主按钮「+ 新建XX」
      - 交互: 跳转本模块表单页（`/xxx/new`）
      - 提交: 表单页调 mt-bitable 创建记录
      - 反馈: toast.success 创建成功，返回列表页并刷新
      - 数据契约: 各模块 interface（见下方数据共享配置）
    - **编辑记录**（操作型）:
      - 触发: Table 行“操作”列「编辑」按钮
      - 交互: 跳转 `/xxx/:id/edit` 表单页并预填数据
      - 提交: 调 mt-bitable 更新记录
      - 反馈: toast.success 更新成功，返回列表并刷新
    - **查看详情**: 行点击（或操作列「查看」）跳转 `/xxx/:id` 详情页

- **页面/区块**: 详情页（通用模式）
  - **页面目标**: 查看单条记录完整信息与关联状态
  - **功能点**:
    - **详情展示**: 调 mt-bitable 读取单条记录，主信息卡展示全部业务字段（分组分区），状态字段高亮 Badge
    - **关联信息侧卡**: 展示记录的创建时间、负责人、状态流转等元信息
    - **快捷操作**: 顶部「编辑」按钮跳转编辑表单、「返回」回列表页

- **页面/区块**: 表单页（通用模式，新建/编辑复用）
  - **页面目标**: 结构化录入或修改一条业务记录
  - **功能点**:
    - **表单渲染**: 按模块字段配置渲染表单（Input/Select/DatePicker/Textarea/金额输入），必填项校验
    - **编辑预填**: 编辑模式下读取原记录回填表单
    - **提交**: 调 mt-bitable 创建/更新记录，成功 toast + 返回列表；失败 toast 错误信息
    - **取消**: 返回来源列表页，不产生数据变更

### 工作台（WorkbenchPage）

- **页面目标**: 全公司经营态势一屏总览 + 快捷入口
- **功能点**:
  - **KPI 指标卡**: 客户总数、进行中广告项目数、进行中视频项目数、本月合同额、本月收入/支出、待办任务数（全部由 mt-bitable 查询后程序内统计）
  - **业务概览图表**: 近期合同金额趋势（折线图）、广告/视频项目状态分布（环形图），数据来自插件查询结果
  - **待办任务列表**: 读取任务表中未完成任务 TOP 5，点击跳转任务详情
  - **快捷入口**: 常用操作卡片（新建客户/新建合同/新建任务）一键跳转对应表单页

### 各模块差异化说明

- **客户管理**： 字段含 客户名称/行业/联系人/电话/客户等级/跟进状态/所属销售；支持按客户等级筛选
- **广告业务**： 字段含 项目编号/客户/广告类型（信息流/开屏/户外等）/投放渠道/预算金额/排期/项目状态；状态含 待投放/投放中/已结案
- **视频业务**： 字段含 项目编号/客户/视频类型/导演/制作周期/预算/交付状态；支持按交付状态筛选
- **合同业务**： 字段含 合同编号/关联合同方/关联客户/合同金额/签订日期/到期日期/合同状态（草稿/审批中/生效/到期）；列表支持按状态 Tab 切换
- **财务管理**： 字段含 单据编号/类型（收入/支出）/关联合同/金额/收支日期/经手人/凭证说明；列表页顶部展示本页收入/支出/净额汇总（前端计算已加载数据）
- **人资管理**： 字段含 姓名/部门/岗位/入职日期/在职状态/联系方式；员工档案列表
- **行政管理**： 字段含 资产/事项名称/类别/负责人/日期/状态；行政资产与事项登记
- **任务中心**： 字段含 任务标题/负责人/优先级/截止日期/关联模块/任务状态（待处理/进行中/已完成）；支持按状态 Tab + 优先级筛选，行内可快捷「标记完成」
- **系统管理**： 字段含 用户姓名/角色（管理员/普通成员）/账号状态（启用/禁用）/所属部门；支持行操作「启用/禁用」切换账号状态（操作型：行内按钮 + 确认 + 调 mt-bitable 更新 + toast）
- **业务支持**： 字段含 工单编号/提交人/问题类型/问题描述/处理人/处理状态（待响应/处理中/已解决）；工单列表支持「受理/关闭」状态流转（操作型：行操作按钮 + 调 mt-bitable 更新状态 + toast）

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_mt_customers` | 客户列表缓存，类型 `ICustomer[]` | 客户列表/详情/表单、广告/视频/合同表单（客户选择器） |
| `__global_mt_contracts` | 合同列表缓存，类型 `IContract[]` | 合同列表/详情/表单、财务表单（关联合同选择器） |
| `__global_mt_tasks` | 任务列表缓存，类型 `ITask[]` | 任务中心各页、工作台待办 |

```ts
// 通用记录基础字段（各模块 interface 均继承）
interface IBaseRecord {
  /** 记录 ID（来自多维表格） */
  recordId: string;
  /** 创建时间 */
  createdAt?: string;
  /** 最后更新时间 */
  updatedAt?: string;
}

interface ICustomer extends IBaseRecord {
  name: string;            // 客户名称
  industry?: string;       // 行业
  contact?: string;        // 联系人
  phone?: string;          // 联系电话
  level: 'A' | 'B' | 'C';  // 客户等级
  followStatus: string;    // 跟进状态
  owner?: string;          // 所属销售
}

interface IAdProject extends IBaseRecord {
  code: string;            // 项目编号
  customerId?: string;     // 关联客户
  adType: string;          // 广告类型
  channel?: string;        // 投放渠道
  budget: number;          // 预算金额
  scheduleStart?: string;  // 排期开始
  scheduleEnd?: string;    // 排期结束
  status: 'pending' | 'running' | 'closed'; // 待投放/投放中/已结案
}

interface IVideoProject extends IBaseRecord {
  code: string;            // 项目编号
  customerId?: string;     // 关联客户
  videoType: string;       // 视频类型
  director?: string;       // 导演
  productionCycle?: string;// 制作周期
  budget: number;          // 预算
  status: string;          // 交付状态
}

interface IContract extends IBaseRecord {
  code: string;            // 合同编号
  customerId?: string;     // 关联客户
  amount: number;          // 合同金额
  signDate?: string;       // 签订日期
  expireDate?: string;     // 到期日期
  status: 'draft' | 'reviewing' | 'active' | 'expired'; // 草稿/审批中/生效/到期
}

interface IFinanceRecord extends IBaseRecord {
  code: string;            // 单据编号
  type: 'income' | 'expense'; // 收入/支出
  contractId?: string;     // 关联合同
  amount: number;          // 金额
  date?: string;           // 收支日期
  handler?: string;        // 经手人
  note?: string;           // 凭证说明
}

interface IEmployee extends IBaseRecord {
  name: string;            // 姓名
  department?: string;     // 部门
  position?: string;       // 岗位
  hireDate?: string;       // 入职日期
  status: 'active' | 'resigned'; // 在职/离职
  phone?: string;          // 联系方式
}

interface IAdminAsset extends IBaseRecord {
  name: string;            // 资产/事项名称
  category?: string;       // 类别
  owner?: string;          // 负责人
  date?: string;           // 日期
  status: string;          // 状态
}

interface ITask extends IBaseRecord {
  title: string;           // 任务标题
  assignee?: string;       // 负责人
  priority: 'high' | 'mid' | 'low'; // 优先级
  dueDate?: string;        // 截止日期
  relatedModule?: string;  // 关联模块
  status: 'todo' | 'doing' | 'done'; // 待处理/进行中/已完成
}

interface ISystemUser extends IBaseRecord {
  name: string;            // 用户姓名
  role: 'admin' | 'member';// 角色
  department?: string;     // 所属部门
  accountStatus: 'enabled' | 'disabled'; // 启用/禁用
}

interface ISupportTicket extends IBaseRecord {
  code: string;            // 工单编号
  submitter?: string;      // 提交人
  issueType?: string;      // 问题类型
  description?: string;    // 问题描述
  handler?: string;        // 处理人
  status: 'open' | 'processing' | 'resolved'; // 待响应/处理中/已解决
}

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Free Direction —— 无参考材料，按广告代理公司一体化管理语义自主设计。
- **核心情绪 / 应用类型**: 中后台管理系统（appType 1）—— 广告代理业务的全链路工作台，情绪是“专业、有序、可信的商务运营感”。
- **独特记忆点**: 深商务蓝导航骨架 + 工作台的“业务流水仪表带”：合同/投放/回款关键数字用蓝色系数据卡横贯首屏，让“广告公司生意节拍”成为系统识别锚点。

## 2. Art Direction

- **方向名**: 商务蓝秩序工作台
- **Design Style**: Swiss Minimalist 瑞士极简 + Material 秩序感 —— 广告代理业务涉及客户、合同、财务等强流程数据，需要克制网格与清晰层级，避免装饰压过信息。
- **DNA 参数**: 圆角 subtle（`rounded-md`）/ 阴影 subtle（`shadow-sm`，弹层 `shadow-md`）/ 间距 standard（`gap-4 p-6`）/ 字体方向：清晰无衬线 + 数字用 tabular 等宽气质 / 装饰手法：细边框分隔 + 蓝色细顶线用于模块页头。
- **应用类型**: Workflow / Tool —— 左侧固定导航 + 主区列表-详情-表单三层任务流。

## 3. Color System

**色彩关系**: 深商务蓝主色 + 同色相浅蓝反馈底 + 冷灰白页面背景，全站单一色相家族，中性灰承接 90% 界面。
**配色设计理由**: primary 只给主按钮、当前导航项、关键状态与品牌锚点；bg 用冷调灰白降低长时间表格阅读的疲劳；accent 作为 hover/选中浅底保持低干扰。
**主色推导**: 商务蓝取 Lark Blue 系（H222），饱和度适中、明度 51%，传达广告代理行业的专业可信；工作台数据卡用其深浅衍生构成蓝色节拍带。
**使用比例**: 60% 中性 / 30% 辅助（accent 与灰阶层级）/ 10% primary；严禁主按钮、tab 激活、icon、边框、链接同时使用 primary。

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(210 20% 97%) | 页面背景，冷调灰白 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 卡片、表格、表单、弹层 |
| text | `--foreground` | `text-foreground` | hsl(216 14% 14%) | 标题与正文 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(215 10% 46%) | 占位符、辅助说明、元信息 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(222 88% 51%) | 主按钮、激活导航、品牌锚点 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | primary 上的文字图标 |
| accent | `--accent` | `bg-accent` | hsl(220 40% 95%) | hover/选中浅底、菜单项状态 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(222 60% 35%) | accent 上的文字图标 |
| border | `--border` | `border-border` | hsl(216 12% 89%) | 输入框、卡片、表格分隔线 |

**语义色提示**: 成功 hsl(150 55% 42%)：bg hsl(150 50% 94%) / border hsl(150 45% 78%) / text hsl(150 60% 32%)；警告 hsl(35 85% 45%)：bg hsl(38 90% 95%) / border hsl(35 80% 80%) / text hsl(30 80% 35%)；错误 hsl(0 70% 48%)：bg hsl(0 80% 96%) / border hsl(0 60% 82%) / text hsl(0 70% 40%)。三者饱和度与 primary（88%）对齐控制在 ±20% 内，色温统一偏冷调场景中仅作低面积状态提示，用于合同审批、财务回款、任务状态列。

## 4. 字体与节奏

- **font-display**: Noto Sans SC 700 —— 中后台标题要求清晰庄重，中文渲染稳定。
- **font-body**: Noto Sans SC 400/500 —— 表格与表单长文本可读性优先，数字列加 `tabular-nums`。
- **字号**: 页头 H2 text-2xl；区块标题 text-lg；正文/表格 text-sm ~ text-base；muted text-xs ~ text-sm。
- **圆角**: 中小（`rounded-md`）—— 保持工具感与秩序，控件与卡片统一。

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导：左侧导航（11 模块两级树）+ 右侧主区（顶栏 + 内容）。
- **Page / Section Order**: 工作台（数据卡带 + 待办 + 快捷入口）→ 客户管理 → 广告业务 → 视频业务 → 合同业务 → 财务管理 → 人资管理 → 行政管理 → 任务中心 → 系统管理 → 业务支持；每模块含列表页（筛选 + 表格 + 分页）、详情页（字段分组 + 时间线）、表单页（分区表单）。
- **Standard Content Zone**: 主区内容 `max-w-[1400px]` + `px-6 py-6`，表格区自适应占满。
- **Shell / Frame Alignment**: 同宽 —— 内容容器与顶栏对齐同一边距节奏，左导航独立滚动。
- **Padding & Rhythm**: `px-4 md:px-6 py-6`，卡片间距 `gap-4`，保持 8px 倍数。
- **Full-bleed Zones**: 工作台顶部数据卡带可横贯内容区全宽；无营销 Hero。
- **Local Narrowing**: 表单页主列 `max-w-3xl`，详情页字段区 `max-w-4xl`，侧栏辅助信息独立。
- **Overflow Strategy**: 业务列表宽表格统一 `overflow-x-auto` + 列固定（操作列右侧固定）；流程时间线纵向滚动。
- **Flexibility Boundary**: 允许移动端导航折叠为抽屉、卡片内边距微调；不允许按模块切换 max-w、圆角、主色或阴影语言。

## 6. 视觉与动效

- **装饰**: 模块页头 2px 蓝色顶线、工作台数据卡的深浅蓝渐变数字带。
- **阴影/边界**: 轻 —— 平面以 border 分隔为主，仅弹层与下拉用 `shadow-md`。
- **动效**: 克制 —— 行 hover 浅底过渡 150ms；路由切换内容淡入 200ms；导航激活态左移指示条；不使用弹跳与大幅位移。

## 7. 组件原则

- 按钮、输入框、下拉、表格行、导航项必须有 Default / Hover / Active / Focus-visible / Disabled 状态，focus 用 primary 2px 外环。
- Primary 承担“新建客户 / 提交审批 / 保存”等主行动；列表筛选与次级操作用 Outline；行内操作用 Ghost。
- 表格：斑马纹不用，行 hover 用 accent；状态列用语义色 badge（bg + text）+ 图标辅助，不靠纯颜色。
- 加载用蓝色系 Skeleton，空状态配简洁插画式占位与“新建”引导，延续同一视觉语言。

## 8. Image Direction

- **Image Role**: 无强制图片需求 —— 中后台以数据与表单为主，登录页可用一张品牌氛围图，其余页面靠排版与色彩建立记忆点。
- **Image Art Direction**: 登录页背景：抽象的城市媒介光线构图，深蓝夜幕下广告屏与玻璃幕墙的柔和反光，前中后景层次清晰，低饱和商务蓝调，左侧留白叠登录卡片，情绪是“数字广告行业的秩序与脉动”。
- **Image Prompt Keywords**: deep blue night cityscape, glowing billboard light, glass facade reflection, soft ambient light, layered depth, low saturation corporate blue, minimal abstract composition, clean negative space, subtle bokeh, professional calm mood
- **Image Avoidance**: 避免商务人物握手素材、通用科技粒子插图、高饱和紫蓝渐变海报感、杂乱霓虹赛博风；避免主体居中导致登录卡片无处安放。

## 9. Anti-patterns

- **Split personality**: 11 个模块各自换主色或圆角 —— 全站共享同一蓝色系统与组件语言。
- **Phantom tokens**: 编造 shadcn 未定义变量；状态色必须落成可用的 bg/border/text 三态。
- **Default SaaS drift**: 回退到默认蓝紫渐变与无意义卡片堆砌 —— 用数据卡带与蓝色顶线塑造广告代理业务识别。
- **Invisible interaction**: 表格行和菜单只有 hover 没有 focus-visible；键盘导航必须可见。
- **Mono-hue tyranny**: 主按钮、tab、icon、边框、链接全用 primary —— 图标与边框回归中性灰，primary 收回到 CTA 与激活态。
- **Status color drift**: 审批/回款状态色饱和度刺眼压过主色 —— 语义色饱和度与 primary 对齐 ±20%。