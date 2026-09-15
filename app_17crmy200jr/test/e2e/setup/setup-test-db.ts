// ============================================================
// E2E 测试数据库初始化 & 清理
// 通过 API 调用完成（FaaS 环境）
// ============================================================

import {
  TEST_USERS,
  TEST_CATEGORIES,
  TEST_ASSETS,
  TEST_EXPENSES,
  TEST_INVENTORY_TASKS,
} from './test-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function apiPost<T = unknown>(
  baseURL: string,
  path: string,
  body: unknown,
): Promise<ApiResponse<T>> {
  const url = `${baseURL}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // E2E test auth header — adjust if the app uses a different mechanism
        'X-E2E-Test': '1',
      },
      body: JSON.stringify(body),
    });
    const data: T = (await res.json()) as T;
    return { ok: res.ok, status: res.status, data };
  } catch (err: unknown) {
    const message: string =
      err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, error: message };
  }
}

async function apiDelete(
  baseURL: string,
  path: string,
): Promise<ApiResponse> {
  const url = `${baseURL}${path}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'X-E2E-Test': '1' },
    });
    return { ok: res.ok, status: res.status };
  } catch (err: unknown) {
    const message: string =
      err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, error: message };
  }
}

async function apiGet<T = unknown>(
  baseURL: string,
  path: string,
): Promise<ApiResponse<T>> {
  const url = `${baseURL}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'X-E2E-Test': '1' },
    });
    const data: T = (await res.json()) as T;
    return { ok: res.ok, status: res.status, data };
  } catch (err: unknown) {
    const message: string =
      err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * 初始化测试数据库。
 * FaaS 环境下数据库已就绪，此处仅做日志输出。
 */
export async function setupTestDatabase(baseURL: string): Promise<void> {
  console.log(`[setupTestDatabase] DB ready at ${baseURL}`);
}

/**
 * 向应用写入测试种子数据。
 * 调用顺序：分类 → 资产 → 支出 → 盘点任务
 */
export async function seedTestData(baseURL: string): Promise<void> {
  console.log('[seedTestData] Seeding test data...');

  // 1. 一级分类
  const l1Names: string[] = [
    TEST_CATEGORIES.office.name,
    TEST_CATEGORIES.travel.name,
  ];
  for (const name of l1Names) {
    const res = await apiPost(baseURL, '/api/categories/l1', {
      categoryL1: name,
      categoryL2: '',
    });
    console.log(
      `  [category L1] ${name} → ${res.ok ? 'OK' : `FAIL ${res.status}`}`,
    );
  }

  // 2. 二级分类
  const res = await apiPost(baseURL, '/api/categories/l2', {
    categoryL1: TEST_CATEGORIES.office.name,
    categoryL2: TEST_CATEGORIES.officeSub.name,
    sortOrder: TEST_CATEGORIES.officeSub.sortOrder,
  });
  console.log(
    `  [category L2] ${TEST_CATEGORIES.officeSub.name} → ${res.ok ? 'OK' : `FAIL ${res.status}`}`,
  );

  // 3. 固定资产
  for (const asset of TEST_ASSETS) {
    const res = await apiPost(baseURL, '/api/fixed-assets', {
      assetName: asset.assetName,
      assetType: asset.assetType,
      assetCategory: asset.assetType,
      purchaseAmount: asset.purchaseAmount,
      purchaseDate: asset.purchaseDate,
      floor: asset.floor,
      currentStock: asset.currentStock,
      handler: TEST_USERS.admin.userId,
      owner: TEST_USERS.admin.userId,
      payerEntity: '公司',
      purchaseDepartment: TEST_USERS.admin.department,
    });
    console.log(
      `  [asset] ${asset.assetName} → ${res.ok ? 'OK' : `FAIL ${res.status}`}`,
    );
  }

  // 4. 支出记录
  for (const expense of TEST_EXPENSES) {
    const res = await apiPost(baseURL, '/api/expenses', {
      expenseDate: expense.expenseDate,
      amount: expense.amount,
      description: expense.description,
      categoryL1: expense.categoryL1,
      categoryL2: expense.categoryL2,
      department: expense.department,
      handler: expense.handler,
      floor: expense.floor,
      payerEntity: expense.payerEntity,
      purchaseDepartment: expense.department,
    });
    console.log(
      `  [expense] ${expense.description} → ${res.ok ? 'OK' : `FAIL ${res.status}`}`,
    );
  }

  // 5. 盘点任务
  for (const task of TEST_INVENTORY_TASKS) {
    const res = await apiPost(baseURL, '/api/inventory-tasks', {
      taskName: task.taskName,
      checkYear: task.checkYear,
      checkMonth: task.checkMonth,
      scopeType: task.scopeType,
      checker: task.checker,
    });
    console.log(
      `  [inventory] ${task.taskName} → ${res.ok ? 'OK' : `FAIL ${res.status}`}`,
    );
  }

  console.log('[seedTestData] Done.');
}

/**
 * 清理种子数据（逆序：盘点任务 → 支出 → 资产 → 分类）。
 * 通过列表接口查找「测试」前缀数据并逐条删除。
 */
export async function teardownTestDatabase(baseURL: string): Promise<void> {
  console.log('[teardownTestDatabase] Cleaning up test data...');

  await clearTestData(baseURL, '测试');

  console.log('[teardownTestDatabase] Done.');
}

/**
 * 删除名称/描述匹配指定前缀的测试数据。
 * 最佳实践：在测试用例中自行清理各自数据；此函数用于全局兜底。
 *
 * @param baseURL - 应用 base URL
 * @param prefix  - 匹配前缀（默认 `E2E_TEST_`）
 */
export async function clearTestData(
  baseURL: string,
  prefix: string = 'E2E_TEST_',
): Promise<void> {
  console.log(`[clearTestData] Clearing data with prefix "${prefix}"...`);

  // 盘点任务
  const tasksRes = await apiGet<{
    items?: Array<{ id: string; taskName?: string }>;
  }>(baseURL, '/api/inventory-tasks?pageSize=200');
  if (tasksRes.ok && tasksRes.data?.items) {
    for (const item of tasksRes.data.items) {
      if (item.taskName?.includes(prefix)) {
        await apiDelete(baseURL, `/api/inventory-tasks/${item.id}`);
        console.log(`  [delete] inventory-task: ${item.taskName}`);
      }
    }
  }

  // 支出
  const expensesRes = await apiGet<{
    items?: Array<{ id: string; description?: string }>;
  }>(baseURL, '/api/expenses?pageSize=200');
  if (expensesRes.ok && expensesRes.data?.items) {
    for (const item of expensesRes.data.items) {
      if (item.description?.includes(prefix)) {
        await apiDelete(baseURL, `/api/expenses/${item.id}`);
        console.log(`  [delete] expense: ${item.description}`);
      }
    }
  }

  // 资产
  const assetsRes = await apiGet<{
    items?: Array<{ id: string; assetName?: string }>;
  }>(baseURL, '/api/fixed-assets?pageSize=200');
  if (assetsRes.ok && assetsRes.data?.items) {
    for (const item of assetsRes.data.items) {
      if (item.assetName?.includes(prefix)) {
        await apiDelete(baseURL, `/api/fixed-assets/${item.id}`);
        console.log(`  [delete] asset: ${item.assetName}`);
      }
    }
  }

  // 分类
  const categoriesRes = await apiGet<{
    items?: Array<{ id: string; categoryL1?: string; categoryL2?: string }>;
  }>(baseURL, '/api/categories/l2?pageSize=200');
  if (categoriesRes.ok && categoriesRes.data?.items) {
    for (const item of categoriesRes.data.items) {
      if (
        item.categoryL1?.includes(prefix) ||
        item.categoryL2?.includes(prefix)
      ) {
        await apiDelete(baseURL, `/api/categories/${item.id}`);
        console.log(
          `  [delete] category: ${item.categoryL1}/${item.categoryL2}`,
        );
      }
    }
  }

  console.log('[clearTestData] Done.');
}