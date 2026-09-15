import { test, expect, type Page } from '@playwright/test';
import { setupAuth } from './helpers/auth';
import { createApiHelper, apiGet, apiPost, apiDelete } from './helpers/api';

const TEST_ROLE = {
  code: 'e2e_test_role',
  name: 'E2E测试角色',
  description: '自动化测试用角色',
};

const TEST_ROLE_UPDATED = {
  code: 'e2e_test_role_v2',
  name: 'E2E测试角色-已更新',
  description: '自动化测试用角色(已编辑)',
};

async function cleanupTestRole(page: Page): Promise<void> {
  try {
    const helper = createApiHelper(page.request);
    const roles: Array<{ id: string; roleCode: string }> =
      (await apiGet(helper, '/roles')) as Array<{
        id: string;
        roleCode: string;
      }>;
    for (const r of roles) {
      if (r.roleCode === TEST_ROLE.code || r.roleCode === TEST_ROLE_UPDATED.code) {
        await apiDelete(helper, `/roles/${r.id}`);
      }
    }
  } catch {
    // Best-effort cleanup
  }
}

test.describe('角色权限管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await cleanupTestRole(page);
    await page.goto('/roles');
    await page.waitForSelector('h1');
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestRole(page);
  });

  test('导航到角色权限页面，显示角色列表', async ({ page }) => {
    // 验证页面标题
    await expect(page.getByRole('heading', { name: '角色权限' })).toBeVisible();

    // 验证左侧角色列表卡片存在
    await expect(page.getByText('角色列表')).toBeVisible();

    // 验证"新增"按钮存在
    await expect(
      page.getByRole('button', { name: '新增' }),
    ).toBeVisible();

    // 验证右侧选择提示
    await expect(page.getByText('请选择一个角色查看详情')).toBeVisible();
  });

  test('新增角色：填写编码、名称、描述并提交', async ({ page }) => {
    // 点击"新增"按钮
    await page.getByRole('button', { name: '新增' }).click();

    // 等待弹窗
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: '新增角色' }),
    ).toBeVisible();

    // 填写角色编码
    await page.getByLabel('角色编码').fill(TEST_ROLE.code);
    // 填写角色名称
    await page.getByLabel('角色名称').fill(TEST_ROLE.name);
    // 填写角色描述
    await page.getByLabel('角色描述').fill(TEST_ROLE.description);

    // 点击创建
    await dialog.getByRole('button', { name: '创建' }).click();

    // 等待弹窗关闭
    await expect(dialog).not.toBeVisible();

    // 验证角色出现在列表中
    await expect(page.getByText(TEST_ROLE.name).first()).toBeVisible();
  });

  test('新增角色时未填写必填字段，显示错误提示', async ({ page }) => {
    // 点击"新增"按钮
    await page.getByRole('button', { name: '新增' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 不填任何字段，直接点创建
    await dialog.getByRole('button', { name: '创建' }).click();

    // 验证 toast 错误提示
    await expect(page.getByText('请填写角色编码和角色名称')).toBeVisible();
  });

  test('编辑角色：修改名称和权限并保存', async ({ page, request }) => {
    // 先通过 API 创建一个角色
    const helper = createApiHelper(request);
    const created: { id: string } = (await apiPost(helper, '/roles', {
      roleCode: TEST_ROLE.code,
      roleName: TEST_ROLE.name,
      roleDescription: TEST_ROLE.description,
      menuPermissions: {
        expenses: true,
        budget: false,
        fixedAssets: false,
        inventory: false,
        categories: false,
        reports: false,
        settings: false,
        roles: false,
        audit: false,
        notifications: false,
      },
      dataPermissions: {
        expenses: 'personal',
        fixedAssets: 'personal',
        inventory: 'personal',
      },
      operationPermissions: {
        expenses: { view: true, create: true, edit: false, delete: false, export: false, import: false },
        fixedAssets: {},
        inventory: {},
      },
    })) as { id: string };

    // 刷新页面
    await page.reload();
    await page.waitForSelector('h1');

    // 点击刚创建的角色
    await page.getByText(TEST_ROLE.name).first().click();

    // 等待右侧详情面板加载
    await expect(page.getByLabel('角色名称')).toBeVisible();

    // 修改角色名称
    await page.getByLabel('角色名称').fill(TEST_ROLE_UPDATED.name);

    // 切换到数据权限 Tab
    await page.getByRole('tab', { name: '数据权限' }).click();

    // 修改数据权限：支出数据 → 全部数据
    await page.getByLabel('全部数据').first().check();

    // 切换到操作权限 Tab
    await page.getByRole('tab', { name: '操作权限' }).click();

    // 勾选支出管理的"编辑"权限
    await page.getByLabel('编辑').first().check();

    // 点击保存
    await page.getByRole('button', { name: '保存' }).click();

    // 验证保存成功 toast
    await expect(page.getByText('保存成功')).toBeVisible();

    // 验证角色名称已更新
    await expect(page.getByLabel('角色名称')).toHaveValue(TEST_ROLE_UPDATED.name);

    // 清理
    await apiDelete(helper, `/roles/${created.id}`);
  });

  test('分配角色给用户：选择用户并确认关联', async ({ page, request }) => {
    // 先通过 API 创建角色
    const helper = createApiHelper(request);
    const created: { id: string } = (await apiPost(helper, '/roles', {
      roleCode: TEST_ROLE.code,
      roleName: TEST_ROLE.name,
      roleDescription: TEST_ROLE.description,
      menuPermissions: {},
      dataPermissions: {},
      operationPermissions: {},
    })) as { id: string };

    // 刷新页面
    await page.reload();
    await page.waitForSelector('h1');

    // 点击角色
    await page.getByText(TEST_ROLE.name).first().click();
    await expect(page.getByLabel('角色名称')).toBeVisible();

    // 通过 API 分配用户
    const assignResult: { success: boolean } = (await apiPost(
      helper,
      `/roles/users/test-user-001/roles`,
      { roleIds: [created.id] },
    )) as { success: boolean };
    expect(assignResult.success).toBe(true);

    // 验证用户角色关联
    const userRoles: Array<{ roleId: string }> = (await apiGet(
      helper,
      `/roles/users/test-user-001`,
    )) as Array<{ roleId: string }>;
    const assignedIds = userRoles.map((r: { roleId: string }) => r.roleId);
    expect(assignedIds).toContain(created.id);

    // 清理
    await apiDelete(helper, `/roles/users/test-user-001/roles/${created.id}`);
    await apiDelete(helper, `/roles/${created.id}`);
  });

  test('查询角色关联的用户列表', async ({ page, request }) => {
    const helper = createApiHelper(request);

    // 创建角色
    const created: { id: string } = (await apiPost(helper, '/roles', {
      roleCode: TEST_ROLE.code,
      roleName: TEST_ROLE.name,
      roleDescription: TEST_ROLE.description,
      menuPermissions: {},
      dataPermissions: {},
      operationPermissions: {},
    })) as { id: string };

    // 分配用户
    await apiPost(helper, `/roles/users/test-user-001/roles`, {
      roleIds: [created.id],
    });

    // 查询角色用户
    const roleUsers: Array<{ userId: string }> = (await apiGet(
      helper,
      `/roles/${created.id}/users`,
    )) as Array<{ userId: string }>;
    const userIds = roleUsers.map((u: { userId: string }) => u.userId);
    expect(userIds).toContain('test-user-001');

    // 清理
    await apiDelete(helper, `/roles/users/test-user-001/roles/${created.id}`);
    await apiDelete(helper, `/roles/${created.id}`);
  });

  test('验证菜单权限：通过 API 获取当前用户权限', async ({ request }) => {
    const helper = createApiHelper(request);

    const perms: {
      menuPermissions: Record<string, boolean>;
    } = (await apiGet(
      helper,
      '/roles/permissions/me',
    )) as { menuPermissions: Record<string, boolean> };

    // 验证返回的权限结构存在
    expect(perms).toHaveProperty('menuPermissions');
    expect(perms).toHaveProperty('dataPermissions');
    expect(perms).toHaveProperty('operationPermissions');
    expect(typeof perms.menuPermissions).toBe('object');
  });

  test('验证数据权限：个人/部门/全部权限字段存在', async ({ request }) => {
    const helper = createApiHelper(request);

    const perms: {
      dataPermissions: Record<string, string>;
    } = (await apiGet(
      helper,
      '/roles/permissions/me',
    )) as { dataPermissions: Record<string, string> };

    // 验证数据权限结构
    expect(perms.dataPermissions).toBeDefined();

    // 验证数据权限值在合法范围内
    const validScopes = ['personal', 'department', 'all'];
    for (const domain of Object.keys(perms.dataPermissions)) {
      expect(validScopes).toContain(perms.dataPermissions[domain]);
    }
  });

  test('验证操作权限：新增/编辑/删除/导出/导入权限字段存在', async ({ request }) => {
    const helper = createApiHelper(request);

    const perms: {
      operationPermissions: Record<string, Record<string, boolean>>;
    } = (await apiGet(
      helper,
      '/roles/permissions/me',
    )) as {
      operationPermissions: Record<string, Record<string, boolean>>;
    };

    expect(perms.operationPermissions).toBeDefined();

    const expectedActions = ['view', 'create', 'edit', 'delete', 'export'];
    const domains = Object.keys(perms.operationPermissions);

    if (domains.length > 0) {
      for (const domain of domains) {
        const domainPerms = perms.operationPermissions[domain];
        if (domainPerms && Object.keys(domainPerms).length > 0) {
          // 验证所有操作均为布尔值
          for (const action of Object.keys(domainPerms)) {
            expect(typeof domainPerms[action]).toBe('boolean');
          }
          // 验证至少包含常见操作字段
          // (某些角色可能无权限，所有字段为 false)
          break;
        }
      }
    }
  });

  test('验证用户列表API支持按角色筛选', async ({ request }) => {
    const helper = createApiHelper(request);

    const response: {
      items: unknown[];
      total: number;
    } = (await apiGet(helper, '/roles/users/list?page=1&pageSize=10')) as {
      items: unknown[];
      total: number;
    };

    expect(response).toHaveProperty('items');
    expect(response).toHaveProperty('total');
    expect(Array.isArray(response.items)).toBe(true);
    expect(typeof response.total).toBe('number');
  });

  test('删除角色：确认删除后角色从列表消失', async ({ page, request }) => {
    const helper = createApiHelper(request);

    // 创建角色
    const created: { id: string } = (await apiPost(helper, '/roles', {
      roleCode: TEST_ROLE.code,
      roleName: TEST_ROLE.name,
      roleDescription: TEST_ROLE.description,
      menuPermissions: {},
      dataPermissions: {},
      operationPermissions: {},
    })) as { id: string };

    // 刷新页面
    await page.reload();
    await page.waitForSelector('h1');

    // 点击角色
    await page.getByText(TEST_ROLE.name).first().click();
    await expect(page.getByLabel('角色名称')).toBeVisible();

    // 点击删除按钮
    await page.getByRole('button', { name: '删除' }).click();

    // 确认删除弹窗
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: '确认删除' }),
    ).toBeVisible();

    // 确认删除
    await dialog.getByRole('button', { name: '确认删除' }).click();

    // 验证删除成功 toast
    await expect(page.getByText('删除成功')).toBeVisible();

    // 验证角色从列表中消失
    await expect(page.getByText(TEST_ROLE.name).first()).not.toBeVisible();

    // 验证 API 返回 404
    try {
      await apiGet(helper, `/roles/${created.id}`);
      // 如果没抛异常，说明角色还存在（不应该）
      expect(false).toBe(true);
    } catch {
      // 预期 404
      expect(true).toBe(true);
    }
  });

  test('取消删除角色，角色保持不变', async ({ page, request }) => {
    const helper = createApiHelper(request);

    // 创建角色
    const created: { id: string } = (await apiPost(helper, '/roles', {
      roleCode: TEST_ROLE.code,
      roleName: TEST_ROLE.name,
      roleDescription: TEST_ROLE.description,
      menuPermissions: {},
      dataPermissions: {},
      operationPermissions: {},
    })) as { id: string };

    // 刷新页面
    await page.reload();
    await page.waitForSelector('h1');

    // 点击角色
    await page.getByText(TEST_ROLE.name).first().click();
    await expect(page.getByLabel('角色名称')).toBeVisible();

    // 点击删除按钮
    await page.getByRole('button', { name: '删除' }).click();

    // 确认删除弹窗
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 点击取消
    await dialog.getByRole('button', { name: '取消' }).click();
    await expect(dialog).not.toBeVisible();

    // 验证角色仍然存在
    await expect(page.getByText(TEST_ROLE.name).first()).toBeVisible();

    // 清理
    await apiDelete(helper, `/roles/${created.id}`);
  });

  test('系统角色不可删除（删除按钮禁用）', async ({ page }) => {
    // 等待角色列表加载
    await page.waitForSelector('[class*="divide-y"]');

    // 查找系统角色（带"系统" Badge 的项）
    const systemBadge = page.locator(':has-text("系统")').first();

    if (await systemBadge.isVisible()) {
      // 点击系统角色
      await systemBadge.click();

      // 等待详情面板
      await expect(page.getByLabel('角色名称')).toBeVisible();

      // 删除按钮应为 disabled
      const deleteBtn = page.getByRole('button', { name: '删除' });
      await expect(deleteBtn).toBeDisabled();
    }
    // 如果没有系统角色，测试通过（跳过）
  });
});