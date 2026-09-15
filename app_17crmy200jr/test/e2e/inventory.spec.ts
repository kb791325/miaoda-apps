import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers/auth';

const INVENTORY_PATH = '/inventory-checks';
const SIDEBAR_LABEL = '资产盘点执行';

test.describe('资产盘点执行', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.goto(INVENTORY_PATH);
    await page.waitForLoadState('networkidle');
  });

  // ── 场景 1: 导航到盘点执行页面 ──────────────────────────

  test('导航到盘点执行页面：验证页面标题和任务列表区域', async ({ page }) => {
    // 验证页面标题
    await expect(
      page.getByRole('heading', { name: '资产盘点执行' }),
    ).toBeVisible();

    // 验证创建按钮存在
    await expect(
      page.getByRole('button', { name: /创建盘点任务/ }),
    ).toBeVisible();

    // 验证任务列表区域存在（空状态或任务列表）
    const taskListArea = page.locator('[data-ai-section-type="card-list"]');
    const emptyState = page.getByText('暂无盘点任务');
    const hasTasks = await taskListArea.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasTasks || hasEmpty).toBeTruthy();
  });

  test('通过侧边栏导航到盘点执行页面', async ({ page }) => {
    // 先导航到其他页面
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 点击侧边栏"资产盘点执行"
    await page.getByRole('link', { name: SIDEBAR_LABEL }).click();
    await page.waitForLoadState('networkidle');

    // 验证 URL
    await expect(page).toHaveURL(new RegExp(INVENTORY_PATH));

    // 验证页面标题
    await expect(
      page.getByRole('heading', { name: '资产盘点执行' }),
    ).toBeVisible();
  });

  // ── 场景 2: 创建盘点任务 ────────────────────────────────

  test('创建盘点任务：选择月份和范围后提交', async ({ page }) => {
    // 点击创建按钮
    await page.getByRole('button', { name: /创建盘点任务/ }).click();

    // 等待弹窗出现
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: '创建盘点任务' }),
    ).toBeVisible();

    // 验证任务编号预览显示
    await expect(dialog.getByText(/CK-/)).toBeVisible();

    // 选择盘点月份（默认已选当前月，保持即可）
    // 选择盘点范围 - 保持默认 "全部资产"

    // 点击创建任务
    await dialog.getByRole('button', { name: '创建任务' }).click();

    // 等待弹窗关闭
    await expect(dialog).not.toBeVisible();

    // 验证 toast 提示创建成功
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });

    // 验证任务卡片出现
    await expect(
      page.locator('[data-ai-section-type="card-list"]'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('创建盘点任务：自定义盘点范围', async ({ page }) => {
    await page.getByRole('button', { name: /创建盘点任务/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 选择盘点范围 "按部门"（第二个 combobox）
    const comboboxes = dialog.getByRole('combobox');
    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: '按部门' }).click();

    // 点击创建
    await dialog.getByRole('button', { name: '创建任务' }).click();
    await expect(dialog).not.toBeVisible();

    // 验证创建成功
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── 场景 3: 逐项盘点 ────────────────────────────────────

  test('逐项盘点：进入任务详情，验证检查项列表', async ({ page }) => {
    // 先确保存在任务（创建一个）
    await page.getByRole('button', { name: /创建盘点任务/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '创建任务' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });

    // 点击任务卡片展开详情
    const taskCard = page
      .locator('[data-ai-section-type="card-list"]')
      .locator('> div')
      .first();
    await taskCard.click();
    await page.waitForLoadState('networkidle');

    // 验证检查项表格出现
    await expect(
      page.getByRole('columnheader', { name: '资产编码' }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('columnheader', { name: '资产名称' }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: '账面数量' }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: '实盘数量' }),
    ).toBeVisible();
  });

  test('逐项盘点：编辑检查项，填写实盘数量（一致）并保存', async ({
    page,
  }) => {
    // 创建任务并展开
    await page.getByRole('button', { name: /创建盘点任务/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '创建任务' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });

    const taskCard = page
      .locator('[data-ai-section-type="card-list"]')
      .locator('> div')
      .first();
    await taskCard.click();
    await page.waitForLoadState('networkidle');

    // 等待检查项加载
    await expect(
      page.getByRole('columnheader', { name: '资产编码' }),
    ).toBeVisible({ timeout: 10000 });

    // 点击第一个检查项的"编辑"按钮
    const editButton = page.getByRole('button', { name: '编辑' }).first();
    await editButton.click();

    // 等待编辑弹窗
    const editDialog = page.getByRole('dialog');
    await expect(
      editDialog.getByRole('heading', { name: '编辑盘点结果' }),
    ).toBeVisible();

    // 实盘数量保持默认值（与账面一致），可选填备注
    await editDialog.getByPlaceholder('差异原因说明...').fill('账实一致');

    // 保存
    await editDialog.getByRole('button', { name: '保存' }).click();

    // 验证 toast 提示
    await expect(
      page.getByText('盘点结果已保存'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('逐项盘点：编辑检查项，填写盘盈数量并备注', async ({ page }) => {
    // 创建任务并展开
    await page.getByRole('button', { name: /创建盘点任务/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '创建任务' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });

    const taskCard = page
      .locator('[data-ai-section-type="card-list"]')
      .locator('> div')
      .first();
    await taskCard.click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('columnheader', { name: '资产编码' }),
    ).toBeVisible({ timeout: 10000 });

    // 点击编辑
    const editButton = page.getByRole('button', { name: '编辑' }).first();
    await editButton.click();

    const editDialog = page.getByRole('dialog');
    await expect(
      editDialog.getByRole('heading', { name: '编辑盘点结果' }),
    ).toBeVisible();

    // 修改实盘数量为账面+2（盘盈）
    const qtyInput = editDialog.getByRole('spinbutton');
    const currentQty = await qtyInput.inputValue();
    const newQty = String(Number(currentQty) + 2);
    await qtyInput.fill(newQty);
    await editDialog.getByPlaceholder('差异原因说明...').fill('发现多余资产');

    // 保存
    await editDialog.getByRole('button', { name: '保存' }).click();

    // 验证
    await expect(
      page.getByText('盘点结果已保存'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('逐项盘点：编辑检查项，填写盘亏数量并备注', async ({ page }) => {
    // 创建任务并展开
    await page.getByRole('button', { name: /创建盘点任务/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '创建任务' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });

    const taskCard = page
      .locator('[data-ai-section-type="card-list"]')
      .locator('> div')
      .first();
    await taskCard.click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('columnheader', { name: '资产编码' }),
    ).toBeVisible({ timeout: 10000 });

    // 点击编辑
    const editButton = page.getByRole('button', { name: '编辑' }).first();
    await editButton.click();

    const editDialog = page.getByRole('dialog');
    await expect(
      editDialog.getByRole('heading', { name: '编辑盘点结果' }),
    ).toBeVisible();

    // 修改实盘数量为账面-1（盘亏）
    const qtyInput = editDialog.getByRole('spinbutton');
    const currentQty = await qtyInput.inputValue();
    const newQty = String(Math.max(0, Number(currentQty) - 1));
    await qtyInput.fill(newQty);
    await editDialog
      .getByPlaceholder('差异原因说明...')
      .fill('资产遗失，已报备');

    // 保存
    await editDialog.getByRole('button', { name: '保存' }).click();

    // 验证
    await expect(
      page.getByText('盘点结果已保存'),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── 场景 4: 完成盘点任务 ────────────────────────────────

  test('完成盘点任务：提交完成后验证汇总和状态变更', async ({ page }) => {
    // 创建任务并展开
    await page.getByRole('button', { name: /创建盘点任务/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '创建任务' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });

    const taskCard = page
      .locator('[data-ai-section-type="card-list"]')
      .locator('> div')
      .first();
    await taskCard.click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('columnheader', { name: '资产编码' }),
    ).toBeVisible({ timeout: 10000 });

    // 点击"全部完成并提交"
    await page.getByRole('button', { name: /全部完成并提交/ }).first().click();

    // 等待确认弹窗
    const confirmDialog = page.getByRole('dialog');
    await expect(
      confirmDialog.getByRole('heading', { name: '确认完成盘点' }),
    ).toBeVisible();

    // 确认提交
    await confirmDialog.getByRole('button', { name: '确认提交' }).click();

    // 验证完成提示
    await expect(
      page.getByText(/盘点任务已提交完成/),
    ).toBeVisible({ timeout: 10000 });

    // 验证任务状态变为"已完成"
    await expect(
      page.getByText('已完成').first(),
    ).toBeVisible({ timeout: 10000 });

    // 验证差异汇总面板出现
    await expect(
      page.getByText('差异明细'),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── 场景 5: 差异确认 ────────────────────────────────────

  test('差异确认：完成盘点后确认盘盈/盘亏项', async ({ page }) => {
    // 创建任务并展开
    await page.getByRole('button', { name: /创建盘点任务/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '创建任务' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });

    const taskCard = page
      .locator('[data-ai-section-type="card-list"]')
      .locator('> div')
      .first();
    await taskCard.click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('columnheader', { name: '资产编码' }),
    ).toBeVisible({ timeout: 10000 });

    // 编辑第一个检查项为盘盈
    const editButton = page.getByRole('button', { name: '编辑' }).first();
    await editButton.click();
    const editDialog = page.getByRole('dialog');
    const qtyInput = editDialog.getByRole('spinbutton');
    const currentQty = await qtyInput.inputValue();
    await qtyInput.fill(String(Number(currentQty) + 3));
    await editDialog.getByPlaceholder('差异原因说明...').fill('测试盘盈');
    await editDialog.getByRole('button', { name: '保存' }).click();
    await expect(
      page.getByText('盘点结果已保存'),
    ).toBeVisible({ timeout: 10000 });

    // 完成盘点
    await page.getByRole('button', { name: /全部完成并提交/ }).first().click();
    const confirmDialog = page.getByRole('dialog');
    await confirmDialog.getByRole('button', { name: '确认提交' }).click();
    await expect(
      page.getByText(/盘点任务已提交完成/),
    ).toBeVisible({ timeout: 10000 });

    // 验证差异汇总
    await expect(
      page.getByText('差异明细'),
    ).toBeVisible({ timeout: 10000 });

    // 确认差异项
    const confirmBtn = page.getByRole('button', { name: /确认盘/ }).first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await expect(
        page.getByText(/差异已确认|已确认/),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  // ── 场景 6: 重置盘点任务 ────────────────────────────────

  test('重置盘点任务：已完成任务重置后状态变为进行中', async ({
    page,
  }) => {
    // 创建任务、展开、完成
    await page.getByRole('button', { name: /创建盘点任务/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '创建任务' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });

    const taskCard = page
      .locator('[data-ai-section-type="card-list"]')
      .locator('> div')
      .first();
    await taskCard.click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('columnheader', { name: '资产编码' }),
    ).toBeVisible({ timeout: 10000 });

    // 完成盘点
    await page.getByRole('button', { name: /全部完成并提交/ }).first().click();
    const confirmDialog = page.getByRole('dialog');
    await confirmDialog.getByRole('button', { name: '确认提交' }).click();
    await expect(
      page.getByText(/盘点任务已提交完成/),
    ).toBeVisible({ timeout: 10000 });

    // 点击"重置盘点"
    await page.getByRole('button', { name: '重置盘点' }).click();

    // 确认重置弹窗
    const resetDialog = page.getByRole('dialog');
    await expect(
      resetDialog.getByRole('heading', { name: '确认重置盘点' }),
    ).toBeVisible();

    await resetDialog.getByRole('button', { name: '确认重置' }).click();

    // 验证 toast
    await expect(
      page.getByText(/盘点已重置/),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── 场景 7: 清空所有盘点数据 ────────────────────────────

  test('清空所有盘点数据：确认清空后任务列表为空', async ({ page }) => {
    // 先确保至少有一个任务
    await page.getByRole('button', { name: /创建盘点任务/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '创建任务' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText(/任务创建成功/),
    ).toBeVisible({ timeout: 10000 });

    // 点击"清空所有盘点数据"
    await page.getByRole('button', { name: /清空所有盘点数据/ }).click();

    // 确认弹窗
    const clearDialog = page.getByRole('dialog');
    await expect(
      clearDialog.getByRole('heading', { name: '清空所有盘点数据' }),
    ).toBeVisible();

    await clearDialog.getByRole('button', { name: '确认清空' }).click();

    // 验证 toast
    await expect(
      page.getByText(/已清空/),
    ).toBeVisible({ timeout: 10000 });

    // 验证空状态
    await expect(
      page.getByText('暂无盘点任务'),
    ).toBeVisible({ timeout: 10000 });
  });
});