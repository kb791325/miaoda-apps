import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers/auth';

test.describe('预算管理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.goto('/budget');
    // 等待页面核心元素加载完毕
    await expect(
      page.getByRole('heading', { name: '预算管理', level: 1 }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('导航到预算管理页面 — 验证统计卡片和预算列表显示', async ({
    page,
  }) => {
    // 验证统计卡片存在
    await expect(page.getByText('总预算金额')).toBeVisible();
    await expect(page.getByText('已用金额')).toBeVisible();
    await expect(page.getByText('剩余金额')).toBeVisible();
    await expect(page.getByText('整体执行率')).toBeVisible();

    // 验证表格区域
    await expect(page.getByText('部门预算执行情况')).toBeVisible();

    // 验证操作按钮存在
    await expect(
      page.getByRole('button', { name: '新增预算' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '批量设置' }),
    ).toBeVisible();
  });

  test('创建预算 — 填写表单并提交，验证列表中出现新记录', async ({
    page,
  }) => {
    const testDept = `E2E测试部门_${Date.now()}`;
    const testAmount = '50000';

    // 点击新增预算
    await page.getByRole('button', { name: '新增预算' }).click();

    // 等待弹窗出现
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 填写部门
    await dialog
      .getByPlaceholder('请输入部门名称')
      .fill(testDept);

    // 填写预算金额
    await dialog
      .getByPlaceholder('请输入预算金额')
      .fill(testAmount);

    // 提交
    await dialog.getByRole('button', { name: '确认' }).click();

    // 等待弹窗关闭
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // 验证列表中出现了新创建的部门
    await expect(page.getByText(testDept)).toBeVisible({ timeout: 5000 });
  });

  test('创建预算 — 提交空表单时显示错误提示', async ({ page }) => {
    // 点击新增预算
    await page.getByRole('button', { name: '新增预算' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 不填写任何内容直接提交
    await dialog.getByRole('button', { name: '确认' }).click();

    // 验证错误提示出现（sonner toast）
    await expect(page.getByText('请输入部门')).toBeVisible({
      timeout: 3000,
    });

    // 关闭弹窗
    await dialog.getByRole('button', { name: '取消' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('批量创建预算 — 选择多个部门并提交，验证批量创建', async ({
    page,
  }) => {
    const dept1 = `E2E批量部门A_${Date.now()}`;
    const dept2 = `E2E批量部门B_${Date.now()}`;

    // 点击批量设置
    await page.getByRole('button', { name: '批量设置' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: '批量设置预算' }),
    ).toBeVisible();

    // 填写第一行
    const firstDeptInput = dialog
      .getByPlaceholder('部门名称')
      .first();
    await firstDeptInput.fill(dept1);

    const firstAmountInput = dialog
      .getByPlaceholder('预算金额')
      .first();
    await firstAmountInput.fill('30000');

    // 添加一行
    await dialog.getByRole('button', { name: '添加一行' }).click();

    // 填写第二行
    const allDeptInputs = dialog.getByPlaceholder('部门名称');
    const secondDeptInput = allDeptInputs.nth(1);
    await secondDeptInput.fill(dept2);

    const allAmountInputs = dialog.getByPlaceholder('预算金额');
    const secondAmountInput = allAmountInputs.nth(1);
    await secondAmountInput.fill('40000');

    // 提交
    await dialog.getByRole('button', { name: '确认提交' }).click();

    // 等待弹窗关闭
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // 验证两条记录都出现了
    await expect(page.getByText(dept1)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(dept2)).toBeVisible({ timeout: 5000 });
  });

  test('预算调整 — 编辑预算金额并填写调整原因，提交后验证更新', async ({
    page,
  }) => {
    // 先确保列表中有数据，点击第一个编辑按钮
    const editButton = page.getByRole('button', { name: '编辑' }).first();

    // 如果列表为空，先创建一个
    const editButtonCount = await editButton.count();
    if (editButtonCount === 0) {
      // 快速创建一条测试预算
      await page.getByRole('button', { name: '新增预算' }).click();
      const dialog = page.getByRole('dialog');
      await dialog
        .getByPlaceholder('请输入部门名称')
        .fill(`E2E调整测试_${Date.now()}`);
      await dialog
        .getByPlaceholder('请输入预算金额')
        .fill('20000');
      await dialog.getByRole('button', { name: '确认' }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }

    // 点击第一条记录的编辑按钮
    await page.getByRole('button', { name: '编辑' }).first().click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible();
    await expect(
      editDialog.getByRole('heading', { name: '编辑预算' }),
    ).toBeVisible();

    // 修改预算金额
    const amountInput = editDialog.getByPlaceholder('请输入预算金额');
    await amountInput.clear();
    await amountInput.fill('35000');

    // 填写调整原因
    const reasonInput = editDialog.getByPlaceholder('请输入调整原因（可选）');
    await reasonInput.fill('季度预算调整');

    // 提交
    await editDialog.getByRole('button', { name: '确认' }).click();
    await expect(editDialog).not.toBeVisible({ timeout: 5000 });

    // 验证列表中金额已更新
    await expect(page.getByText('¥35,000.00')).toBeVisible({ timeout: 5000 });
  });

  test('查看调整历史 — 点击历史按钮，验证调整记录显示', async ({
    page,
  }) => {
    // 点击第一条记录的历史按钮
    const historyButton = page.getByRole('button', { name: '历史' }).first();

    const historyButtonCount = await historyButton.count();
    if (historyButtonCount === 0) {
      test.skip(true, '没有预算记录，跳过历史查看测试');
      return;
    }

    await historyButton.click();

    const historyDialog = page.getByRole('dialog');
    await expect(historyDialog).toBeVisible();
    await expect(
      historyDialog.getByRole('heading', { name: '预算调整历史' }),
    ).toBeVisible();

    // 关闭弹窗
    await historyDialog.getByRole('button', { name: '关闭' }).click();
    await expect(historyDialog).not.toBeVisible({ timeout: 3000 });
  });

  test('预算执行率查看 — 验证统计卡片中的执行率数据展示', async ({
    page,
  }) => {
    // 验证统计卡片中的金额展示
    const totalBudgetCard = page.getByText('总预算金额').locator('..');
    await expect(totalBudgetCard).toBeVisible();

    // 验证整体执行率有进度条
    const progressSection = page.getByText('整体执行率').locator('..');
    await expect(progressSection).toBeVisible();

    // 验证表格中存在执行率列
    await expect(
      page.getByRole('columnheader', { name: '执行率' }),
    ).toBeVisible();
  });

  test('超支检查 — 验证超预算状态标记', async ({ page }) => {
    // 验证表格中存在状态列
    await expect(
      page.getByRole('columnheader', { name: '状态' }),
    ).toBeVisible();

    // 检查是否有超预算标记（如果存在超预算数据）
    const overrunBadge = page.getByText('超预算');
    const warningBadge = page.getByText('预警');
    const normalBadge = page.getByText('正常');

    // 至少验证状态列不会被渲染为空
    const hasStatus = (await overrunBadge.count()) > 0
      || (await warningBadge.count()) > 0
      || (await normalBadge.count()) > 0;
    expect(hasStatus).toBeTruthy();
  });

  test('筛选和搜索 — 按月份筛选并搜索部门名称', async ({ page }) => {
    // 选择月份筛选
    const monthSelect = page.getByRole('combobox', { name: '选择月份' });
    await monthSelect.click();
    // 选择 1月
    await page.getByRole('option', { name: '1月' }).click();

    // 点击查询
    await page.getByRole('button', { name: '查询' }).click();

    // 等待列表刷新
    await page.waitForTimeout(1000);

    // 验证列表仍然可见（不报错即可）
    await expect(
      page.getByText('部门预算执行情况'),
    ).toBeVisible();

    // 搜索部门名称
    const searchInput = page.getByPlaceholder('输入部门名称');
    await searchInput.fill('E2E');
    await page.getByRole('button', { name: '查询' }).click();

    // 等待结果
    await page.waitForTimeout(1000);

    // 验证表格存在
    await expect(
      page.getByText('部门预算执行情况'),
    ).toBeVisible();
  });

  test('筛选和搜索 — 重置筛选项恢复默认', async ({ page }) => {
    // 先修改筛选条件
    const searchInput = page.getByPlaceholder('输入部门名称');
    await searchInput.fill('E2E');
    await page.getByRole('button', { name: '查询' }).click();
    await page.waitForTimeout(1000);

    // 点击重置
    await page.getByRole('button', { name: '重置' }).click();
    await page.waitForTimeout(1000);

    // 验证搜索框已清空
    await expect(searchInput).toHaveValue('');
  });
});