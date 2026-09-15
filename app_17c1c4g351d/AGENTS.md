# 电商商家智能数据复盘 - 需求拆解文档

## 产品概述

- **产品类型**: 电商数据复盘管理后台
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 淘宝/抖音/拼多多等平台的中小电商商家和运营人员
- **核心价值**: 一站式整合多维度经营数据，提供可视化分析与 AI 智能诊断，帮助商家快速复盘经营状况、发现问题、辅助决策
- **界面语言**: 中文
- **主题偏好**: 浅色（蓝色/青色为主色调，专业商务风格）
- **导航模式**: 路径导航
- **导航布局**: Sidebar（左侧导航栏 + 顶部栏布局）

---

## 页面结构总览

> **说明**：此表为页面生成的唯一数据源，包含所有页面（一级+二级）

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 经营总览 | `DashboardPage.tsx` | `/` | 一级 | 导航 |
| 商品分析 | `ProductAnalysisPage.tsx` | `/products` | 一级 | 导航 |
| 流量与投放 | `TrafficPage.tsx` | `/traffic` | 一级 | 导航 |
| 客户分析 | `CustomerPage.tsx` | `/customers` | 一级 | 导航 |
| 售后管理 | `AfterSalePage.tsx` | `/aftersale` | 一级 | 导航 |
| 库存管理 | `InventoryPage.tsx` | `/inventory` | 一级 | 导航 |
| AI 智能复盘助手 | `AIReviewPage.tsx` | `/ai-review` | 一级 | 导航 |

---

## 页面布局建议

> **说明**：本应用为数据管理后台，各页面均采用「顶部统计卡片 + 下方图表/表格混合区」的标准 Dashboard 布局模式。AI 复盘页为工具类，需特别说明布局。

### 通用布局（经营总览/商品分析/流量与投放/客户分析/售后管理/库存管理）
- **布局模式**: 上下分区（顶部 KPI 卡片行 + 下方多区块内容网格）
- **视觉重心**: 数据指标与图表
- **结果承载区**: 各图表区和表格区；初始态直接渲染 mock 数据

### AI 智能复盘助手页
- **布局模式**: 左右分栏（左侧历史复盘列表 + 右侧主内容区）
- **视觉重心**: 右侧复盘报告内容与 AI 对话窗口
- **结果承载区**: 右侧主区域展示复盘报告全文 + 智能诊断卡片 + 对话窗口；初始态显示"点击生成今日复盘"空状态 + 最近一条历史复盘摘要

---

## 插件规划

| 插件实例名称 | 基于官方插件 | 业务用途 | 输出模式 | 所属页面 |
|------------|-----------|---------|---------|---------|
| ai-review-generator | ai-text-generate | 生成自然语言复盘报告（经营概况、亮点、问题、建议） | stream | AI 智能复盘助手 |
| ai-diagnosis-generator | ai-text-generate | 生成 AI 智能诊断结论卡片 | stream | AI 智能复盘助手 |
| ai-chat-assistant | ai-text-generate | AI 对话窗口，回答商家经营数据相关问题 | stream | AI 智能复盘助手 |

---

## 导航配置

- **导航布局**: Sidebar（左侧导航栏）+ Topbar（顶部栏）
- **导航项**（仅一级页面）:

| 导航文字 | 路由 | 图标 |
|---------|------|------|
| 经营总览 | `/` | BarChart3 |
| 商品分析 | `/products` | Package |
| 流量与投放 | `/traffic` | TrendingUp |
| 客户分析 | `/customers` | Users |
| 售后管理 | `/aftersale` | Headphones |
| 库存管理 | `/inventory` | Warehouse |
| AI 智能复盘助手 | `/ai-review` | Sparkles |

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 经营总览指标与图表数据 | demo-mock | `src/data/dashboard.ts` 定义近30天 GMV/订单/渠道/异常提醒 mock 数据 | ✅ 本身就是 mock |
| 商品分析数据 | demo-mock | `src/data/products.ts` 定义 15-20 个商品的销量/利润/转化率等 mock 数据，含分类覆盖服装/美妆/食品/家居 | ✅ 本身就是 mock |
| 流量投放数据 | demo-mock | `src/data/traffic.ts` 定义 4 个投放渠道效果数据 + 高转化素材/关键词 mock | ✅ 本身就是 mock |
| 客户分析数据 | demo-mock | `src/data/customers.ts` 定义 20 条客户记录 + RFM 分层 + 复购率趋势 mock | ✅ 本身就是 mock |
| 售后管理数据 | demo-mock | `src/data/aftersale.ts` 定义 10-15 条售后工单 + 原因分类 + 退款率趋势 mock | ✅ 本身就是 mock |
| 库存管理数据 | demo-mock | `src/data/inventory.ts` 定义各商品库存/安全库存/销量/可售天数 mock | ✅ 本身就是 mock |
| AI 复盘报告生成 | real-plugin | capabilityClient.callStream 调 ai-review-generator 实例，传入当日经营数据上下文，流式输出复盘报告文本 | 失败提示 (toast "AI 复盘服务暂不可用") |
| AI 智能诊断结论 | real-plugin | capabilityClient.callStream 调 ai-diagnosis-generator 实例，传入异常指标数据，流式输出诊断结论列表 | 失败提示 (toast "AI 诊断服务暂不可用") |
| AI 对话问答 | real-plugin | capabilityClient.callStream 调 ai-chat-assistant 实例，传入用户问题 + 数据上下文，流式输出回答 | 失败提示 (toast "AI 助手暂不可用") |
| 历史复盘报告记录 | local-persist | localStorage key=`__app_ecom_review_history`，存储生成过的复盘报告列表 | 无 |

> 类型选择 + 兜底约束见上方"数据来源声明方法论"段。含「插件规划」章节，对应行 type=`real-plugin`，mock 兜底列均为失败提示，无具体可执行 mock 值，符合插件铁律。

---

## 功能列表

### 页面: 经营总览（Dashboard）
- **页面目标**: 展示核心经营指标与趋势，一眼掌握当日经营状况和异常情况
- **功能点**:
  - **展示核心 KPI 卡片**: 6 个指标（GMV、订单量、客单价、转化率、退款率、毛利率），显示当日数值 + 环比变化百分比，上升绿色、下降红色
  - **展示 GMV 与订单量趋势**: 近 30 天双 Y 轴折线图，原生图表渲染（非图片）
  - **展示渠道 GMV 占比**: 环形饼图，4 个渠道（自然流量、直通车、千川、达人带货）
  - **展示异常指标提醒列表**: 退款率超标、库存不足等异常项，红色/橙色高亮警示

### 页面: 商品分析
- **页面目标**: 分析商品表现，识别爆款与滞销品，辅助选品和库存决策
- **功能点**:
  - **展示商品统计卡片**: 商品总数、爆款数、滞销数、平均利润率 4 个顶部指标
  - **商品排行榜表格展示与排序**: 展示商品名称/分类/销量/销售额/成本/利润/利润率/转化率/状态标签，支持按销量/销售额/利润点击表头排序
  - **展示滞销预警区**: 连续 7 天零销量商品列表，红色高亮警示
  - **单品利润自动核算**: 按公式「利润 = 售价 - 成本 - 平台佣金(5%) - 运费 - 退款损耗」计算，数据层预计算后展示

### 页面: 流量与投放
- **页面目标**: 评估各投放渠道效果，辅助投放预算分配和 ROI 优化
- **功能点**:
  - **展示渠道效果对比表**: 渠道名称/花费/点击量/点击率/转化率/GMV/ROI，支持按 ROI 等字段排序
  - **展示渠道 ROI 对比柱状图**: 4 个渠道 ROI 横向对比，原生图表渲染
  - **投放 ROI 计算器工具**: 输入花费、客单价、转化率，实时计算盈亏平衡 ROI 和预期收益并展示结果
  - **展示高转化素材/关键词排行榜**: 表格展示 Top 素材和关键词的转化表现

### 页面: 客户分析
- **页面目标**: 了解客户结构与价值，识别高价值客户和复购趋势
- **功能点**:
  - **展示客户分层统计卡片**: 新客数、老客数、沉睡客数、高价值客数 4 个指标
  - **展示 RFM 客户分层饼图**: 按 RFM 模型分层的客户占比环形图
  - **展示复购率趋势折线图**: 近 6 个月复购率变化趋势
  - **展示客户生命周期价值(LTV)统计**: 以数字卡片形式展示 LTV
  - **展示客户列表表格**: 客户 ID/首购日期/累计消费/购买次数/最后购买日期/客户标签，支持排序

### 页面: 售后管理
- **页面目标**: 监控售后状况，分析退款原因，识别高退款商品
- **功能点**:
  - **展示售后概览卡片**: 今日售后单数、退款率、平均处理时长、超时单数 4 个指标
  - **展示售后原因分类柱状图**: 质量问题/物流问题/描述不符/七天无理由/其他 5 类对比
  - **展示退款率趋势折线图**: 近期退款率变化趋势
  - **展示高退款商品预警列表**: 退款率高的商品排名，橙色/红色高亮
  - **展示售后工单表格**: 工单编号/订单号/商品/售后原因/退款金额/状态/处理时长/是否超时，超时行标红

### 页面: 库存管理
- **页面目标**: 监控库存水平，预警缺货和滞销，辅助补货决策
- **功能点**:
  - **展示库存概览卡片**: SKU 总数、预警商品数、滞销库存占比、库存总金额 4 个指标
  - **展示库存预警列表**: 商品/当前库存/安全库存/近 7 天日均销量/可售天数，可售天数 < 3 天整行标红
  - **展示库存周转表格**: 商品/库存/近 30 天销量/可售天数/建议补货量
  - **展示滞销库存占比饼图**: 滞销库存 vs 正常库存占比环形图

### 页面: AI 智能复盘助手
- **页面目标**: 通过 AI 自动生成经营复盘报告和诊断建议，降低商家数据分析门槛
- **功能点**:
  - **生成今日复盘**: 点击顶部按钮，调用 AI 流式生成包含「今日经营概况、亮点、问题、建议」的自然语言复盘报告，实时展示生成过程
  - **历史复盘报告列表**: 左侧列表展示历史生成的日报/周报，支持 Tab 切换日报/周报，点击可查看完整报告
  - **展示智能诊断卡片**: 3-5 条 AI 诊断结论卡片，涵盖转化率、库存、投放 ROI 等维度，带图标和建议
  - **AI 对话窗口**: 底部输入框可输入问题（如"上周哪个品利润最高"），调用 AI 流式返回模拟回答，支持多轮对话展示
  - **历史记录持久化**: 生成的复盘报告保存至 localStorage，刷新后仍可查看

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_ecom_products` | 商品基础信息列表，类型为 `IProduct[]` | 商品分析、库存管理、售后管理 |
| `__global_ecom_dailyStats` | 近 30 天每日经营数据，类型为 `IDailyStat[]` | 经营总览、AI 智能复盘助手 |
| `__global_ecom_customers` | 客户列表，类型为 `ICustomer[]` | 客户分析 |
| `__global_ecom_aftersale` | 售后工单列表，类型为 `IAfterSaleOrder[]` | 售后管理 |
| `__global_ecom_inventory` | 库存数据列表，类型为 `IInventoryItem[]` | 库存管理、经营总览（异常提醒） |
| `__app_ecom_review_history` | AI 复盘历史报告，类型为 `IReviewReport[]` | AI 智能复盘助手 |

```ts
interface IProduct {
  id: string;
  name: string;
  category: '服装' | '美妆' | '食品' | '家居';
  price: number;
  cost: number;
  shippingCost: number;
  refundLossRate: number;
  salesVolume: number;
  salesAmount: number;
  profit: number;
  profitMargin: number;
  conversionRate: number;
  status: '爆款' | '潜力款' | '滞销款';
  daysZeroSales: number;
}

interface IDailyStat {
  date: string;
  gmv: number;
  orders: number;
  avgOrderValue: number;
  conversionRate: number;
  refundRate: number;
  grossMargin: number;
  channelBreakdown: {
    natural: number;
    directTrain: number;
    qianchuan: number;
    influencer: number;
  };
}

interface ICustomer {
  id: string;
  firstPurchaseDate: string;
  totalSpent: number;
  purchaseCount: number;
  lastPurchaseDate: string;
  rfmScore: number;
  tag: '新客' | '老客' | '沉睡客' | '高价值客';
}

interface IAfterSaleOrder {
  id: string;
  orderNo: string;
  productId: string;
  productName: string;
  reason: '质量问题' | '物流问题' | '描述不符' | '七天无理由' | '其他';
  refundAmount: number;
  status: '待处理' | '处理中' | '已完成' | '已拒绝';
  processDuration: number; // 小时
  isOverdue: boolean;
}

interface IInventoryItem {
  productId: string;
  productName: string;
  currentStock: number;
  safetyStock: number;
  avgDailySales7d: number;
  avgDailySales30d: number;
  daysAvailable: number;
  suggestedRestock: number;
  isSlowMoving: boolean;
}

interface IReviewReport {
  id: string;
  date: string;
  type: 'daily' | 'weekly';
  summary: string;
  highlights: string[];
  issues: string[];
  suggestions: string[];
  fullContent: string;
  createdAt: string;
}

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Mood Reference —— 参考飞书妙搭/多维表格仪表盘的简洁专业气质与信息密度，不照搬品牌元素
- **核心情绪 / 应用类型**: 中小电商商家日常数据复盘工具，追求"一眼看清经营状况、快速定位问题"的专业信任感与效率感
- **独特记忆点**: 数据卡片采用"左色条 + 主数字 + 环比小标签"结构，异常指标用橙色左侧竖条预警，AI复盘页用青色渐变区分智能功能区

## 2. Art Direction

- **方向名**: 妙搭极简数据风
- **Design Style**: Swiss Minimalist + Flat Design —— 高密度数据看板需要克制清晰的视觉语言，飞书妙搭风格强调信息优先、轻装饰、强层次
- **DNA 参数**: 圆角 subtle(`rounded-md`) / 阴影 subtle(`shadow-sm` + 极淡 border) / 间距 standard(`gap-4` / `p-5`) / 字体方向 无衬线清晰易读 / 装饰手法 左侧细色条 + 极细分割线
- **应用类型**: Dashboard —— 左侧导航 + 顶部栏 + 卡片网格 + 图表 + 表格的典型数据后台布局

## 3. Color System

**色彩关系**: 青蓝色主色 + 极浅青灰反馈底 + 纯白卡片背景 + 深墨灰正文
**配色设计理由**: 青蓝传达专业、可信、冷静的数据复盘气质；极浅青灰用于hover/选中/骨架屏，保持界面呼吸感；纯白卡片提升数据可读性；语义色（成功绿/警告橙/错误红）饱和度与主色对齐，避免刺眼
**主色推导**: 从电商运营"数据洞察、专业决策"语义出发，选择青蓝色系(200°色相)，比纯蓝更灵动，比纯绿更商务，契合飞书妙搭的清爽专业感
**使用比例**: 65% 中性(白/灰底 + 深灰文字) / 25% 辅助(浅青灰accent + 边框) / 10% primary(青蓝主色用于CTA、激活态、关键数字)；主按钮、tab激活、icon、边框、图表系列不同时使用primary

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(210 40% 98%) | 页面背景，极浅青灰 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 卡片、表格、图表容器 |
| text | `--foreground` | `text-foreground` | hsl(215 28% 17%) | 标题、正文、主数字 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(215 16% 47%) | 辅助说明、元信息、次要标签 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(201 90% 45%) | 青蓝主色，主行动、激活页、关键高亮 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | primary上的文字图标 |
| accent | `--accent` | `bg-accent` | hsl(200 25% 96%) | hover/focus浅底、选中底、骨架屏 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(201 90% 35%) | accent上的文字图标，深一级青蓝 |
| border | `--border` | `border-border` | hsl(214 20% 90%) | 卡片、输入框、表格分割线 |

**语义色提示**:
- 成功(上升/爆款/达标): bg hsl(145 60% 95%) / border hsl(145 55% 80%) / text hsl(145 65% 32%) —— 饱和度与primary对齐，偏绿
- 警告(预警/潜力/接近阈值): bg hsl(32 95% 95%) / border hsl(32 90% 80%) / text hsl(28 90% 40%) —— 饱和度与primary对齐，偏橙
- 错误(下降/滞销/超时/低于阈值): bg hsl(0 75% 96%) / border hsl(0 70% 85%) / text hsl(0 70% 42%) —— 饱和度与primary对齐，偏红
- 图表系列色: primary青蓝 + 浅青 hsl(190 70% 50%) + 暖橙 hsl(28 90% 55%) + 薄荷绿 hsl(155 55% 50%) + 紫罗兰灰 hsl(250 25% 60%)，均保持中低饱和度

## 4. 字体与节奏

- **font-display**: Noto Sans SC —— 中文数据看板首选，清晰中性，数字与汉字混排协调
- **font-body**: Noto Sans SC —— 全栈统一字体，减少阅读切换成本，适合高密度表格与图表标签
- **字号**: 卡片主数字 text-2xl ~ text-3xl font-semibold；页面标题 text-2xl；表格正文 text-sm；辅助说明 text-xs
- **圆角**: 小到中(`rounded-md`, 6px) —— 飞书妙搭风格偏直角但不生硬，保持专业感

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导，参考飞书妙搭的信息密度与卡片组织方式
- **Page / Section Order**: 经营总览 → 商品分析 → 流量与投放 → 客户分析 → 售后管理 → 库存管理 → AI智能复盘助手，与需求文档1:1对齐
- **Standard Content Zone**: `max-w-[1360px]` + `mx-auto`，后台数据看板需要宽画布承载多图表与表格
- **Shell / Frame Alignment**: 左侧导航固定宽220px + 顶部栏高56px，内容区独立网格，与框架同节奏不同宽
- **Padding & Rhythm**: 内容区 `px-6 py-6`，卡片内 `p-5`，卡片间距 `gap-4`（小屏 `gap-3`），保持8px倍数节奏
- **Full-bleed Zones**: 无全宽需求；所有卡片、图表、表格均受内容区约束
- **Local Narrowing**: AI对话窗口可局部收窄为左右分栏（诊断卡片 + 对话区），不影响全局max-w
- **Overflow Strategy**: 商品排行、渠道对比、客户列表、售后工单、库存周转等宽表格使用 `overflow-x-auto`
- **Flexibility Boundary**: 允许移动端卡片堆叠、内边距减半、表格横向滚动；不允许切换主色、圆角、阴影语言或字体

## 6. 视觉与动效

- **装饰**: 左侧细色条(1px~3px) + 极细分隔线 + 数据卡片微悬浮感
- **阴影/边界**: 轻 —— 卡片默认 `shadow-sm` + `border border-border`，hover 时 `shadow-md`，边界为主，阴影为辅
- **动效**: 克制 —— hover状态150ms过渡；数字变化用轻量计数动画；页面切换无入场动效；AI生成用进度条脉冲

## 7. 组件原则

- 指标卡片: 左侧3px主色竖条 + 上方标签(text-sm textMuted) + 中间主数字(text-2xl font-semibold) + 右下环比标签(badge样式，升绿降红)
- 表格: 表头textMuted + 细线分割 + 行高紧凑(h-10) + 异常行整行浅橙/浅红底
- 状态标签: 爆款(绿底绿字) / 潜力款(橙底橙字) / 滞销款(红底红字)，圆角pill，px-2.5 py-0.5 text-xs
- AI复盘卡片: 左侧青色渐变边框 + 小AI图标前缀，与普通数据卡片视觉区分
- 按钮、输入、菜单必须完整覆盖 Default / Hover / Active / Focus-visible / Disabled 状态

## 8. Image Direction

- **Image Role**: 无强制图片需求，优先通过排版、色条、数据可视化和图标建立视觉记忆点
- **Image Art Direction**: 无强制图片需求
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免通用电商素材图、商务人物握手图、无意义数据可视化装饰图

## 9. Anti-patterns

- **Split personality**: AI页面突然变深色或大渐变，其他页面纯白卡片；AI功能只用青色渐变边框和小标识区分，保持卡片系统一致
- **Phantom tokens**: 编造飞书品牌色或不存在的token；所有颜色从定义的9角色+3语义色中选取
- **Default SaaS drift**: 回到默认纯蓝按钮+紫色渐变+卡片堆叠；用青蓝主色+左侧色条+细线分割的妙搭气质贯穿
- **Invisible interaction**: 表格行hover做了，focus-visible丢了；所有可排序表头、可点击行、按钮都要有键盘可见轮廓
- **Mono-hue tyranny**: 主按钮、tab激活、图标、边框、链接、图表全用primary青蓝；primary只给CTA和当前导航，其余用accent/中性色
- **Status color drift**: 错误红和警告橙饱和度过高，与克制的青蓝主色脱节；语义色饱和度控制在55%-75%，与primary(90%饱和)拉开距离但不刺眼