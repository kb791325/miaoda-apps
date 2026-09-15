# 牧唐数智一体化 ERP 管理系统 - 需求拆解文档

## 产品概述

- **产品类型**: 企业级 ERP 管理系统（广告代理业务综合管理平台）
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 广告代理公司管理层、商务团队、财务人员、行政人资等内部员工
- **核心价值**: 面向巨量千川等广告代理业务，提供客户管理、广告业务、财务管理、人资行政等一体化管理能力
- **界面语言**: 中文（预留 i18n 中英文切换框架）
- **主题偏好**: user_specified（商务蓝/深青色系，浅色背景 #F5F7FA，白色卡片，参考飞书/Linear 设计语言）
- **导航模式**: 路径导航
- **导航布局**: Sidebar（左侧导航菜单 + 顶部固定导航栏）

---

## 页面结构总览

> **说明**: 本系统为复杂中后台 ERP，包含 11 个一级模块、数十个二级/三级页面。以下按模块组织，所有菜单页面均为一级页面（出现在侧边栏导航中），详情页/表单弹窗为二级交互。

| 模块 | 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|------|---------|-------|------|---------|---------|
| 登录 | 登录页 | `LoginPage.vue` | `/login` | 一级 | 直接访问 / 退出登录 |
| 工作台 | 工作台（管理看板） | `dashboard/WorkbenchPage.vue` | `/dashboard/workbench` | 一级 | 导航 / 登录后默认页 |
| 客户管理 | 公海客资 | `customer/PublicSeaList.vue` | `/customer/public-sea` | 一级 | 导航 |
| 客户管理 | 无效客资 | `customer/InvalidLeadsList.vue` | `/customer/invalid-leads` | 一级 | 导航 |
| 客户管理 | 转化分析 | `customer/ConversionAnalysis.vue` | `/customer/conversion-analysis` | 一级 | 导航 |
| 客户管理 | 线索管理 | `customer/ClueList.vue` | `/customer/clues` | 一级 | 导航 |
| 客户管理 | 线索详情 | `customer/ClueDetail.vue` | `/customer/clues/:id` | 二级 | 线索管理页 → 查看详情 |
| 客户管理 | 客户管理 | `customer/CustomerList.vue` | `/customer/customers` | 一级 | 导航 |
| 客户管理 | 客户详情 | `customer/CustomerDetail.vue` | `/customer/customers/:id` | 二级 | 客户管理页 → 查看详情 |
| 广告业务 | 开户管理 | `advertising/AccountOpenList.vue` | `/advertising/account-open` | 一级 | 导航 |
| 广告业务 | 开户详情 | `advertising/AccountOpenDetail.vue` | `/advertising/account-open/:id` | 二级 | 开户管理页 → 查看详情 |
| 广告业务 | 报备管理 | `advertising/FilingList.vue` | `/advertising/filing` | 一级 | 导航 |
| 广告业务 | 转户管理 | `advertising/TransferList.vue` | `/advertising/transfer` | 一级 | 导航 |
| 广告业务 | 提成管理（广告） | `advertising/CommissionList.vue` | `/advertising/commission` | 一级 | 导航 |
| 视频业务 | 视频订单 | `video/VideoOrderList.vue` | `/video/orders` | 一级 | 导航 |
| 视频业务 | 视频项目 | `video/VideoProjectList.vue` | `/video/projects` | 一级 | 导航 |
| 视频业务 | 演员管理 | `video/ActorList.vue` | `/video/actors` | 一级 | 导航 |
| 视频业务 | 外包管理 | `video/OutsourceList.vue` | `/video/outsourcing` | 一级 | 导航 |
| 视频业务 | 提成管理（视频） | `video/CommissionList.vue` | `/video/commission` | 一级 | 导航 |
| 视频业务 | 拍摄费用 | `video/ShootingCostList.vue` | `/video/shooting-cost` | 一级 | 导航 |
| 视频业务 | 场地费用 | `video/VenueCostList.vue` | `/video/venue-cost` | 一级 | 导航 |
| 视频业务 | 样品管理 | `video/SampleList.vue` | `/video/samples` | 一级 | 导航 |
| 合同业务 | 合同管理 | `contract/ContractList.vue` | `/contract/contracts` | 一级 | 导航 |
| 合同业务 | 合同详情 | `contract/ContractDetail.vue` | `/contract/contracts/:id` | 二级 | 合同管理页 → 查看详情 |
| 合同业务 | 合同模版 | `contract/ContractTemplateList.vue` | `/contract/templates` | 一级 | 导航 |
| 合同业务 | 合同费用 | `contract/ContractCostList.vue` | `/contract/costs` | 一级 | 导航 |
| 财务管理 | 客户明细 | `finance/CustomerDetailList.vue` | `/finance/customer-detail` | 一级 | 导航 |
| 财务管理 | 收款管理 | `finance/ReceiptList.vue` | `/finance/receipts` | 一级 | 导航 |
| 财务管理 | 充值管理 | `finance/RechargeList.vue` | `/finance/recharges` | 一级 | 导航 |
| 财务管理 | 退款管理 | `finance/RefundList.vue` | `/finance/refunds` | 一级 | 导航 |
| 财务管理 | 消耗管理 | `finance/ConsumptionList.vue` | `/finance/consumption` | 一级 | 导航 |
| 财务管理 | 垫款管理 | `finance/AdvanceList.vue` | `/finance/advances` | 一级 | 导航 |
| 财务管理 | 发票管理 | `finance/InvoiceList.vue` | `/finance/invoices` | 一级 | 导航 |
| 财务管理 | 端口管理 | `finance/PortAccountList.vue` | `/finance/ports` | 一级 | 导航 |
| 财务管理 | 银行管理 | `finance/BankAccountList.vue` | `/finance/banks` | 一级 | 导航 |
| 财务管理 | 成本管理 | `finance/CostList.vue` | `/finance/costs` | 一级 | 导航 |
| 财务管理 | 收入管理 | `finance/IncomeList.vue` | `/finance/incomes` | 一级 | 导航 |
| 财务管理 | 支出管理 | `finance/ExpenseList.vue` | `/finance/expenses` | 一级 | 导航 |
| 财务管理 | 退币管理 | `finance/CoinRefundList.vue` | `/finance/coin-refund` | 一级 | 导航 |
| 财务管理 | 后返管理 | `finance/RebateList.vue` | `/finance/rebate` | 一级 | 导航 |
| 财务管理 | 扣减管理 | `finance/DeductionList.vue` | `/finance/deduction` | 一级 | 导航 |
| 财务管理 | 激励管理 | `finance/IncentiveList.vue` | `/finance/incentive` | 一级 | 导航 |
| 财务管理 | 费用管理 | `finance/ExpenseMgmtList.vue` | `/finance/expense-mgmt` | 一级 | 导航 |
| 财务管理 | 保证金&押金 | `finance/DepositList.vue` | `/finance/deposit` | 一级 | 导航 |
| 人资管理 | 人资看板 | `hr/HrDashboard.vue` | `/hr/dashboard` | 一级 | 导航 |
| 人资管理 | 员工管理 | `hr/EmployeeList.vue` | `/hr/employees` | 一级 | 导航 |
| 人资管理 | 员工详情 | `hr/EmployeeDetail.vue` | `/hr/employees/:id` | 二级 | 员工管理页 → 查看详情 |
| 人资管理 | 简历管理 | `hr/ResumeList.vue` | `/hr/resumes` | 一级 | 导航 |
| 人资管理 | 绩效管理 | `hr/PerformanceList.vue` | `/hr/performance` | 一级 | 导航 |
| 人资管理 | 工资管理 | `hr/SalaryList.vue` | `/hr/salary` | 一级 | 导航 |
| 人资管理 | 考勤管理 | `hr/AttendanceList.vue` | `/hr/attendance` | 一级 | 导航 |
| 人资管理 | 邀约管理 | `hr/InvitationList.vue` | `/hr/invitations` | 一级 | 导航 |
| 人资管理 | 面试管理 | `hr/InterviewList.vue` | `/hr/interviews` | 一级 | 导航 |
| 人资管理 | 签到管理 | `hr/CheckinList.vue` | `/hr/checkin` | 一级 | 导航 |
| 人资管理 | 招聘计划 | `hr/RecruitPlanList.vue` | `/hr/recruit-plan` | 一级 | 导航 |
| 行政管理 | 采购申请 | `admin/PurchaseRequisitionList.vue` | `/admin/purchase-requisition` | 一级 | 导航 |
| 行政管理 | 采购订单 | `admin/PurchaseOrderList.vue` | `/admin/purchase-order` | 一级 | 导航 |
| 行政管理 | 采购详情 | `admin/PurchaseDetailList.vue` | `/admin/purchase-detail` | 一级 | 导航 |
| 行政管理 | 资产管理 | `admin/AssetList.vue` | `/admin/assets` | 一级 | 导航 |
| 行政管理 | 库存管理 | `admin/InventoryList.vue` | `/admin/inventory` | 一级 | 导航 |
| 行政管理 | 入库管理 | `admin/StockInList.vue` | `/admin/stock-in` | 一级 | 导航 |
| 行政管理 | 领用管理 | `admin/RequisitionList.vue` | `/admin/requisition` | 一级 | 导航 |
| 行政管理 | 归还管理 | `admin/ReturnList.vue` | `/admin/return` | 一级 | 导航 |
| 行政管理 | 盘点管理 | `admin/InventoryCheckList.vue` | `/admin/inventory-check` | 一级 | 导航 |
| 任务中心 | 批量导入 | `task/BatchImportList.vue` | `/task/batch-import` | 一级 | 导航 |
| 任务中心 | 批量导出 | `task/BatchExportList.vue` | `/task/batch-export` | 一级 | 导航 |
| 任务中心 | 我的待办 | `task/MyTodoList.vue` | `/task/my-todo` | 一级 | 导航 |
| 任务中心 | 协作任务 | `task/CollabTaskList.vue` | `/task/collab-tasks` | 一级 | 导航 |
| 系统管理 | 系统设置-公海设置 | `system/SettingsPublicSea.vue` | `/system/settings/public-sea` | 一级 | 导航 |
| 系统管理 | 系统设置-线索设置 | `system/SettingsClue.vue` | `/system/settings/clue` | 一级 | 导航 |
| 系统管理 | 系统设置-客户设置 | `system/SettingsCustomer.vue` | `/system/settings/customer` | 一级 | 导航 |
| 系统管理 | 系统设置-预警设置 | `system/SettingsAlert.vue` | `/system/settings/alert` | 一级 | 导航 |
| 系统管理 | 系统设置-税点设置 | `system/SettingsTax.vue` | `/system/settings/tax` | 一级 | 导航 |
| 系统管理 | 组织架构 | `system/Organization.vue` | `/system/organization` | 一级 | 导航 |
| 系统管理 | 客户账户 | `system/CustomerAccountList.vue` | `/system/customer-accounts` | 一级 | 导航 |
| 系统管理 | 角色权限 | `system/RolePermission.vue` | `/system/roles` | 一级 | 导航 |
| 系统管理 | 操作日志 | `system/OperationLogList.vue` | `/system/operation-logs` | 一级 | 导航 |
| 系统管理 | 登录日志 | `system/LoginLogList.vue` | `/system/login-logs` | 一级 | 导航 |
| 业务支持 | 行业ROI管理 | `support/IndustryRoiList.vue` | `/support/industry-roi` | 一级 | 导航 |
| 业务支持 | 竞品监控 | `support/CompetitorMonitorList.vue` | `/support/competitor` | 一级 | 导航 |
| 业务支持 | 行业大盘 | `support/IndustryDashboard.vue` | `/support/industry-dashboard` | 一级 | 导航 |
| 业务支持 | 素材库 | `support/MaterialLibrary.vue` | `/support/materials` | 一级 | 导航 |

---

## 页面布局建议

- **整体布局模式**: Sidebar（左侧导航） + Topbar（顶部导航栏） + Main（主内容区）三段式经典中后台布局
- **视觉重心**: 主内容区，以数据表格和卡片为核心信息载体
- **列表页通用布局**: 顶部筛选区（可展开高级筛选） → 操作按钮区 → 数据表格区（含分页） → 行操作列；弹窗/抽屉承载新建/编辑/详情
- **工作台布局**: 网格布局（Grid），核心指标卡行（5列） → 实时消耗行 → 图表区（2-3列网格，5个图表） → 目标详情 + 排行榜 + 绩效任务（多列网格）
- **详情页布局**: 顶部关键信息条（标题 + 状态标签 + 操作按钮） → ElTabs 标签页切换各信息模块
- **表单页布局**: 分组卡片式，每组带标题，底部固定操作栏（提交/保存草稿/取消）

---

## 插件规划

本需求为纯前端模拟原型，所有数据均为本地 mock，不涉及 AI 插件或外部服务集成。飞书授权登录为前端模拟点击跳转，非真实飞书 OAuth 对接。

---

## 导航配置

- **导航布局**: Sidebar（左侧可折叠导航 + 顶部固定导航栏）
- **侧边栏菜单项**（11 个一级模块，支持二级/三级展开）:

| 一级菜单 | 二级菜单 | 三级菜单 | 路由 | 图标 |
|---------|---------|---------|------|------|
| 工作台 | — | — | `/dashboard/workbench` | DataAnalysis |
| 客户管理 | 公海管理 | 公海客资 | `/customer/public-sea` | User |
| 客户管理 | 公海管理 | 无效客资 | `/customer/invalid-leads` | User |
| 客户管理 | 公海管理 | 转化分析 | `/customer/conversion-analysis` | User |
| 客户管理 | 线索管理 | — | `/customer/clues` | User |
| 客户管理 | 客户管理 | — | `/customer/customers` | User |
| 广告业务 | 开户管理 | — | `/advertising/account-open` | Promotion |
| 广告业务 | 报备管理 | — | `/advertising/filing` | Promotion |
| 广告业务 | 转户管理 | — | `/advertising/transfer` | Promotion |
| 广告业务 | 提成管理 | — | `/advertising/commission` | Promotion |
| 视频业务 | 视频订单 | — | `/video/orders` | VideoPlay |
| 视频业务 | 视频项目 | — | `/video/projects` | VideoPlay |
| 视频业务 | 演员管理 | — | `/video/actors` | VideoPlay |
| 视频业务 | 外包管理 | — | `/video/outsourcing` | VideoPlay |
| 视频业务 | 提成管理 | — | `/video/commission` | VideoPlay |
| 视频业务 | 拍摄费用 | — | `/video/shooting-cost` | VideoPlay |
| 视频业务 | 场地费用 | — | `/video/venue-cost` | VideoPlay |
| 视频业务 | 样品管理 | — | `/video/samples` | VideoPlay |
| 合同业务 | 合同管理 | — | `/contract/contracts` | Document |
| 合同业务 | 合同模版 | — | `/contract/templates` | Document |
| 合同业务 | 合同费用 | — | `/contract/costs` | Document |
| 财务管理 | 客户明细 | — | `/finance/customer-detail` | Wallet |
| 财务管理 | 收款管理 | — | `/finance/receipts` | Wallet |
| 财务管理 | 充值管理 | — | `/finance/recharges` | Wallet |
| 财务管理 | 退款管理 | — | `/finance/refunds` | Wallet |
| 财务管理 | 消耗管理 | — | `/finance/consumption` | Wallet |
| 财务管理 | 垫款管理 | — | `/finance/advances` | Wallet |
| 财务管理 | 发票管理 | — | `/finance/invoices` | Wallet |
| 财务管理 | 端口管理 | — | `/finance/ports` | Wallet |
| 财务管理 | 银行管理 | — | `/finance/banks` | Wallet |
| 财务管理 | 成本管理 | — | `/finance/costs` | Wallet |
| 财务管理 | 收入管理 | — | `/finance/incomes` | Wallet |
| 财务管理 | 支出管理 | — | `/finance/expenses` | Wallet |
| 财务管理 | 退币管理 | — | `/finance/coin-refund` | Wallet |
| 财务管理 | 后返管理 | — | `/finance/rebate` | Wallet |
| 财务管理 | 扣减管理 | — | `/finance/deduction` | Wallet |
| 财务管理 | 激励管理 | — | `/finance/incentive` | Wallet |
| 财务管理 | 费用管理 | — | `/finance/expense-mgmt` | Wallet |
| 财务管理 | 保证金&押金 | — | `/finance/deposit` | Wallet |
| 人资管理 | 人资看板 | — | `/hr/dashboard` | UserFilled |
| 人资管理 | 简历管理 | — | `/hr/resumes` | UserFilled |
| 人资管理 | 邀约管理 | — | `/hr/invitations` | UserFilled |
| 人资管理 | 面试管理 | — | `/hr/interviews` | UserFilled |
| 人资管理 | 签到管理 | — | `/hr/checkin` | UserFilled |
| 人资管理 | 员工管理 | — | `/hr/employees` | UserFilled |
| 人资管理 | 工资管理 | — | `/hr/salary` | UserFilled |
| 人资管理 | 绩效管理 | — | `/hr/performance` | UserFilled |
| 人资管理 | 考勤管理 | — | `/hr/attendance` | UserFilled |
| 人资管理 | 招聘计划 | — | `/hr/recruit-plan` | UserFilled |
| 行政管理 | 采购管理 | 采购申请 | `/admin/purchase-requisition` | OfficeBuilding |
| 行政管理 | 采购管理 | 采购订单 | `/admin/purchase-order` | OfficeBuilding |
| 行政管理 | 采购管理 | 采购详情 | `/admin/purchase-detail` | OfficeBuilding |
| 行政管理 | 资产管理 | — | `/admin/assets` | OfficeBuilding |
| 行政管理 | 库存管理 | — | `/admin/inventory` | OfficeBuilding |
| 行政管理 | 入库管理 | — | `/admin/stock-in` | OfficeBuilding |
| 行政管理 | 领用管理 | — | `/admin/requisition` | OfficeBuilding |
| 行政管理 | 归还管理 | — | `/admin/return` | OfficeBuilding |
| 行政管理 | 盘点管理 | — | `/admin/inventory-check` | OfficeBuilding |
| 任务中心 | 批量导入 | — | `/task/batch-import` | Upload |
| 任务中心 | 批量导出 | — | `/task/batch-export` | Download |
| 任务中心 | 我的待办 | — | `/task/my-todo` | Bell |
| 任务中心 | 协作任务 | — | `/task/collab-tasks` | Calendar |
| 系统管理 | 系统设置 | 公海设置 | `/system/settings/public-sea` | Setting |
| 系统管理 | 系统设置 | 线索设置 | `/system/settings/clue` | Setting |
| 系统管理 | 系统设置 | 客户设置 | `/system/settings/customer` | Setting |
| 系统管理 | 系统设置 | 预警设置 | `/system/settings/alert` | Setting |
| 系统管理 | 系统设置 | 税点设置 | `/system/settings/tax` | Setting |
| 系统管理 | 组织架构 | — | `/system/organization` | Setting |
| 系统管理 | 客户账户 | — | `/system/customer-accounts` | Setting |
| 系统管理 | 角色权限 | — | `/system/roles` | Setting |
| 系统管理 | 操作日志 | — | `/system/operation-logs` | Setting |
| 系统管理 | 登录日志 | — | `/system/login-logs` | Setting |
| 业务支持 | 行业ROI管理 | — | `/support/industry-roi` | TrendCharts |
| 业务支持 | 竞品监控 | — | `/support/competitor` | TrendCharts |
| 业务支持 | 行业大盘 | — | `/support/industry-dashboard` | TrendCharts |
| 业务支持 | 素材库 | — | `/support/materials` | TrendCharts |

- **顶部导航栏元素**: 折叠按钮 + 面包屑 + 全局搜索框 + 消息通知铃铛 + 全屏按钮 + 语言切换 + 用户头像下拉

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 用户登录态 | local-persist | Pinia + localStorage key=`__mutang_user_info`，保存用户信息和登录状态，刷新后恢复 | 无 |
| 菜单折叠状态 | local-persist | Pinia + localStorage key=`__mutang_sidebar_collapsed`，记忆展开/折叠状态 | 无 |
| 表单草稿自动保存 | local-persist | localStorage 按表单类型存储草稿，进入表单页时自动回填 | 无 |
| 列表页表格数据 | demo-mock | `src/mock/*.ts` 中定义各模块模拟数据数组，15-30 条/页，中文真实业务数据 | ✅ 本身就是 mock |
| 工作台图表数据 | demo-mock | `src/mock/dashboard.ts` 定义各图表配置数据和指标数据，时间维度切换时前端切换不同 mock 数据集 | ✅ 本身就是 mock |
| 全局搜索联想 | demo-mock | `src/mock/search.ts` 定义搜索关键词联想结果，输入时前端过滤匹配 | ✅ 本身就是 mock |
| 消息通知数据 | demo-mock | `src/mock/notifications.ts` 定义系统通知/审批提醒/预警信息三类 mock 数据 | ✅ 本身就是 mock |
| 批量导入导出 | import-export | 导入用 `<input type="file">` 选择文件后模拟解析，导出用 Blob + a.click 触发 CSV 下载；实际数据走 mock | mock 初始导入结果 |
| 审批操作（开户/采购/退款等） | demo-mock | 前端模拟审批 Dialog，提交后更新本地 state 中的状态字段 + ElMessage 反馈 | ✅ 本身就是 mock |
| CRUD 操作（新建/编辑/删除） | demo-mock | 前端操作本地 mock 数组（unshift/splice/map），ElMessage 提示成功 | ✅ 本身就是 mock |

---

## 功能列表

### 通用功能（全局/布局）

- **页面目标**: 提供统一的系统框架和交互规范
- **功能点**:
  - **左侧导航折叠/展开**: 点击顶部折叠按钮切换 Sidebar 宽度，折叠后仅显示图标，状态存入 localStorage
  - **全局搜索联想**: 输入关键词时下拉展示匹配的客户/合同/订单/员工结果，支持键盘上下选择，点击跳转对应详情页
  - **消息通知下拉**: 点击铃铛图标展开通知面板，含系统通知/审批提醒/预警信息三类 Tab，带未读红点
  - **用户头像下拉**: 展示个人中心/修改密码/退出登录，退出后清除 localStorage 并跳转登录页
  - **面包屑导航**: 根据当前路由自动生成面包屑路径，支持点击回退
  - **i18n 中英文切换预留**: 建立 vue-i18n 基础配置和语言包结构（默认中文，英文文案可部分翻译）

### 登录页

- **页面目标**: 用户身份验证入口
- **功能点**:
  - **登录方式 Tab 切换**: 账号密码登录 / 飞书授权登录两个 Tab 切换
  - **账号密码登录**: 用户名、密码必填校验，记住我勾选，登录成功写入 Pinia + localStorage 并跳转工作台
  - **飞书授权登录模拟**: 点击飞书登录按钮，直接模拟授权成功并进入系统（无真实 OAuth）
  - **品牌展示区**: 左侧展示系统名称「牧唐数智一体化」+ 几何渐变装饰图形

### 工作台（管理看板）

- **页面目标**: 数据驾驶舱，全局业务概览
- **功能点**:
  - **核心指标卡展示**: 5 个 KPI 卡片（昨日消耗/昨日赠款/本周消耗/本月消耗/本月新开单），大数值 + 环比增长率（绿色上升/红色下降）+ 图标
  - **今日实时消耗**: 内部端口/外部端口/集团三类数值展示，右上角显示更新时间和刷新按钮
  - **图表区时间维度切换**: 今日/本周/本月/本年 Tab 切换，5 个图表（集团消耗环形饼图、商务消耗柱状图、端口利润饼图、部门消耗饼图、端口消耗饼图）数据同步变化
  - **目标详情表格**: 年度/月度目标消耗按部门列展示，完成率用进度条可视化
  - **排行榜多维切换**: 端口维度（全部/内部/外部）+ 时间维度（本周/本月/本年）切换，5 个排行 Tab（商务/集团/端口/行业/新开），前三名奖牌色样式
  - **绩效任务面板**: 部门平均分值展示 + 绩效负责人 + 员工分值列表 + 任务统计卡（总数/已确认/待确认）

### 客户管理 - 公海客资

- **页面目标**: 公海客资池的管理与分配
- **功能点**:
  - **筛选与高级筛选**: 主体名称/客资分层/一级行业/二级行业/分配状态/调入时间/创建人，支持展开收起高级筛选
  - **批量操作**: 批量领取、批量分配、自动分配、批量删除（二次确认），需先勾选行
  - **新建客资**: 弹窗表单，主体名称/分层/行业等必填校验，提交后 ElMessage 成功提示并插入列表顶部
  - **行操作**: 领取、分配、编辑、删除（二次确认），操作后本地状态更新

### 客户管理 - 线索管理

- **页面目标**: 销售线索全生命周期管理
- **功能点**:
  - **筛选与列表**: 线索名称/来源/跟进状态/负责人/创建时间筛选，表格展示线索列表
  - **新建/编辑线索**: 弹窗表单，含线索名称、客户公司、来源、状态、负责人等字段
  - **线索详情与跟进记录**: 详情页含跟进记录时间线，可新增跟进记录
  - **批量分配**: 勾选多条线索后批量分配负责人

### 客户管理 - 客户管理

- **页面目标**: 正式客户档案管理
- **功能点**:
  - **客户列表筛选**: 客户名称/行业/等级/负责商务/部门/状态多条件筛选
  - **新建客户**: 弹窗表单，完整客户信息录入
  - **客户详情标签页**: 基本信息、联系人、关联业务、跟进记录、财务信息 5 个 Tab
  - **批量导入/导出**: 模拟导入弹窗 + 导出 CSV 下载

### 广告业务 - 开户管理

- **页面目标**: 广告账户开户申请与审批
- **功能点**:
  - **开户申请列表**: 申请ID/集团/主体/端口/状态/申请金额等列，状态彩色标签
  - **新建开户申请**: 弹窗表单，端口选择（巨量千川/腾讯广告/磁力引擎等）、行业、申请金额
  - **审批操作**: 点击审批按钮弹出审批意见框，通过/驳回后状态变更
  - **开户详情页**: 申请信息、审批记录、账户信息三个 Tab

### 财务管理 - 核心页面（以收款管理为代表，其他结构类似）

- **页面目标**: 财务各类流水与账户管理
- **功能点**:
  - **流水列表筛选**: 客户名称/交易类型/时间范围等条件筛选
  - **登记收款/开具发票/充值等操作**: 弹窗表单录入，提交后列表新增记录
  - **审批类操作（退款/垫款等）**: 审批 Dialog，通过/驳回后状态更新
  - **端口/银行账户操作**: 充值、扣款、查看明细等行操作
  - **金额格式化**: 所有金额字段千分位分隔 + 2 位小数 + ¥ 符号

### 人资管理 - 员工管理

- **页面目标**: 员工档案与信息管理
- **功能点**:
  - **员工列表**: 工号/姓名/部门/岗位/手机号/入职日期/状态等列
  - **员工详情标签页**: 基本信息、合同信息、薪资信息（脱敏切换按钮）、考勤记录
  - **新建/编辑员工**: 弹窗表单录入员工信息

### 行政管理 - 采购申请

- **页面目标**: 采购申请与审批流程
- **功能点**:
  - **采购申请列表**: 申请事由/申请人/部门/预计金额/状态/申请时间
  - **新建申请**: 弹窗表单录入采购需求
  - **审批操作**: 审批通过/驳回按钮，弹出意见框，提交后状态变更

### 任务中心 - 我的待办

- **页面目标**: 统一待办事项入口
- **功能点**:
  - **待办分类 Tab**: 全部/待处理/已处理，顶部待处理数量统计卡
  - **待办列表**: 任务类型彩色标签（开户审批/合同审批/采购审批等）、标题、发起人、时间、状态
  - **处理操作**: 点击处理弹出对应审批 Dialog，完成后移入已处理

### 系统管理 - 角色权限

- **页面目标**: 系统角色与权限配置
- **功能点**:
  - **左侧角色列表**: 角色名称列表，支持新增/编辑/删除角色
  - **菜单权限树形勾选**: 树形结构展示所有菜单，勾选分配权限
  - **数据权限配置**: 单选（全部数据/本部门及下级/本部门/仅本人）
  - **字段级权限表格**: 表格勾选各字段的可见/编辑权限

### 业务支持 - 行业大盘

- **页面目标**: 行业数据趋势与分析
- **功能点**:
  - **时间维度切换**: 顶部切换今日/本周/本月/本年，图表数据联动变化
  - **行业消耗趋势折线图**: 多行业折线对比
  - **流量成本变化柱状图**: CPC 等成本指标柱状展示
  - **行业消耗占比饼图**: 各行业消耗占比环形图

### 素材库

- **页面目标**: 广告素材管理
- **功能点**:
  - **卡片/列表视图切换**: 两种展示模式切换
  - **素材卡片**: 缩略图（色块占位）+ 名称 + 类型标签 + 曝光/点击/转化数据
  - **筛选与搜索**: 素材类型/平台/关联客户筛选

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_mutang_user` | 当前登录用户信息，类型为 `IUserInfo` | 全局（顶栏、各页面） |
| `__global_mutang_sidebarCollapsed` | 侧边栏折叠状态，类型为 `boolean` | 全局布局 |
| `__global_mutang_menuList` | 完整菜单配置，类型为 `IMenuItem[]` | Sidebar 组件 |
| `__global_mutang_notifications` | 消息通知列表，类型为 `INotification[]` | 顶部通知铃铛 |
| `__global_mutang_searchHistory` | 搜索历史，类型为 `string[]` | 全局搜索框 |

```ts
// 用户信息
interface IUserInfo {
  id: string;
  username: string;
  name: string;
  avatar: string;
  department: string;
  role: string;
  token: string;
}

// 菜单项
interface IMenuItem {
  id: string;
  title: string;
  path: string;
  icon?: string;
  children?: IMenuItem[];
}

// 通知消息
interface INotification {
  id: string;
  type: 'system' | 'approval' | 'warning';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}
```

---

## 技术选型与代码结构要求

- **框架**: Vue3 + 组合式 API（`<script setup>`）
- **UI 组件库**: Element Plus（深度定制主题色，摆脱默认模板感）
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **图表库**: ECharts 5
- **国际化**: Vue I18n（预留框架）
- **目录结构**:
  - `src/views/` — 按模块分子目录（dashboard/customer/advertising/...）
  - `src/components/` — 公共组件（Layout、PageTable、StatusTag、AmountDisplay 等）
  - `src/composables/` — 可复用逻辑（useTable、useForm 等）
  - `src/mock/` — 各模块模拟数据
  - `src/stores/` — Pinia store（user、app、notification）
  - `src/router/` — 路由配置与菜单配置
  - `src/utils/` — 工具函数（金额格式化、日期格式化等）
  - `src/styles/` — 全局样式、Element Plus 主题覆盖

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Mood Reference —— 参考飞书、Linear 的设计语言气质，迁移信息密度、圆角克制、浅选中底和柔阴影等特征，不照搬品牌色或组件细节。
- **核心情绪 / 应用类型**: 广告代理业务一体化 ERP，专业、干净、有呼吸感的企业级数据密集型后台。
- **独特记忆点**: 深青点缀商务蓝的双主色层次 + 指标卡左侧极细色条 + 排行榜前三名奖牌色渐变标识。

## 2. Art Direction

- **方向名**: 商务蓝深青 SaaS
- **Design Style**: Swiss Minimalist + Flat Design —— 信息密度高但层级清晰，克制的圆角与阴影，适合广告代理 ERP 多表格、多图表、多模块的使用场景。
- **DNA 参数**: 圆角 8-12px 克制 / 阴影 subtle 单层柔影 / 间距 standard 舒展 / 字体方向 中性无衬线 / 装饰手法 左侧色条、极细分隔线、指标图标
- **应用类型**: Workflow —— 左侧导航 + 顶栏 + 主内容区卡片式布局。

## 3. Color System

**色彩关系**: 商务蓝主色 + 深青点缀 + 冷灰中性底，accent 采用主色极浅蓝灰，border 为低饱和冷灰线。
**配色设计理由**: primary 承担主行动、CTA、当前菜单项和关键状态；深青 teal 作为第二强调色用于利润、增长、端口利润等正面业务语义；中性色分三级文字层级保证长表格可读性。
**主色推导**: 从广告代理行业的专业信任语义出发，选用 #1677FF 附近的商务蓝作为 primary，辅以深青 #0D9488 作点缀，避开紫色系，与飞书/Linear 的冷调专业感对齐。
**使用比例**: 65% 中性 / 25% 辅助蓝灰 / 10% primary + 深青；primary 只用于主按钮、当前页、关键状态标签和链接，不同时铺满 tab 激活、icon、边框和图表。

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(210 20% 97%) | 页面浅灰底 #F5F7FA |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 纯白卡片承载面 |
| text | `--foreground` | `text-foreground` | hsl(215 15% 14%) | 标题正文 #1D2129 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(215 10% 45%) | 辅助文字 #4E5969 级 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(216 100% 55%) | 商务蓝 #1677FF |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | 主色上纯白文字 |
| accent | `--accent` | `bg-accent` | hsl(216 100% 96%) | 主色浅底，hover/选中 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(216 100% 40%) | accent 上的主色文字 |
| border | `--border` | `border-border` | hsl(216 10% 90%) | 细边框 #E5E6EB |

**语义色提示**: 
- 成功/增长: hsl(173 80% 32%)，三态 bg: hsl(173 70% 95%) / border: hsl(173 60% 85%) / text: hsl(173 80% 30%) —— 深青色，与主色冷调一致，用于上升箭头、已通过、回款完成
- 警告: hsl(38 90% 50%)，三态 bg: hsl(45 90% 95%) / border: hsl(40 85% 85%) / text: hsl(38 90% 48%) —— 中饱和度琥珀，用于待处理、审批中
- 错误/下降: hsl(4 85% 58%)，三态 bg: hsl(4 80% 96%) / border: hsl(4 75% 88%) / text: hsl(4 85% 55%) —— 下降箭头、驳回、风险状态
- 图表色序: 主蓝 → 深青 → 靛蓝 → 琥珀 → 灰紫 → 青绿，均控制饱和度 45-65%，与 primary 色温对齐

## 4. 字体与节奏

- **font-display**: Noto Sans SC 600/700 —— 现代清晰的中文黑体，适配企业级 SaaS 的专业气质，数字与字母紧凑易读
- **font-body**: Noto Sans SC 400/500 —— 长表格和表单正文的主力字体，中宫舒展，长时间阅读不累
- **字号**: H1 text-2xl；H2 text-lg；H3 text-base；body text-sm (14px)；muted text-xs。高密度后台以 14px 正文为主。
- **圆角**: 克制 8-12px —— 卡片 12px，按钮 8px，输入框 8px，标签 6px。

## 5. 全局布局契约

- **Reference Layout Use**: Mood Reference，参考飞书/Linear 的信息密度、卡片节奏和选中态浅底样式；具体模块布局按需求文档 11 个模块结构推导。
- **Page / Section Order**: 与需求文档 11 个一级模块 + 二级/三级菜单 1:1 对齐，工作台为首页。
- **Standard Content Zone**: 后台 `max-w-[1400px]` + `mx-auto`，工作台和宽表格页可扩展到 `max-w-[1600px]`。
- **Shell / Frame Alignment**: 左侧导航 + 顶部固定导航栏 + 主内容区独立滚动，内容容器与框架同宽节奏。
- **Padding & Rhythm**: 主内容区 `p-6`，卡片内 `p-5`，卡片间距 `gap-5`，筛选区与表格间距 `mb-4`，保持 4px 倍数。
- **Full-bleed Zones**: 登录页品牌区、工作台顶部统计卡可突破内容区；普通列表页受标准宽度约束。
- **Local Narrowing**: 表单页、设置页、详情正文在卡片内收窄为两列或三列表单布局，不改变外层容器宽度。
- **Overflow Strategy**: 宽表格、排行榜、时间轴使用 `overflow-x-auto`，图表卡片自适应容器宽度。
- **Flexibility Boundary**: 允许移动端折叠导航、卡片堆叠、表格横向滚动；不允许改变主色、圆角、阴影和中性色层级。

## 6. 视觉与动效

- **装饰**: 左侧色条指标卡 + 极细分隔线 + 奖牌色排行标识
- **阴影/边界**: 轻 —— 卡片 `shadow-sm`，hover 时 `shadow-md`，弹层 `shadow-lg`；边界以 1px 细边为主，阴影只做层级提示
- **动效**: 克制 —— hover 背景色过渡 150ms，tab 切换平滑过渡，图表入场淡入；无多余弹跳或缩放动效

## 7. 组件原则

- 按钮三档：Primary（填充主色）、Default（白底+边框）、Text（文字+hover浅底）；尺寸以 default 为主，小型用于表格行内
- 表格：表头浅灰底 + 极细分隔线，行高适中（48px），斑马纹可选，选中行用 accent 浅底
- 状态标签：圆角 6px，小字号 12px，对应语义色的 bg/border/text 三态
- 表单：分组卡片式，标签右对齐或顶对齐，必填红星，校验错误红色文字+边框
- 菜单：白底侧边栏 + 右侧细边，选中项 accent 浅底 + primary 文字 + 左侧 3px 主色竖条
- 加载与空状态：延续卡片视觉，空状态带简约图标和引导按钮，不使用默认占位图

## 8. Image Direction

- **Image Role**: 登录页左侧品牌展示区背景 + 空状态简约插画 + 素材库缩略图占位
- **Image Art Direction**: 登录页品牌区采用几何抽象风格，蓝色与深青的渐变几何图形叠加，低透明度柔和发光，构图偏右上留白给系统名称文字；空状态插画为线性简约风，细线勾勒业务场景（客户、广告、报表），配色与主色系一致；素材库缩略图用渐变色块占位，不同类型对应不同色向（图片类蓝青渐变、视频类靛紫渐变）
- **Image Prompt Keywords**: 抽象几何渐变、商务蓝深青、柔光发光、极简线条插画、广告业务场景、低透明度叠加、留白构图、冷调色温
- **Image Avoidance**: 避免商务人物握手素材图、避免 3D 科技感地球/大数据粒子、避免高饱和撞色渐变、避免卡通吉祥物风格

## 9. Anti-patterns

- **Element Plus drift**: 直接使用 Element Plus 默认蓝、默认圆角和默认卡片样式，失去飞书/Linear 质感；必须覆盖主题变量，统一为商务蓝 + 8-12px 圆角 + 轻阴影。
- **Primary everywhere**: 主按钮、tab 激活、菜单图标、表格边框、链接、图表全用主色；按 65-25-10 比例把 primary 收回到 CTA 与当前态，其余用 accent 和中性色。
- **Purple invasion**: 图表或状态标签大面积使用紫色；深青和靛蓝作为第二强调色，禁止紫色进入主视觉。
- **Dense clutter**: 为了塞更多字段把卡片内边距压到 12px 以下、行高压到 36px 以下；保持呼吸感，信息过多用列显隐和横向滚动解决。
- **Status color overload**: 成功/警告/错误色饱和度过高、面积过大；语义色饱和度与 primary 对齐 ±15%，只在标签和图标上小面积使用。
- **Invisible focus**: 只做 hover 态，忽略键盘 focus-visible；所有可交互元素必须有清晰的 focus 环或背景变化。