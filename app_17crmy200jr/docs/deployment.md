# 部署指南

## 1. 环境要求

| 组件 | 版本要求 |
|------|---------|
| Node.js | ≥ 22.0.0 |
| npm | ≥ 10.0.0 |
| PostgreSQL | 14+ |
| 飞书应用 | 已创建并配置 |

---

## 2. 本地开发部署

### 2.1 克隆项目

```bash
git clone <repository-url>
cd <project-directory>
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 环境变量配置

项目通过妙搭平台的环境变量管理进行配置。关键环境变量：

| 变量 | 说明 |
|------|------|
| 数据库连接 | 由平台自动注入，无需手动配置 |
| 飞书应用凭证 | 通过妙搭 Connection 凭证管理 |

### 2.4 数据库初始化

数据库 schema 由 Drizzle ORM 管理，通过 `miaoda db` 命令执行 DDL 操作：

```bash
miaoda db sql --file <migration.sql>
```

执行后系统自动生成 `server/database/schema.ts`，无需手动编写。

### 2.5 启动开发服务器

```bash
npm run dev
```

前后端开发服务器同时启动：
- 前端：自动分配端口，支持热重载（HMR）
- 后端：自动分配端口，支持热重载（Nodemon）

### 2.6 访问地址

开发环境通过妙搭平台沙箱提供的预览地址访问。预览窗口会自动展示应用。

---

## 3. 生产构建部署

### 3.1 构建命令

```bash
npm run build:prod
```

### 3.2 构建产物

| 产物 | 路径 | 说明 |
|------|------|------|
| 前端构建 | `dist/client/` | Vite 打包的静态资源 |
| 后端构建 | `dist/server/` | NestJS 编译产物 |

### 3.3 妙搭平台发布

通过 `miaoda` CLI 触发发布：

```bash
miaoda deploy
```

发布状态查询：

```bash
miaoda deploy get
miaoda deploy history
```

### 3.4 环境变量配置

生产环境通过妙搭平台的环境变量管理页面配置，与开发环境隔离。

---

## 4. 飞书多维表格配置

### 4.1 创建多维表格

1. 在飞书中创建多维表格（Base）
2. 根据需要创建以下表格：
   - 支出表（expenses）
   - 资产表（fixed_assets）
   - 盘点表（inventory）
   - 类目表（categories）
   - 数据记录表（data_records）

### 4.2 配置表结构

每个表格需要包含与系统字段对应的列。建议字段：

| 业务域 | 关键字段 |
|--------|---------|
| 支出 | 标题、金额、一级类目、二级类目、付款主体、楼层、部门、经办人、状态、日期 |
| 资产 | 名称、类型、状态、楼层、部门、归属人、库存数量、安全阈值、采购日期 |
| 盘点 | 任务名称、盘点月份、状态、范围、进度 |
| 类目 | 一级类目、二级类目、排序号 |

### 4.3 获取 app_token 和 table_id

1. 打开多维表格，从 URL 中获取 `app_token`（`base/` 后面的部分）
2. 进入具体表格，从 URL 中获取 `table_id`（`table/` 后面的部分）

### 4.4 配置同步字段映射

在系统设置 → 飞书同步配置中，为每个业务域配置：

1. **app_token**：多维表格的 Base Token
2. **table_id**：目标表格的 ID
3. **字段映射**：系统字段 ↔ 飞书表格列的对应关系

### 4.5 验证同步

配置完成后，点击"手动同步"按钮，选择同步方向（pull 拉取 / push 推送），观察同步日志确认同步成功。

---

## 5. 运维监控

### 5.1 日志查看

**线上日志查询**：

```bash
miaoda observability log
```

**开发环境日志**：

- 服务端日志：`server-devserver` / `server` 日志源
- 客户端日志：`client-devserver` 日志源
- 浏览器日志：`browser` 日志源

### 5.2 性能监控

```bash
miaoda observability metric
miaoda observability trace
```

### 5.3 运营数据

```bash
miaoda observability analytics
```

### 5.4 备份策略

- 数据库由平台托管，自动备份
- 建议定期导出关键业务数据作为额外备份
- 飞书多维表格作为数据同步副本，提供额外保障

### 5.5 故障排查

| 问题 | 排查方向 |
|------|---------|
| 应用白屏 | 检查前端构建产物是否完整，查看浏览器控制台报错 |
| API 500 错误 | 查看 `server` 日志源，定位异常堆栈 |
| 数据库连接失败 | 联系平台技术支持 |
| 飞书同步失败 | 检查飞书应用权限，确认 app_token 和 table_id 有效 |
| 权限异常（403） | 检查用户角色分配，确认 RBAC 配置正确 |

### 5.6 发布错误排查

```bash
miaoda deploy error-log
```