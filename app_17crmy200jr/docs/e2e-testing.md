# E2E 测试指南

## 1. 概述

本项目使用 [Playwright](https://playwright.dev/) 进行端到端（E2E）测试，覆盖核心业务流程：支出管理、固定资产、盘点任务、预算管理等模块。

测试代码位于 `test/e2e/` 目录，包含：

- `helpers/` — 测试辅助函数（认证、API 工厂）
- `smoke.spec.ts` — 冒烟测试，快速验证核心功能可用性

## 2. 环境搭建

### 2.1 前置条件

- Node.js >= 22
- npm >= 10
- PostgreSQL 数据库（本地或远端）

### 2.2 安装依赖

```bash
npm ci
```

### 2.3 配置环境变量

在项目根目录创建 `.env.e2e` 文件（或直接在 CI 中配置）：

```bash
# 应用地址
E2E_BASE_URL=http://localhost:3000

# 测试用数据库连接
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/e2e_test

# CI 标志
CI=true
```

### 2.4 安装 Playwright 浏览器

```bash
npx playwright install --with-deps chromium
```

## 3. 运行测试

### 3.1 命令行模式

| 模式 | 命令 | 说明 |
|------|------|------|
| 默认（headless） | `npm run test:e2e` | 无头浏览器运行，适合 CI |
| 有界面 | `npx playwright test --headed` | 可见浏览器窗口 |
| 单文件 | `npx playwright test smoke.spec.ts` | 运行指定测试文件 |
| 单测试 | `npx playwright test -g "should load dashboard"` | 按名称匹配测试 |

### 3.2 Debug 模式

```bash
# 逐步调试（暂停在每个步骤）
npx playwright test --debug

# 打开 Playwright Inspector
PWDEBUG=1 npx playwright test
```

### 3.3 UI 模式

```bash
npx playwright test --ui
```

浏览器中打开 Playwright 测试运行器，可逐测试查看执行过程、截图和日志。

### 3.4 Codegen

```bash
npx playwright codegen http://localhost:3000
```

录制浏览器操作，自动生成 Playwright 测试代码。

## 4. 编写测试

### 4.1 基本结构

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('功能名称', () => {
  test('测试用例描述', async ({ page }) => {
    // 1. 准备：登录
    await loginAsAdmin(page);

    // 2. 操作：导航到页面
    await page.goto('/expenses');

    // 3. 断言：验证页面标题可见
    await expect(
      page.locator('h1, h2, [data-testid="page-title"]').first(),
    ).toBeVisible();
  });
});
```

### 4.2 页面对象模式

对于复杂页面，建议封装页面对象（Page Object）：

```typescript
// test/e2e/pages/expenses.page.ts
export class ExpensesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/expenses');
  }

  async getTitle() {
    return this.page.locator('[data-testid="page-title"]').first();
  }

  async clickCreate() {
    await this.page.getByRole('button', { name: /新建|创建/ }).click();
  }
}
```

### 4.3 API 辅助函数

测试辅助模块 `helpers/api.ts` 提供了工厂函数用于快速创建测试数据：

```typescript
import { test } from '@playwright/test';
import {
  createApiHelper,
  createTestExpense,
  createTestAsset,
  createTestBudget,
  createTestInventoryTask,
  createBatchTestData,
} from './helpers/api';

test('使用 API 辅助函数', async ({ request }) => {
  const helper = createApiHelper(request);

  // 创建单个测试支出
  const expense = await createTestExpense(helper, {
    amount: 500,
    category: 'travel',
  });

  // 批量创建
  const batch = await createBatchTestData(helper, {
    expenses: [{ amount: 100 }, { amount: 200 }],
    assets: [{ name: 'Laptop' }],
  });
});
```

所有 `createTest*` 函数会自动在数据字段前添加 `[E2E_TEST]` 前缀，便于后续清理。

## 5. 测试数据管理

### 5.1 创建测试数据

使用 `helpers/api.ts` 中的工厂函数：

| 函数 | 接口 | 说明 |
|------|------|------|
| `createTestExpense(helper, data)` | `POST /api/expenses` | 创建测试支出 |
| `createTestAsset(helper, data)` | `POST /api/fixed-assets` | 创建测试资产 |
| `createTestInventoryTask(helper, data)` | `POST /api/inventory-tasks` | 创建测试盘点任务 |
| `createTestBudget(helper, data)` | `POST /api/budgets` | 创建测试预算 |
| `createBatchTestData(helper, data)` | 批量创建 | 一次创建多种测试数据 |

所有数据自动添加 `[E2E_TEST]` 前缀。

### 5.2 清理测试数据

```typescript
import { cleanupTestData } from './helpers/api';

test.afterAll(async ({ request }) => {
  const helper = createApiHelper(request);
  await cleanupTestData(helper, '[E2E_TEST]');
});
```

## 6. CI 集成

### 6.1 GitHub Actions 配置

项目 `.github/workflows/ci.yml` 中已配置 `e2e-test` job：

- **触发条件**：推送到 `main` 分支
- **依赖**：`build` job 成功
- **服务容器**：PostgreSQL 16 Alpine
- **浏览器**：Chromium

### 6.2 关键配置项

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: e2e_test
    ports:
      - 5432:5432
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/e2e_test
  CI: 'true'
```

### 6.3 测试报告

测试完成后自动上传：

- `playwright-report/` — Playwright HTML 报告
- `test-results/` — 失败用例截图和 trace
- 保留期限：30 天

## 7. 常见问题

### 7.1 端口冲突

```bash
# 检查端口占用
lsof -i :3000

# 更改测试端口
E2E_BASE_URL=http://localhost:3001 npx playwright test
```

### 7.2 认证失败

确认 `.env.e2e` 或 CI 环境变量中 `DATABASE_URL` 指向正确的测试数据库。测试使用 `localStorage` 模拟认证，无需真实的登录流程。

### 7.3 超时错误

```bash
# 增加全局超时
npx playwright test --timeout=60000

# 或在 playwright.config.ts 中配置
{
  timeout: 60000,
  expect: { timeout: 10000 }
}
```

### 7.4 浏览器未安装

```bash
npx playwright install --with-deps chromium
```

### 7.5 数据库连接失败

- 确认 PostgreSQL 服务已启动
- 检查 `DATABASE_URL` 格式是否正确
- CI 中确认 postgres service 容器健康检查通过

## 8. 最佳实践

1. **测试独立性**：每个测试应独立运行，不依赖其他测试的执行顺序
2. **数据隔离**：使用 `[E2E_TEST]` 前缀标记测试数据，测试结束后清理
3. **选择器优先级**：`data-testid` > `getByRole` > `getByText` > CSS selector
4. **避免硬编码等待**：使用 `waitFor`、`expect(...).toBeVisible()` 等智能等待
5. **认证抽象**：使用 `helpers/auth.ts` 中的 `loginAs*` 函数，不在测试中直接操作 localStorage
6. **API 工厂模式**：通过 `helpers/api.ts` 创建测试数据，不依赖 UI 操作创建前置数据
7. **冒烟测试优先**：CI 中先运行冒烟测试（`smoke.spec.ts`），快速发现核心故障
8. **失败截图**：利用 Playwright 自动截图功能，`test-results/` 目录会保留失败用例的截图和 trace