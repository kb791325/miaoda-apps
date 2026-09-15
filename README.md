# 飞书妙搭应用代码仓库

本仓库整理并备份了所有飞书妙搭（Miaoda）应用的源代码，从妙搭平台 `sprint/default` 分支导出。

## 应用清单

| # | 目录 | 应用名称 | 类型 | 在线地址 |
|---|------|----------|------|----------|
| 1 | `app_17dduqcwmj5` | 飘飘香餐饮培训管理系统 | full_stack | [访问](https://saasuniversity.feishuapp.com/app/app_17dduqcwmj5) |
| 2 | `app_17d6uftukpp` | 牧唐ERP系统 | full_stack | [访问](https://saasuniversity.feishuapp.com/app/app_17d6uftukpp) |
| 3 | `app_17czx1jrsqe` | 牧唐数智一体化ERP | full_stack | [访问](https://saasuniversity.aiforce.cloud/app/app_17czx1jrsqe) |
| 4 | `app_17cxzq035z6` | 爆款视频AI工坊 | full_stack | [访问](https://saasuniversity.aiforce.cloud/app/app_17cxzq035z6) |
| 5 | `app_17cxhjguq7c` | AI视频创作工坊 | frontend | [访问](https://saasuniversity.feishuapp.com/app/app_17cxhjguq7c) |
| 6 | `app_17cvgm53q0p` | 家电订单管理系统 | full_stack | [访问](https://saasuniversity.feishuapp.com/app/app_17cvgm53q0p) |
| 7 | `app_17crmy200jr` | 牧唐行政资产盘点 | full_stack | [访问](https://saasuniversity.aiforce.cloud/app/app_17crmy200jr) |
| 8 | `app_17c9uf5wv60` | 智能库存管理 | full_stack | [访问](https://saasuniversity.feishuapp.com/app/app_17c9uf5wv60) |
| 9 | `app_17c1c4g351d` | 电商商家数据复盘平台 | full_stack | [访问](https://saasuniversity.aiforce.cloud/app/app_17c1c4g351d) |

## 项目结构

每个应用目录为独立的妙搭项目，典型结构如下：

```
app_xxx/
├── client/          # 前端代码（React + Vite + TailwindCSS）
├── server/          # 后端代码（NestJS）
├── shared/          # 共享模块与能力配置
├── scripts/         # 构建与开发脚本
├── skills/          # AI 技能配置
├── package.json     # 项目依赖
└── AGENTS.md        # 项目开发规范
```

> 注：`frontend` 类型应用（如 AI视频创作工坊）仅包含前端代码，无 `server/` 目录。

## 技术栈

- **前端**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **后端**: NestJS + TypeScript（full_stack 类型）
- **构建**: 自定义 scripts + miaoda-cli
- **平台**: 飞书妙搭（Miaoda）低代码/全栈开发平台

## 备份信息

- **导出时间**: 2026-09-15
- **导出分支**: `sprint/default`（妙搭平台主开发分支）
- **导出方式**: 通过 `lark-cli apps` 工具链获取 Git 凭证后导出
- **原始仓库**: 妙搭平台内部 Git（`miaoda-git.feishu.cn`）

## 说明

- 本仓库仅作代码备份与整理，不包含 `node_modules` 等依赖目录
- 各应用的原始 Git 提交历史未保留，如需查看历史请访问妙搭平台
- 应用的运行环境变量、密钥等敏感信息未包含在本仓库中
