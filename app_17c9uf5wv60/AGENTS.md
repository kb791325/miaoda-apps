# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1 为设计意图与决策上下文。Code agent 实现时以 Section 2 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 仓储管理者/运营人员；高频数据决策场景；期望精准、掌控感
- **核心目的**: 数据驱动决策 + 高效执行操作 + 风险预警
- **情绪基调**: 专业可信 / 冷静清晰；避免焦虑感与信息过载

### 1.2 设计方向

- **Design Style**: Grid 网格风格 — 库存系统需高密度数据展示，网格线+角块强化数据结构感与专业度
- **Application Type**: Admin/SaaS — 多模块后台管理系统
- **Aesthetic Direction**: 精密仪器感的数据仪表盘，理性克制中透出智能温度

## 2. Color System (色彩系统)

**色彩关系**: 淡蓝主色 + 冷灰白底 + 深墨文字；统一蓝色系
**配色设计理由**: 淡蓝色清新明快，建立仓储管理信任感，冷灰降低数据密集疲劳度，AI模块统一使用主色强调
**主色推导**: 淡蓝(hsl(205 80% 58%))明快清新，契合现代仓储管理系统的专业与智能感
**使用比例**: 60%冷灰白底 / 30%卡片白+边框 / 10%淡蓝主交互

### 2.1 主题颜色

| Token                | HSL 值             | 说明                       |
| -------------------- | ------------------ | -------------------------- |
| `background`         | hsl(220 20% 97%)   | 冷灰白底，减少长时间注视疲劳 |
| `card`               | hsl(0 0% 100%)     | 纯白卡片承载数据区块       |
| `foreground`         | hsl(220 25% 15%)   | 深墨文字，高可读性         |
| `muted-foreground`   | hsl(220 10% 46%)   | 次要标签与说明文字         |
| `primary`            | hsl(205 80% 58%)   | 淡蓝主交互，关键操作按钮   |
| `primary-foreground` | hsl(215 40% 18%)   | 主按钮深色文字             |
| `accent`             | hsl(205 70% 94%)   | 淡蓝hover/focus反馈背景    |
| `accent-foreground`  | hsl(205 80% 28%)   | accent上的深色文字         |
| `border`             | hsl(220 15% 90%)   | 淡灰边框，定义网格结构     |

### 2.2 导航区配色

- **基调关系**: 左侧Sidebar复用主配色系统，背景略深于content区形成层级
- **关键状态**: 激活态使用`primary`填充+深色字；Hover用`accent`背景；对比度≥4.5:1
- **边界与背景**: 非透明背景hsl(220 20% 96%)；右侧1px border分隔内容区

### 2.3 语义颜色

| 用途     | HSL 值              | 衍生逻辑                     |
| -------- | ------------------- | ---------------------------- |
| 成功/健康 | hsl(152 60% 42%)    | 绿色系，用于盘点正常/健康评分 |
| 警告/关注 | hsl(38 85% 50%)     | 琥珀色，AI模块专属+中度预警  |
| 错误/缺货 | hsl(4 75% 52%)      | 红色系，低于安全库存/异常检测 |
| AI智能   | hsl(205 80% 58%)    | 淡蓝主色，统一AI工具入口     |

## 3. Typography (字体排版)

- **Heading**: Space Grotesk + "Noto Sans SC", system-ui, sans-serif
- **Body**: Inter + "Noto Sans SC", system-ui, sans-serif
- **Mono**: JetBrains Mono + "Noto Sans Mono", monospace（数字/编码/金额专用）
- **字体策略**: Space Grotesk几何感契合Grid风格；等宽字体确保表格数字对齐；中文回退Noto Sans SC保障双语和谐

## 4. Layout Strategy (布局策略)

- **导航意图**: 持久型左侧Sidebar导航（5个页面模块切换频繁）；至多一套全局导航；非透明背景
- **页面架构**: Sidebar + Content双区布局；Content区max-w-[1400px]居中；六宫格图表区采用响应式grid-cols-2/3
- **响应式**: 移动端Sidebar折叠为顶部汉堡菜单；六宫格降级为单列；表单区max-w-2xl保持可读宽度

## 5. Visual Language (视觉语言)

- **形态参数**: 圆角`rounded-sm`(2px) · 阴影`shadow-none` · 间距基调`compact`(gap-3/p-4)
- **识别签名**: ① 1px实线网格边框贯穿所有卡片/表格 ② KPI数值使用JetBrains Mono超大字号(text-3xl)+细字重font-light ③ AI模块标题前缀淡蓝竖线标记 ④ 主色淡蓝(hsl(205,80%,58%))用于所有主交互元素
- **装饰策略**: 仅使用1px网格线+左上角3×3px色块角标；无渐变无投影无插画
- **动效原则**: 即时响应150ms；加载态用骨架屏(skeleton)而非spinner
- **可及性**: 正文对比度≥4.5:1；预警横幅加bg-black/5遮罩确保白字可读；Focus态2px primary outline

## 6. Component Principles (组件原则)

- **状态完整性**: Button/Input/Select覆盖Default/Hover/Focus/Disabled/Error五态；Error态border-red+底部红字提示
- **层级清晰**: Primary按钮淡蓝填充；Secondary按钮白底+border-primary；Ghost按钮仅hover显accent背景
- **一致性**: 所有表格统一border-collapse+1px border-gray-200；KPI卡片统一p-4+左上角色块；状态标签pill形状+hsl语义色背景
- **AI模块特化**: 生成中状态用accent色skeleton；结果表格首列加粗；自然语言查询输入框带左侧搜索图标+右侧示例标签chip

## 7. Image Direction (图片与视觉资产)

- **Image Role**: 无强制图片需求
- **Image Art Direction**: 通过Grid线条、角标色块、等宽数字排版建立精密数据仪表盘的视觉记忆点
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 禁止使用科技感插图、商务人物素材、抽象渐变背景、AI机器人图标

## 8. 应避免 (Anti-patterns)

- ❌ 使用圆角>4px的卡片或按钮（破坏Grid精密感）
- ❌ 图表区域添加装饰性阴影或渐变（干扰数据读取）
- ❌ AI模块使用紫色/粉色等非蓝色强调（丧失智能模块统一识别性）