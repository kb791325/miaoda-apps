# 牧唐行政资产盘点看板系统

企业行政与资产管理全流程数字化平台，支撑支出管理、固定资产管理、盘点执行与审批决策。

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 前端框架 | React + TypeScript | 19.2 / 5.9 |
| 构建工具 | Vite | 7.3 |
| 样式方案 | Tailwind CSS | 4.1 |
| UI 组件库 | shadcn/ui（Radix 系列） | — |
| 图表 | ECharts + echarts-for-react | 5.6 |
| 表单 | react-hook-form + zod | 7.65 / 3.25 |
| 状态管理 | zustand + React Query | 5.0 / 5.90 |
| 后端框架 | NestJS + TypeScript | 10.4 |
| 数据库 | PostgreSQL + Drizzle ORM | 0.44 |
| 运行时 | Node.js | ≥ 22.0 |

## 功能模块

| 模块 | 路由 | 说明 |
|------|------|------|
| 综合数据看板 | `/dashboard` | 支出/资产/盘点数据总览，含趋势图、分类饼图、排名 |
| 行政支出管理 | `/expenses` | 支出 CRUD、分类联动、审批流程、批量操作 |
| 固定资产管理 | `/fixed-assets` | 资产 CRUD、借用/归还/转移/维修/报废流程 |
| 资产盘点看板 | `/inventory-dashboard` | 盘点矩阵热力图、时间线预警、库存概览 |
| 盘点执行 | `/inventory-checks` | 任务创建、逐项检查、差异确认、完成/重置 |
| 分类管理 | `/categories` | 一二级分类维护、排序 |
| 数据统计与报表 | `/reports` | 支出/资产/盘点三维度分析图表 |
| 预算管理 | `/budget` | 部门预算编制、调整、执行率监控 |
| 角色权限 | `/roles` | RBAC 三级权限（菜单/数据/操作） |
| 通知提醒 | `/notifications` | 预算预警、资产异常、盘点到期 |
| 操作审计 | `/audit-logs` | 操作日志查询 |

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发环境（前后端同时启动，自动热重载）
npm run dev
```

## 构建与部署

```bash
# 构建生产版本
npm run build:prod

# 通过妙搭平台预览窗口触发发布
# 或使用 CLI：
miaoda deploy
```

## 项目结构

```
├── client/src/          # React 前端
│   ├── app.tsx          # 路由定义
│   ├── api/             # 前端 API 调用
│   ├── pages/           # 页面组件（12 个模块）
│   ├── components/      # 通用组件（ui/、business-ui/）
│   ├── hooks/           # 自定义 hooks
│   └── utils/           # 工具函数
├── server/              # NestJS 后端
│   ├── app.module.ts    # 根模块
│   ├── database/        # Drizzle ORM Schema
│   ├── modules/         # 业务模块（16 个）
│   └── common/          # 过滤器、守卫、服务
└── shared/              # 前后端共享类型
    └── api.interface.ts # 接口契约定义
```

## 设计规范

- **风格**：Grid 网格风格，精密仪表盘美学
- **主色**：钢蓝 hsl(215 25% 35%)
- **字体**：Inter + 苹方/微软雅黑，等宽数字 JetBrains Mono
- **圆角**：2px，无阴影，1px border 替代
- 详见 `AGENTS.md` 完整设计指南