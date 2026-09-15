# 安全架构文档

## 1. 安全架构概述

本系统采用纵深防御策略，构建多层安全防护体系，确保应用在认证、授权、数据传输和存储各环节的安全性。

### 分层安全模型

```
网络层 → 应用层 → 数据层
```

- **网络层**：TLS 加密传输、CORS 白名单、速率限制、WAF 防护
- **应用层**：认证鉴权、输入验证、输出编码、CSRF 防护、安全头配置
- **数据层**：加密存储、访问控制、审计日志、定期备份

### 零信任原则

- 所有请求均需认证和授权，不信任任何来源
- 最小权限原则：每个服务和用户仅拥有完成其职责所需的最小权限
- 持续验证：每次请求独立验证身份和权限，不依赖之前的信任状态

### 纵深防御

多层安全机制协同工作，单层失效时其他层仍可提供保护：

1. 网络边界防护（TLS + CORS + 速率限制）
2. 身份认证（飞书 OAuth2.0 + JWT 双令牌）
3. 权限控制（RBAC 三级权限体系）
4. 数据安全（加密 + 审计日志）
5. 运行时防护（输入验证 + XSS/CSRF 防护）

## 2. 认证与授权机制

### 单点登录（SSO）

基于飞书 OAuth2.0 协议实现单点登录：

- 用户通过飞书客户端或飞书 Web 登录
- 飞书开放平台完成身份验证后返回授权码
- 应用后端使用授权码换取用户身份信息
- 首次登录自动创建用户账户并绑定飞书身份

### 双令牌机制

| 令牌类型 | 用途 | 有效期 | 存储位置 |
|---------|------|--------|---------|
| JWT Access Token | 接口请求认证 | 短期（15-30分钟） | 内存/请求头 |
| JWT Refresh Token | 刷新 Access Token | 长期（7-30天） | HttpOnly Cookie |

**令牌刷新流程**：
1. Access Token 过期 → 返回 401
2. 前端使用 Refresh Token 调用 `/api/auth/refresh`
3. 后端验证 Refresh Token 有效后签发新的 Access Token
4. Refresh Token 过期 → 用户需重新登录

### RBAC 角色权限控制

系统预置以下角色层级：

| 角色 | 权限范围 | 说明 |
|------|---------|------|
| 超级管理员 | 全部功能 + 系统配置 | 拥有系统最高权限 |
| 部门主管 | 本部门全部功能 | 管理本部门资产和人员 |
| 财务 | 支出管理 + 报表查看 | 财务相关操作权限 |
| 普通员工 | 个人相关功能 | 基础查询和操作权限 |

### 三级权限体系

1. **菜单权限**：控制用户可见的导航菜单和页面入口
2. **数据权限**：控制用户可访问的数据范围（全部/本部门/仅本人）
3. **操作权限**：控制用户可执行的具体操作（增/删/改/查/审批）

## 3. 数据加密策略

### 传输层

- 所有 HTTP 流量使用 TLS 1.3 加密
- 禁止使用已废弃的加密协议（SSLv2/SSLv3/TLS 1.0/1.1）
- 启用 HSTS（HTTP Strict Transport Security）

### 存储层

- 数据库连接使用 SSL/TLS 加密
- 数据库连接字符串包含 `sslmode=require`
- 禁止明文存储敏感数据

### 应用层

- 用户密码使用 bcrypt 哈希存储（cost factor ≥ 10）
- 会话和 Cookie 使用 HMAC 签名防篡改
- JWT 令牌使用 RS256 或 HS256 算法签名

### 敏感字段清单

| 数据类别 | 加密方式 | 说明 |
|---------|---------|------|
| 用户密码 | bcrypt 哈希 | 不可逆哈希，仅存储哈希值 |
| JWT/Session Token | HMAC 签名 | 防篡改签名验证 |
| Cookie | 签名 + HttpOnly + Secure | 三重防护 |

## 4. 凭据管理规范

### 存储规范

- 所有凭据通过环境变量注入，禁止硬编码
- 禁止将凭据提交到版本控制系统（Git）
- 禁止在日志、错误信息中输出凭据
- 禁止在代码注释、配置文件、文档中存储凭据

### 凭据类型

| 凭据 | 用途 | 轮换周期 | 详细指南 |
|------|------|---------|---------|
| DATABASE_URL | 数据库连接 | 90天 | 见 [credential-rotation.md](./credential-rotation.md) |
| JWT_SECRET | JWT签名 | 60天 | 见 [credential-rotation.md](./credential-rotation.md) |
| JWT_REFRESH_SECRET | 刷新令牌签名 | 60天 | 见 [credential-rotation.md](./credential-rotation.md) |
| SESSION_SECRET | 会话加密 | 30天 | 见 [credential-rotation.md](./credential-rotation.md) |
| COOKIE_SECRET | Cookie签名 | 30天 | 见 [credential-rotation.md](./credential-rotation.md) |
| FEISHU_APP_SECRET | 飞书API认证 | 90天 | 见 [credential-rotation.md](./credential-rotation.md) |
| REDIS_PASSWORD | Redis认证 | 90天 | 见 [credential-rotation.md](./credential-rotation.md) |

### 访问控制

- 凭据访问权限严格限制（仅运维/安全团队）
- 所有凭据访问操作记录审计日志
- 定期审计凭据访问记录

## 5. 安全审计日志

### 日志分类

#### 认证事件日志

- 登录成功/失败（含失败原因和来源IP）
- 登出事件
- 令牌刷新
- 会话过期/失效

#### 授权事件日志

- 角色分配/变更
- 权限点变更
- 越权访问尝试（403错误）

#### 数据访问日志

- 敏感数据读取操作
- 数据批量导出操作
- 数据删除操作

#### 凭据访问日志

- 环境变量读取记录
- 密钥使用记录
- 凭据轮换操作记录

### 日志格式规范

每条日志包含以下字段：

| 字段 | 说明 |
|------|------|
| timestamp | 事件时间戳（ISO 8601） |
| event_type | 事件类型（auth/data/credential/admin） |
| user_id | 操作用户ID |
| action | 具体操作（login/logout/create/delete/read） |
| resource | 操作资源 |
| result | 操作结果（success/failure） |
| ip_address | 请求来源IP |
| user_agent | 客户端信息 |

## 6. 漏洞响应流程

### 响应阶段

1. **发现**：通过监控告警、安全审计或外部报告发现漏洞
2. **评估**：安全团队评估漏洞严重性（CVSS 评分）和影响范围
3. **遏制**：立即采取措施阻止进一步损害（如临时下线受影响功能）
4. **修复**：开发并部署修复方案，通过安全测试验证
5. **恢复**：恢复正常运营，确认所有服务正常运行
6. **复盘**：总结教训，更新安全措施和流程文档

### 严重性分级

| 等级 | 描述 | 响应时间 | 示例 |
|------|------|---------|------|
| P0 - 严重 | 数据泄露、系统完全不可用 | 1小时内 | 数据库被拖库、RCE漏洞 |
| P1 - 高 | 部分功能受损、权限绕过 | 4小时内 | 越权访问、身份伪造 |
| P2 - 中 | 非关键功能受影响 | 24小时内 | XSS漏洞、信息泄露 |
| P3 - 低 | 轻微影响 | 下一迭代 | 配置不当、警告修复 |

## 7. 安全最佳实践

### 依赖管理

- 定期执行 `npm audit` 检查依赖漏洞
- 及时更新存在已知漏洞的依赖包
- 使用 lockfile 锁定依赖版本，防止供应链攻击

### 输入验证

- 使用 `class-validator` + DTO 对所有输入进行白名单验证
- 验证数据类型、长度、格式、范围
- 拒绝不符合预期的输入，而非尝试修复

### 输出编码

- HTML 上下文输出进行实体编码，防止 XSS 攻击
- 使用 React 默认的 JSX 转义机制
- 需要渲染富文本时使用白名单过滤（DOMPurify）

### CSRF 防护

- 使用 SameSite Cookie 属性（`Strict` 或 `Lax`）
- 验证 Origin/Referer 请求头
- 关键操作使用 CSRF Token

### 速率限制

- API 接口启用速率限制，防止暴力破解和 DDoS
- 登录接口：每分钟 5 次
- 普通 API：每分钟 60 次
- 超出限制返回 429 Too Many Requests

### CORS 配置

- 使用白名单机制，仅允许受信任的域名
- 禁止使用 `Access-Control-Allow-Origin: *`
- 精确控制允许的 HTTP 方法和请求头

### 安全头配置

使用 Helmet 中间件配置以下安全响应头：

| 安全头 | 说明 |
|--------|------|
| Content-Security-Policy | 内容安全策略（CSP） |
| X-Content-Type-Options | 禁止 MIME 类型嗅探 |
| X-Frame-Options | 防止点击劫持 |
| X-XSS-Protection | 启用浏览器 XSS 过滤器 |
| Strict-Transport-Security | 强制 HTTPS 连接 |
| Referrer-Policy | 控制 Referrer 信息泄露 |

### 内容安全策略（CSP）

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://static.bytedance.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://open.feishu.cn;
frame-ancestors 'none';
```