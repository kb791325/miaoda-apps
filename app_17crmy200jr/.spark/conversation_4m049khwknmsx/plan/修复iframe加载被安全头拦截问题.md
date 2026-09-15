## 目标与成功标准
- 应用可以在妙搭平台的 iframe 中正常加载，不再出现 ERR_BLOCKED_BY_RESPONSE (-27) 错误
- 保留必要的安全防护，仅放宽与 iframe 嵌入相关的限制

## 根因
`server/common/middleware/security-headers.middleware.ts` 中的 `SecurityHeadersMiddleware` 对所有响应设置了 `X-Frame-Options: DENY`，导致浏览器拒绝在 iframe 中渲染页面。妙搭平台通过 iframe 嵌入应用预览，因此被拦截。

## 关键实现文件
- `server/common/middleware/security-headers.middleware.ts` — 修改安全响应头配置

## 实现方案

### 1. 移除 X-Frame-Options: DENY
- 删除第 8 行 `X-Frame-Options` 头
- 原因：妙搭平台在 iframe 中加载应用，DENY 会完全阻止；用 CSP 的 `frame-ancestors` 指令替代，更加灵活且是现代标准

### 2. CSP 中添加 frame-ancestors 指令
- 在第 13-16 行的 `Content-Security-Policy` 中追加 `frame-ancestors 'self' https://miaoda.feishu.cn https://*.feishu.cn https://*.feishu-boe.cn;`
- 原因：明确允许妙搭平台域名将应用嵌入 iframe，同时保留其他安全策略不变

### 3. 保留其他安全头不变
- `X-Content-Type-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy` 均保持原样
- CSP 的 `default-src`, `script-src`, `style-src`, `img-src`, `font-src`, `connect-src` 均保持原样

## 具体步骤
1. 编辑 `server/common/middleware/security-headers.middleware.ts`
   - 删除 `res.setHeader('X-Frame-Options', 'DENY');` 这一行
   - 在 CSP 字符串末尾追加 `frame-ancestors 'self' https://miaoda.feishu.cn https://*.feishu.cn https://*.feishu-boe.cn;`
2. 保存文件，devServer 自动重启
3. 验证：访问应用预览页面，确认不再出现 ERR_BLOCKED_BY_RESPONSE 错误

## 影响范围与风险
- 影响范围：仅影响 HTTP 安全响应头配置，不涉及业务逻辑
- 风险：极低。`frame-ancestors` 明确白名单了飞书/妙搭域名，未完全放开 iframe 嵌入
- 兼容性：`frame-ancestors` 是 CSP Level 2 标准，所有现代浏览器均支持；比 `X-Frame-Options` 更灵活，可指定多个允许域名

## 验收标准
1. 应用预览页面正常加载，无 ERR_BLOCKED_BY_RESPONSE 错误
2. 页面内所有功能（导航、表单、API调用）正常工作
3. 响应头中不再包含 `X-Frame-Options: DENY`
4. 响应头 CSP 中包含 `frame-ancestors` 指令及飞书/妙搭域名白名单
5. 其他安全头（X-Content-Type-Options、HSTS 等）保持不变
