# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

-   **目标用户**: 企业行政与资产管理人员；高频数据核查、盘点执行与审批决策场景；追求精准、高效、掌控感。
-   **核心目的**: 支撑全流程管理（支出/资产/盘点），通过可视化降低认知负荷，强化异常感知与操作闭环。
-   **情绪基调**: 严谨秩序 / 冷静专业；避免 视觉噪点过多 / 警示信息被淹没 / 廉价SaaS感。

### 1.2 设计方向

-   **Design Style**: Grid 网格风格 — 高密度数据看板需强结构感，网格线+直角边框强化表格/卡片对齐，等宽数字提升盘点/金额可读性。
-   **Application Type**: Admin/SaaS — 经典左侧Sidebar+右侧内容区布局，高视口利用率。
-   **Aesthetic Direction**: 「精密仪表盘」美学：冷灰蓝基底承载数据，锐利线条划分信息区块，语义色仅在状态反馈时点亮。

## 2. Color System (色彩系统)

**色彩关系**: 钢蓝主色(hsl(215 25% 35%)) + 极浅灰蓝背景(hsl(216 20% 97%)) + 墨色文字(hsl(215 30% 12%))，低饱和冷色调营造专业冷静感。
**配色设计理由**: 行政管理后台需长时间使用，低饱和冷灰底减少视觉疲劳；钢蓝主色传递稳重可信感，区别于通用亮蓝SaaS。
**主色推导**: 钢蓝取自企业商务服饰常用色，关联「规范管理」「制度执行」语义，用于主按钮/激活态/图表主序列。
**使用比例**: 60% 背景/卡片白 | 30% 边框/次级文字/分割线 | 10% 钢蓝主色+语义状态色；primary仅出现在CTA按钮、Tab激活、进度条填充。

### 2.1 主题颜色

| Token                | HSL 值                  | 说明                                          |
| -------------------- | ----------------------- | --------------------------------------------- |
| `background`         | hsl(216 20% 97%)        | 页面底色，极浅灰蓝减轻纯白刺眼感              |
| `card`               | hsl(0 0% 100%)          | 卡片/容器背景，纯白与底色形成微层次           |
| `foreground`         | hsl(215 30% 12%)        | 主文字，深墨蓝非纯黑，阅读舒适                |
| `muted-foreground`   | hsl(215 15% 50%)        | 次要文字/占位符                               |
| `primary`            | hsl(215 25% 35%)        | 钢蓝主交互色，沉稳不刺眼                      |
| `primary-foreground` | hsl(0 0% 100%)          | 主按钮文字                                    |
| `accent`             | hsl(216 20% 93%)        | hover/focus背景，比bg稍深的同色系反馈         |
| `accent-foreground`  | hsl(215 30% 12%)        | accent上的文字                                |
| `border`             | hsl(216 15% 88%)        | 边框/分割线，低对比度不抢夺注意力             |

### 2.2 导航区配色

-   **基调关系**: Sidebar复用`card`白色背景，与内容区通过1px `border`右侧分隔，不使用深色侧边栏以避免割裂感。
-   **关键状态**: 激活项=`bg-accent` + `text-primary` + 左侧2px竖条指示器；Hover=`bg-accent`过渡150ms；文字对比度≥4.5:1。
-   **边界与背景**: 非透明背景，右侧1px `border`分隔；底部无额外装饰线。

### 2.3 语义颜色

| 用途       | Border            | Background        | Foreground        | 说明                       |
| ---------- | ----------------- | ----------------- | ----------------- | -------------------------- |
| 成功/已盘点 | hsl(142 60% 45%) | hsl(142 60% 95%) | hsl(142 60% 30%) | 盘点完成、审批通过、正增长 |
| 警告/临期   | hsl(38 90% 50%)  | hsl(38 90% 95%)  | hsl(38 90% 35%)  | 7-30天未盘点、库存接近阈值 |
| 错误/异常   | hsl(0 70% 55%)   | hsl(0 70% 95%)   | hsl(0 70% 40%)   | 盘亏、超期、驳回、库存不足 |
| 信息/进行中 | hsl(215 25% 35%) | hsl(215 25% 95%) | hsl(215 25% 30%) | 审批中、同步中、草稿       |

## 3. Typography (字体排版)

-   **Heading**: Inter, "PingFang SC", "Microsoft YaHei", sans-serif
-   **Body**: Inter, "PingFang SC", "Microsoft YaHei", sans-serif
-   **Mono**: JetBrains Mono, "SF Mono", monospace — 仅用于金额、盘点单号(CK-YYYYMMDD-XXXX)、库存数量、差异值
-   **字体策略**: Inter提供西文几何感与数字清晰度；中文回退苹方/微软雅黑保证跨平台一致；等宽字体强化数据对齐与单号识别。

## 4. Layout Strategy (布局策略)

-   **导航意图**: 应用概要设计已声明左侧Sidebar含8个一级菜单项，原样保留；至多一套全局导航，非透明背景，右侧border分隔。
-   **页面架构**: 左侧固定Sidebar(w-64) + 右侧内容区自适应；内容区`max-w-[1400px] mx-auto p-6`；Dashboard页允许全宽铺满图表区。
-   **响应式**: 桌面端Sidebar常驻；<1024px时Sidebar收起为图标模式或Drawer；移动端隐藏Sidebar仅保留Topbar汉堡菜单。

## 5. Visual Language (视觉语言)

-   **形态参数**: 圆角 `rounded-sm (2px)` · 阴影 `shadow-none`（卡片用1px border替代） · 间距基调 `compact (gap-3/p-4)`
-   **识别签名**: ①所有容器直角或2px微圆角 ②数字/单号强制等宽字体右对齐 ③状态标签使用1px描边+浅色底胶囊样式
-   **装饰策略**: 无渐变/无投影/无插画；仅用1px网格线、左上角色块标记、状态指示灯作为视觉锚点。
-   **动效原则**: 即时反馈，150ms ease-out；Hover/Focus状态切换无延迟；图表切换300ms淡入淡出。
-   **可及性**: 正文对比度≥4.5:1；状态色同时携带文字标签/图标，不依赖纯色区分；热力图单元格支持键盘聚焦与Tooltip。

## 6. Component Principles (组件原则)

-   **状态完整性**: Button/Input/Select/Table行覆盖Default/Hover/Focus/Active/Disabled；Focus态使用2px `ring-primary offset-2`轮廓。
-   **层级清晰**: Primary按钮=`bg-primary text-white`；Secondary=`border-border bg-transparent hover:bg-accent`；Ghost=`hover:bg-accent`无border。
-   **一致性**: 状态标签统一使用语义颜色表的Border/Bg/Fg三件套；金额列永远右对齐+等宽+千分位；日期列统一YYYY-MM-DD格式。
-   **表格特化**: 表头`bg-muted/50 font-medium text-muted-foreground text-xs uppercase tracking-wider`；数据行hover=`bg-accent`；紧凑行高`h-10`。

## 7. Image Direction (图片与视觉资产，按需)

-   **Image Role**: 无强制图片需求，优先通过排版、色彩和局部图形建立视觉记忆点。
-   **Image Art Direction**: 不适用。
-   **Image Prompt Keywords**: 不适用。
-   **Image Avoidance**: 禁止使用通用商务人物剪影、科技感地球/连接线插图、渐变抽象背景；Dashboard不使用Hero图。

## 8. 应避免 (Anti-patterns)

-   ❌ 大面积使用高饱和色块或渐变背景 — 破坏数据看板的冷静专业感，干扰异常状态的语义色识别。
-   ❌ 卡片使用大圆角(≥8px)或明显阴影 — 违背Grid风格的精密秩序感，浪费高密度数据排布空间。
-   ❌ 数字/单号使用比例字体左对齐 — 导致金额列、盘点单号列视觉错位，降低批量扫读效率。