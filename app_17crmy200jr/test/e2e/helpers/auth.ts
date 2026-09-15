import { Page } from '@playwright/test';

export interface TestUser {
  userId: string;
  userName: string;
  department: string;
}

export const DEFAULT_TEST_USER: TestUser = {
  userId: 'test-user-001',
  userName: '测试用户',
  department: '行政部',
};

export async function setupAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'test-token-e2e');
    localStorage.setItem('user_id', 'test-user-001');
    localStorage.setItem('user_name', '测试用户');
  });
}

export const TEST_USERS = {
  admin: {
    userId: 'test-admin-001',
    userName: '管理员',
    department: '行政部',
  },
  user: {
    userId: 'test-user-001',
    userName: '测试用户',
    department: '行政部',
  },
  deptAdmin: {
    userId: 'test-dept-admin-001',
    userName: '部门管理员',
    department: '研发部',
  },
} as const;

export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
  });
}

export async function loginAsAdmin(page: Page): Promise<void> {
  const { userId, userName } = TEST_USERS.admin;
  await page.evaluate(
    ({ uid, uname }) => {
      localStorage.setItem('auth_token', 'test-token-e2e-admin');
      localStorage.setItem('user_id', uid);
      localStorage.setItem('user_name', uname);
    },
    { uid: userId, uname: userName },
  );
}

export async function loginAsUser(page: Page): Promise<void> {
  const { userId, userName } = TEST_USERS.user;
  await page.evaluate(
    ({ uid, uname }) => {
      localStorage.setItem('auth_token', 'test-token-e2e-user');
      localStorage.setItem('user_id', uid);
      localStorage.setItem('user_name', uname);
    },
    { uid: userId, uname: userName },
  );
}

export async function loginAsDeptAdmin(page: Page): Promise<void> {
  const { userId, userName } = TEST_USERS.deptAdmin;
  await page.evaluate(
    ({ uid, uname }) => {
      localStorage.setItem('auth_token', 'test-token-e2e-dept-admin');
      localStorage.setItem('user_id', uid);
      localStorage.setItem('user_name', uname);
    },
    { uid: userId, uname: userName },
  );
}

export function getAuthState(): {
  storageState: string;
} {
  return {
    storageState: 'test/e2e/.auth/state.json',
  };
}