# 爆款视频AI工坊 — 全局研发规范

## 应用概览
"爆款视频AI工坊"是一个一站式视频创作工作台：输入关键词搜索抖音爆款视频 → AI拆解评分 → 批量对比提炼爆款规律 → AI脚本生成 → AI视频制作。

## 技术架构
- 后端：NestJS 10 + PostgreSQL + Drizzle ORM
- 前端：React 19 + TypeScript + Tailwind CSS
- 图表：ECharts（雷达图、折线图、仪表盘）
- AI：平台内置 AI 能力
- 数据源：抖音公开 Web API（含 a_bogus 签名）

## 数据库表
1. 搜索任务（search_tasks）
2. 视频记录（videos）
3. 脚本项目（script_projects）
4. 视频制作（video_productions）
5. 爆款基因（viral_genes）
6. 热搜词（hot_words）

## 设计规范

### 色彩系统（深色科技风）
- 背景主色：`#0a0e27`（深蓝底）
- 背景卡片：`#121738`（深蓝卡片）
- 背景悬浮：`#1a2050`（悬浮态）
- 主色/品牌色：`#6366f1`（紫色渐变起点）
- 强调色：`#00d4ff`（亮青色）
- 成功色：`#10b981`
- 警告色：`#f59e0b`
- 危险色：`#ef4444`
- 文本主色：`#e2e8f0`
- 文本次色：`#94a3b8`
- 文本弱色：`#64748b`
- 边框色：`#1e293b`
- 分割线：`rgba(148,163,184,0.1)`

### 间距规范
- 页面水平内边距：24px
- 卡片内边距：20px
- 元素间距：8/12/16/24px 四级
- 组件间距用 gap 统一控制，不逐个加 margin

### 排版
- 标题字号：text-2xl (24px) / text-xl (20px) / text-lg (18px)
- 正文字号：text-base (14px) / text-sm (12px)
- 行高：leading-tight (1.25) / leading-normal (1.5)
- 字重：标题 font-semibold，正文 font-normal

### 圆角
- 卡片圆角：12px（rounded-xl）
- 按钮圆角：8px（rounded-lg）
- 输入框圆角：8px（rounded-lg）
- 头像圆角：圆形（rounded-full）

### 阴影
- 卡片阴影：`0 4px 20px rgba(0,0,0,0.3)`
- 悬浮阴影：`0 8px 30px rgba(99,102,241,0.2)`

### 页面模块
6个页面：爆款搜索台、拆解与评分中心、AI脚本工坊、AI视频制作、项目库、爆款基因库。

## 模块清单
- douyin（抖音数据获取）
- analyze（AI分析拆解）
- script（AI脚本生成）
- produce（视频制作）
- project（项目库）
- gene（爆款基因库）
