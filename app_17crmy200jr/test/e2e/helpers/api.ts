import { APIRequestContext } from '@playwright/test';

export const TEST_API_PREFIX = '/api';

const API_BASE = TEST_API_PREFIX;
const E2E_PREFIX = '[E2E_TEST]';

export interface ApiHelper {
  request: APIRequestContext;
}

export function createApiHelper(request: APIRequestContext): ApiHelper {
  return { request };
}

export async function apiGet(helper: ApiHelper, path: string): Promise<unknown> {
  const res = await helper.request.get(`${API_BASE}${path}`);
  return res.json();
}

export async function apiPost(
  helper: ApiHelper,
  path: string,
  body: unknown,
): Promise<unknown> {
  const res = await helper.request.post(`${API_BASE}${path}`, {
    data: body,
  });
  return res.json();
}

export async function apiDelete(
  helper: ApiHelper,
  path: string,
): Promise<unknown> {
  const res = await helper.request.delete(`${API_BASE}${path}`);
  return res.json();
}

export async function cleanupTestData(
  helper: ApiHelper,
  prefix: string,
): Promise<void> {
  // Best-effort cleanup — individual tests should clean up their own data
}

/* ------------------------------------------------------------------ */
/*  Test data factories                                                  */
/* ------------------------------------------------------------------ */

interface TestExpenseData {
  title?: string;
  amount?: number;
  category?: string;
  [key: string]: unknown;
}

interface TestAssetData {
  name?: string;
  category?: string;
  [key: string]: unknown;
}

interface TestInventoryTaskData {
  name?: string;
  [key: string]: unknown;
}

interface TestBudgetData {
  name?: string;
  amount?: number;
  [key: string]: unknown;
}

interface BatchTestData {
  expenses?: TestExpenseData[];
  assets?: TestAssetData[];
  inventoryTasks?: TestInventoryTaskData[];
  budgets?: TestBudgetData[];
}

interface BatchTestResult {
  expenses: unknown[];
  assets: unknown[];
  inventoryTasks: unknown[];
  budgets: unknown[];
}

export async function createTestExpense(
  helper: ApiHelper,
  data: TestExpenseData = {},
): Promise<unknown> {
  const body = {
    amount: 100,
    category: 'office',
    ...data,
    title: `${E2E_PREFIX} ${data.title ?? 'Test Expense'}`,
  };
  return apiPost(helper, '/expenses', body);
}

export async function createTestAsset(
  helper: ApiHelper,
  data: TestAssetData = {},
): Promise<unknown> {
  const body = {
    category: 'equipment',
    ...data,
    name: `${E2E_PREFIX} ${data.name ?? 'Test Asset'}`,
  };
  return apiPost(helper, '/fixed-assets', body);
}

export async function createTestInventoryTask(
  helper: ApiHelper,
  data: TestInventoryTaskData = {},
): Promise<unknown> {
  const body = {
    ...data,
    name: `${E2E_PREFIX} ${data.name ?? 'Test Inventory Task'}`,
  };
  return apiPost(helper, '/inventory-tasks', body);
}

export async function createTestBudget(
  helper: ApiHelper,
  data: TestBudgetData = {},
): Promise<unknown> {
  const body = {
    amount: 5000,
    ...data,
    name: `${E2E_PREFIX} ${data.name ?? 'Test Budget'}`,
  };
  return apiPost(helper, '/budgets', body);
}

export async function createBatchTestData(
  helper: ApiHelper,
  data: BatchTestData = {},
): Promise<BatchTestResult> {
  const results: BatchTestResult = {
    expenses: [],
    assets: [],
    inventoryTasks: [],
    budgets: [],
  };

  if (data.expenses?.length) {
    results.expenses = await Promise.all(
      data.expenses.map((d: TestExpenseData) => createTestExpense(helper, d)),
    );
  }

  if (data.assets?.length) {
    results.assets = await Promise.all(
      data.assets.map((d: TestAssetData) => createTestAsset(helper, d)),
    );
  }

  if (data.inventoryTasks?.length) {
    results.inventoryTasks = await Promise.all(
      data.inventoryTasks.map((d: TestInventoryTaskData) =>
        createTestInventoryTask(helper, d),
      ),
    );
  }

  if (data.budgets?.length) {
    results.budgets = await Promise.all(
      data.budgets.map((d: TestBudgetData) => createTestBudget(helper, d)),
    );
  }

  return results;
}