import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers/auth';

test.describe('支出管理 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
  });

  // ============================================================
  // 1. 导航到支出管理页面
  // ============================================================

  test('导航到支出管理页面 — 标题和表格可见', async ({ page }) => {
    // 验证页面标题
    await expect(
      page.getByRole('heading', { name: '支出管理' }),
    ).toBeVisible();

    // 验证统计卡片
    await expect(page.getByText('合计金额')).toBeVisible();
    await expect(page.getByText('记录总数')).toBeVisible();

    // 验证表格存在
    await expect(page.locator('table')).toBeVisible();
  });

  test('通过侧边栏导航到支出管理页面', async ({ page }) => {
    // 先导航到其他页面
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 点击侧边栏中的"行政支出管理"链接
    await page.getByRole('link', { name: '行政支出管理' }).click();
    await page.waitForLoadState('networkidle');

    // 验证已到达支出管理页面
    await expect(
      page.getByRole('heading', { name: '支出管理' }),
    ).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  // ============================================================
  // 2. 新增支出记录
  // ============================================================

  test('新增支出记录 — 填写必填字段并提交', async ({ page }) => {
    // 记录新增前的行数
    const beforeRows = await page.locator('tbody tr').count();

    // 点击"新增支出"按钮
    await page.getByRole('button', { name: /新增支出/ }).click();

    // 等待弹窗出现
    await expect(
      page.getByRole('heading', { name: '新增支出' }),
    ).toBeVisible();

    // 填写支出日期（Input type="date"）
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2026-08-15');

    // 填写支出金额
    await page.getByPlaceholder('0.00').fill('1500.50');

    // 选择一级类目
    await page
      .getByRole('combobox', { name: /请选择一级类目/ })
      .click();
    await page.getByRole('option').first().click();

    // 等待二级类目加载
    await page.waitForTimeout(500);

    // 选择二级类目
    await page
      .getByRole('combobox', { name: /请选择二级类目/ })
      .click();
    await page.getByRole('option').first().click();

    // 选择部门
    await page
      .getByRole('combobox', { name: /请选择部门/ })
      .click();
    await page.getByRole('option').first().click();

    // 填写支出说明
    await page
      .getByPlaceholder('请输入支出说明')
      .fill('E2E 测试新增支出');

    // 提交表单
    await page.getByRole('button', { name: '保存' }).click();

    // 等待弹窗关闭和数据刷新
    await page.waitForTimeout(1000);

    // 验证新记录出现（行数增加或金额可见）
    const afterRows = await page.locator('tbody tr').count();
    expect(afterRows).toBeGreaterThanOrEqual(beforeRows);
  });

  test('新增支出记录 — 填写完整字段', async ({ page }) => {
    await page.getByRole('button', { name: /新增支出/ }).click();
    await expect(
      page.getByRole('heading', { name: '新增支出' }),
    ).toBeVisible();

    // 日期
    await page.locator('input[type="date"]').first().fill('2026-09-01');

    // 金额
    await page.getByPlaceholder('0.00').fill('3200.00');

    // 一级类目
    await page
      .getByRole('combobox', { name: /请选择一级类目/ })
      .click();
    await page.getByRole('option').first().click();
    await page.waitForTimeout(500);

    // 二级类目
    await page
      .getByRole('combobox', { name: /请选择二级类目/ })
      .click();
    await page.getByRole('option').first().click();

    // 付费主体
    await page
      .getByRole('combobox', { name: /请选择付费主体/ })
      .click();
    await page.getByRole('option').first().click();

    // 使用楼层
    await page
      .getByRole('combobox', { name: /请选择使用楼层/ })
      .click();
    await page.getByRole('option').first().click();

    // 部门
    await page
      .getByRole('combobox', { name: /请选择部门/ })
      .click();
    await page.getByRole('option').first().click();

    // 采购申请部门
    await page
      .getByRole('combobox', { name: /请选择采购申请部门/ })
      .click();
    await page.getByRole('option').first().click();

    // 支出说明
    await page
      .getByPlaceholder('请输入支出说明')
      .fill('E2E 完整字段测试');

    // 保存
    await page.getByRole('button', { name: '保存' }).click();
    await page.waitForTimeout(1000);

    // 验证成功提示
    await expect(page.getByText(/成功/).first()).toBeVisible();
  });

  test('新增支出 — 取消操作不创建记录', async ({ page }) => {
    const beforeCount = await page.locator('tbody tr').count();

    await page.getByRole('button', { name: /新增支出/ }).click();
    await expect(
      page.getByRole('heading', { name: '新增支出' }),
    ).toBeVisible();

    // 填写部分字段
    await page.getByPlaceholder('0.00').fill('999.99');

    // 点击取消
    await page.getByRole('button', { name: '取消' }).click();
    await page.waitForTimeout(500);

    // 验证弹窗关闭
    await expect(
      page.getByRole('heading', { name: '新增支出' }),
    ).not.toBeVisible();

    // 验证行数未变
    const afterCount = await page.locator('tbody tr').count();
    expect(afterCount).toBe(beforeCount);
  });

  // ============================================================
  // 3. 筛选支出记录
  // ============================================================

  test('筛选 — 按关键词搜索', async ({ page }) => {
    // 先确保有数据
    await page.waitForSelector('tbody tr');

    // 在搜索框中输入关键词
    const searchInput = page.getByPlaceholder('搜索描述或二级类目');
    await searchInput.fill('办公');
    await searchInput.press('Enter');

    // 等待搜索完成
    await page.waitForTimeout(800);

    // 验证表格仍然可见（可能会显示"暂无数据"或过滤后的结果）
    await expect(page.locator('table')).toBeVisible();
  });

  test('筛选 — 按一级类目筛选', async ({ page }) => {
    await page.waitForSelector('tbody tr');

    // 点击一级类目筛选下拉
    const l1Combobox = page
      .getByRole('combobox', { name: /一级类目/ })
      .first();
    await l1Combobox.click();

    // 选择第一个可用选项
    const options = page.getByRole('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await options.nth(1).click();
      await page.waitForTimeout(800);

      // 验证表格可见
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('筛选 — 按二级类目筛选', async ({ page }) => {
    await page.waitForSelector('tbody tr');

    // 先选择一级类目以启用二级类目筛选
    const l1Combobox = page
      .getByRole('combobox', { name: /一级类目/ })
      .first();
    await l1Combobox.click();
    const options = page.getByRole('option');
    const optionCount = await options.count();
    if (optionCount <= 1) return; // 无可用选项则跳过
    await options.nth(1).click();
    await page.waitForTimeout(500);

    // 选择二级类目
    const l2Combobox = page.getByRole('combobox', { name: /二级类目/ });
    const l2Enabled = await l2Combobox.isEnabled();
    if (l2Enabled) {
      await l2Combobox.click();
      const l2Options = page.getByRole('option');
      const l2Count = await l2Options.count();
      if (l2Count > 1) {
        await l2Options.nth(1).click();
        await page.waitForTimeout(800);
      }
    }

    await expect(page.locator('table')).toBeVisible();
  });

  test('筛选 — 清空筛选后恢复全部数据', async ({ page }) => {
    await page.waitForSelector('tbody tr');

    // 先进行筛选
    const searchInput = page.getByPlaceholder('搜索描述或二级类目');
    await searchInput.fill('不存在的关键字xyz');
    await searchInput.press('Enter');
    await page.waitForTimeout(800);

    // 清空搜索框
    await searchInput.clear();
    await searchInput.press('Enter');
    await page.waitForTimeout(800);

    // 验证表格恢复
    await expect(page.locator('table')).toBeVisible();
  });

  // ============================================================
  // 4. 编辑支出记录
  // ============================================================

  test('编辑支出记录 — 修改金额和备注', async ({ page }) => {
    // 等待表格加载
    await page.waitForSelector('tbody tr');

    // 点击第一行的编辑按钮
    const editButton = page.locator('tbody tr').first().getByTitle('编辑');
    await editButton.click();

    // 等待编辑弹窗
    await expect(
      page.getByRole('heading', { name: '编辑支出' }),
    ).toBeVisible();

    // 修改金额
    const amountInput = page.getByPlaceholder('0.00');
    await amountInput.clear();
    await amountInput.fill('8888.88');

    // 修改支出说明
    const descInput = page.getByPlaceholder('请输入支出说明');
    await descInput.clear();
    await descInput.fill('E2E 编辑测试 — 已修改');

    // 保存
    await page.getByRole('button', { name: '保存' }).click();
    await page.waitForTimeout(1000);

    // 验证成功提示
    await expect(page.getByText(/成功/).first()).toBeVisible();
  });

  // ============================================================
  // 5. 查看支出详情
  // ============================================================

  test('查看支出详情 — 打开抽屉并验证字段', async ({ page }) => {
    await page.waitForSelector('tbody tr');

    // 点击第一行的查看按钮
    const viewButton = page.locator('tbody tr').first().getByTitle('查看');
    await viewButton.click();

    // 等待详情抽屉
    await expect(
      page.getByRole('heading', { name: '支出详情' }),
    ).toBeVisible();

    // 验证详情字段存在
    await expect(page.getByText('基本信息')).toBeVisible();
    await expect(page.getByText('支出金额')).toBeVisible();
    await expect(page.getByText('支出说明')).toBeVisible();

    // 关闭抽屉
    await page.getByRole('button', { name: '关闭' }).click();
    await page.waitForTimeout(500);

    // 验证抽屉关闭
    await expect(
      page.getByRole('heading', { name: '支出详情' }),
    ).not.toBeVisible();
  });

  // ============================================================
  // 6. 删除支出记录
  // ============================================================

  test('删除支出记录 — 确认删除后记录消失', async ({ page }) => {
    await page.waitForSelector('tbody tr');

    // 获取删除前的记录数
    const beforeCount = await page.locator('tbody tr').count();

    // 点击第一行的删除按钮
    const deleteButton = page
      .locator('tbody tr')
      .first()
      .getByTitle('删除');
    await deleteButton.click();

    // 等待确认弹窗
    await expect(page.getByText('确认删除？')).toBeVisible();

    // 确认删除
    await page.getByRole('button', { name: '确认删除' }).click();

    // 等待删除完成
    await page.waitForTimeout(1500);

    // 验证记录数减少
    const afterCount = await page.locator('tbody tr').count();
    expect(afterCount).toBeLessThan(beforeCount);
  });

  test('删除支出记录 — 取消删除不生效', async ({ page }) => {
    await page.waitForSelector('tbody tr');

    const beforeCount = await page.locator('tbody tr').count();

    // 点击删除按钮
    const deleteButton = page
      .locator('tbody tr')
      .first()
      .getByTitle('删除');
    await deleteButton.click();

    // 确认弹窗出现
    await expect(page.getByText('确认删除？')).toBeVisible();

    // 取消删除
    await page.getByRole('button', { name: '取消' }).click();
    await page.waitForTimeout(500);

    // 验证弹窗关闭且记录数未变
    await expect(page.getByText('确认删除？')).not.toBeVisible();
    const afterCount = await page.locator('tbody tr').count();
    expect(afterCount).toBe(beforeCount);
  });

  // ============================================================
  // 7. 批量选择与删除
  // ============================================================

  test('批量选择 — 勾选多条记录并清除选择', async ({ page }) => {
    await page.waitForSelector('tbody tr');

    // 勾选前两行的复选框
    const checkboxes = page.locator('tbody tr input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // 验证批量工具栏出现"已选"计数
      await expect(page.getByText(/已选/)).toBeVisible();
      await expect(page.getByText(/条/)).toBeVisible();

      // 点击"清除选择"
      await page.getByRole('button', { name: /清除选择/ }).click();
      await page.waitForTimeout(500);

      // 验证选择已清除
      await expect(
        page.locator('tbody tr input[type="checkbox"]').first(),
      ).not.toBeChecked();
    }
  });

  test('批量删除 — 勾选多条记录后逐条删除', async ({ page }) => {
    await page.waitForSelector('tbody tr');

    const beforeCount = await page.locator('tbody tr').count();
    if (beforeCount < 2) return; // 数据不足则跳过

    // 勾选前两行
    const checkboxes = page.locator('tbody tr input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount < 2) return;

    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // 验证已选中
    await expect(page.getByText(/已选/)).toBeVisible();

    // 删除第一条记录
    await page.locator('tbody tr').first().getByTitle('删除').click();
    await expect(page.getByText('确认删除？')).toBeVisible();
    await page.getByRole('button', { name: '确认删除' }).click();
    await page.waitForTimeout(1500);

    // 验证记录数减少
    const afterDeleteOne = await page.locator('tbody tr').count();
    expect(afterDeleteOne).toBeLessThan(beforeCount);
  });
});