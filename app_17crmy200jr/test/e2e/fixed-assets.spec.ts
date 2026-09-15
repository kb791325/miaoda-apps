import { test, expect, type Page } from '@playwright/test';
import { setupAuth } from './helpers/auth';

const SIDEBAR_LABEL = '固定资产管理';
const PAGE_TITLE = '固定资产管理';
const PAGE_SUBTITLE = '资产台账全生命周期管理';
const NEW_ASSET_BTN = /新增资产|添加资产/;
const SEARCH_BTN = '搜索';
const RESET_BTN = '重置';

/** 导航到固定资产管理页面并等待数据加载 */
async function goToFixedAssets(page: Page) {
  await setupAuth(page);
  await page.goto('/fixed-assets');
  // 等待标题出现
  await expect(page.getByRole('heading', { name: PAGE_TITLE })).toBeVisible();
  // 等待表格加载（不再显示"加载中..."）
  await page.waitForFunction(() => {
    const body = document.body.innerText;
    return !body.includes('加载中...');
  }, { timeout: 15000 });
}

/** 通过资产名称在表格中找到对应行 */
function getRowByName(page: Page, name: string) {
  return page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
}

test.describe('固定资产管理', () => {
  test.describe.configure({ mode: 'serial' });

  let createdAssetName: string;

  test('导航到固定资产页面 — 验证页面标题和表格', async ({ page }) => {
    await goToFixedAssets(page);

    // 验证页面标题
    await expect(page.getByRole('heading', { name: PAGE_TITLE })).toBeVisible();
    // 验证副标题
    await expect(page.getByText(PAGE_SUBTITLE)).toBeVisible();

    // 验证汇总卡片
    await expect(page.getByText('资产总数')).toBeVisible();
    await expect(page.getByText('资产总价值')).toBeVisible();
    await expect(page.getByText('在库数量')).toBeVisible();
    await expect(page.getByText('在用数量')).toBeVisible();

    // 验证表格存在
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
  });

  test('新增固定资产 — 填写表单并提交', async ({ page }) => {
    await goToFixedAssets(page);

    // 点击新增资产按钮
    await page.getByRole('button', { name: NEW_ASSET_BTN }).click();

    // 等待弹窗出现
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('新增资产')).toBeVisible();

    // 生成唯一资产名称
    createdAssetName = `E2E测试资产_${Date.now()}`;

    // 填写资产名称
    await dialog.getByLabel('资产名称').fill(createdAssetName);

    // 选择资产类型（第一个可用选项）
    const typeSelect = dialog.getByLabel('资产类型');
    await typeSelect.click();
    // 等待下拉内容出现并选择第一个非 placeholder 选项
    const typeOption = page.getByRole('option').filter({ hasNotText: /请选择/ }).first();
    await typeOption.waitFor({ state: 'visible', timeout: 5000 });
    await typeOption.click();

    // 填写采购日期
    await dialog.getByLabel('采购日期').fill('2026-06-15');

    // 填写采购金额
    await dialog.getByLabel('采购金额').fill('8800');

    // 选择使用楼层
    const floorSelect = dialog.getByLabel('使用楼层');
    await floorSelect.click();
    await page.getByRole('option', { name: '3F' }).click();

    // 填写当前库存
    await dialog.getByLabel('商品数量（当前库存）').fill('5');

    // 提交表单
    await dialog.getByRole('button', { name: /确认新增/ }).click();

    // 等待 toast 提示
    await expect(page.getByText(/资产已新增|创建成功/)).toBeVisible({ timeout: 10000 });

    // 验证弹窗关闭
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // 验证新资产出现在表格中
    await expect(page.getByText(createdAssetName)).toBeVisible({ timeout: 10000 });
  });

  test('资产状态操作 — 领用资产（在库→在用）', async ({ page }) => {
    await goToFixedAssets(page);

    // 找到刚创建的资产行，点击查看
    const assetRow = getRowByName(page, createdAssetName);
    await assetRow.getByRole('button', { name: '查看' }).click();

    // 等待详情弹窗
    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByText('资产详情')).toBeVisible({ timeout: 10000 });

    // 点击领用按钮
    await detailDialog.getByRole('button', { name: '领用' }).click();

    // 等待操作弹窗
    const opDialog = page.getByRole('dialog').filter({ hasText: '资产领用' });
    await expect(opDialog).toBeVisible({ timeout: 5000 });

    // 填写领用原因
    await opDialog.getByLabel(/领用原因/).fill('E2E测试领用');

    // 点击确认提交
    await opDialog.getByRole('button', { name: '确认提交' }).click();

    // 等待成功提示
    await expect(page.getByText(/领用成功/)).toBeVisible({ timeout: 10000 });
  });

  test('资产状态操作 — 归还资产（在用→在库）', async ({ page }) => {
    await goToFixedAssets(page);

    // 找到资产行，点击查看
    const assetRow = getRowByName(page, createdAssetName);
    await assetRow.getByRole('button', { name: '查看' }).click();

    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByText('资产详情')).toBeVisible({ timeout: 10000 });

    // 点击归还按钮
    await detailDialog.getByRole('button', { name: '归还' }).click();

    const opDialog = page.getByRole('dialog').filter({ hasText: '资产归还' });
    await expect(opDialog).toBeVisible({ timeout: 5000 });

    // 填写备注
    await opDialog.getByLabel('备注').fill('E2E测试归还');

    // 确认提交
    await opDialog.getByRole('button', { name: '确认提交' }).click();

    await expect(page.getByText(/归还成功/)).toBeVisible({ timeout: 10000 });
  });

  test('资产状态操作 — 发起维修（在库→维修）', async ({ page }) => {
    await goToFixedAssets(page);

    const assetRow = getRowByName(page, createdAssetName);
    await assetRow.getByRole('button', { name: '查看' }).click();

    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByText('资产详情')).toBeVisible({ timeout: 10000 });

    // 点击维修按钮
    await detailDialog.getByRole('button', { name: '维修' }).click();

    const opDialog = page.getByRole('dialog').filter({ hasText: '发起维修' });
    await expect(opDialog).toBeVisible({ timeout: 5000 });

    // 填写故障原因
    await opDialog.getByLabel(/故障原因/).fill('E2E测试故障');

    // 确认提交
    await opDialog.getByRole('button', { name: '确认提交' }).click();

    await expect(page.getByText(/发起维修成功/)).toBeVisible({ timeout: 10000 });
  });

  test('资产状态操作 — 完成维修（维修→在库）', async ({ page }) => {
    await goToFixedAssets(page);

    const assetRow = getRowByName(page, createdAssetName);
    await assetRow.getByRole('button', { name: '查看' }).click();

    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByText('资产详情')).toBeVisible({ timeout: 10000 });

    // 点击完成维修按钮
    await detailDialog.getByRole('button', { name: '完成维修' }).click();

    const opDialog = page.getByRole('dialog').filter({ hasText: '完成维修' });
    await expect(opDialog).toBeVisible({ timeout: 5000 });

    // 填写实际费用
    await opDialog.getByLabel(/实际费用/).fill('500');

    // 确认提交
    await opDialog.getByRole('button', { name: '确认提交' }).click();

    await expect(page.getByText(/完成维修成功/)).toBeVisible({ timeout: 10000 });
  });

  test('资产状态操作 — 报废资产（在库→报废）', async ({ page }) => {
    await goToFixedAssets(page);

    const assetRow = getRowByName(page, createdAssetName);
    await assetRow.getByRole('button', { name: '查看' }).click();

    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByText('资产详情')).toBeVisible({ timeout: 10000 });

    // 点击报废按钮
    await detailDialog.getByRole('button', { name: '报废' }).click();

    const opDialog = page.getByRole('dialog').filter({ hasText: '资产报废' });
    await expect(opDialog).toBeVisible({ timeout: 5000 });

    // 填写报废原因
    await opDialog.getByLabel(/报废原因/).fill('E2E测试报废');

    // 确认提交
    await opDialog.getByRole('button', { name: '确认提交' }).click();

    await expect(page.getByText(/报废成功/)).toBeVisible({ timeout: 10000 });
  });

  test('筛选和搜索 — 按资产类型筛选', async ({ page }) => {
    await goToFixedAssets(page);

    // 点击资产类型下拉
    const typeFilter = page.getByLabel('资产类型');
    await typeFilter.click();

    // 选择第一个非"全部类型"的选项
    const typeOption = page.getByRole('option').filter({ hasNotText: '全部类型' }).first();
    const optionText = await typeOption.textContent();
    await typeOption.click();

    // 等待筛选结果
    await page.waitForTimeout(500);

    // 验证表格中至少有一行，且该行的资产类型匹配
    if (optionText && optionText.trim()) {
      const badge = page.getByRole('row').nth(1).locator('td').nth(1); // 资产类型列
      await expect(badge).toContainText(optionText.trim());
    }
  });

  test('筛选和搜索 — 按资产状态筛选', async ({ page }) => {
    await goToFixedAssets(page);

    // 先重置筛选条件
    await page.getByRole('button', { name: RESET_BTN }).click();
    await page.waitForTimeout(500);

    // 点击资产状态下拉
    const statusFilter = page.getByLabel('资产状态');
    await statusFilter.click();

    // 选择"在库"
    await page.getByRole('option', { name: '在库' }).click();
    await page.waitForTimeout(500);

    // 验证可见的状态标签都包含"在库"
    const statusCells = page.getByRole('row').locator('td').nth(3);
    const count = await statusCells.count();
    for (let i = 0; i < count; i++) {
      const text = await statusCells.nth(i).textContent();
      if (text) {
        expect(text.trim()).toBe('在库');
      }
    }
  });

  test('筛选和搜索 — 按资产名称搜索', async ({ page }) => {
    await goToFixedAssets(page);

    // 重置筛选
    await page.getByRole('button', { name: RESET_BTN }).click();
    await page.waitForTimeout(500);

    // 输入搜索关键词
    const keywordInput = page.getByPlaceholder('资产名称 / 类目');
    await keywordInput.fill(createdAssetName);

    // 点击搜索
    await page.getByRole('button', { name: SEARCH_BTN }).click();
    await page.waitForTimeout(500);

    // 验证搜索结果包含目标资产
    await expect(page.getByText(createdAssetName)).toBeVisible({ timeout: 10000 });
  });

  test('查看资产详情 — 验证基本信息和折旧信息', async ({ page }) => {
    await goToFixedAssets(page);

    // 重置并搜索
    await page.getByRole('button', { name: RESET_BTN }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('资产名称 / 类目').fill(createdAssetName);
    await page.getByRole('button', { name: SEARCH_BTN }).click();
    await page.waitForTimeout(500);

    // 点击查看
    const assetRow = getRowByName(page, createdAssetName);
    await assetRow.getByRole('button', { name: '查看' }).click();

    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByText('资产详情')).toBeVisible({ timeout: 10000 });

    // 验证基本信息
    await expect(detailDialog.getByText('基本信息')).toBeVisible();
    await expect(detailDialog.getByText(createdAssetName)).toBeVisible();

    // 验证折旧信息
    await expect(detailDialog.getByText('折旧信息')).toBeVisible();
    await expect(detailDialog.getByText('原值')).toBeVisible();
    await expect(detailDialog.getByText('累计折旧')).toBeVisible();
    await expect(detailDialog.getByText('净值')).toBeVisible();
    await expect(detailDialog.getByText('折旧年限')).toBeVisible();

    // 关闭详情
    await page.keyboard.press('Escape');
    await expect(detailDialog).not.toBeVisible({ timeout: 5000 });
  });

  test('编辑资产 — 修改资产名称', async ({ page }) => {
    await goToFixedAssets(page);

    // 搜索目标资产
    await page.getByPlaceholder('资产名称 / 类目').fill(createdAssetName);
    await page.getByRole('button', { name: SEARCH_BTN }).click();
    await page.waitForTimeout(500);

    // 点击编辑
    const assetRow = getRowByName(page, createdAssetName);
    await assetRow.getByRole('button', { name: '编辑' }).click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByText('编辑资产')).toBeVisible({ timeout: 10000 });

    // 修改资产名称
    const newName = `${createdAssetName}_已编辑`;
    await editDialog.getByLabel('资产名称').fill(newName);

    // 提交
    await editDialog.getByRole('button', { name: /保存修改/ }).click();

    // 等待成功提示
    await expect(page.getByText('资产已更新')).toBeVisible({ timeout: 10000 });

    // 更新变量以便后续测试使用
    createdAssetName = newName;
  });

  test('删除资产 — 确认删除并验证', async ({ page }) => {
    await goToFixedAssets(page);

    // 搜索目标资产
    await page.getByPlaceholder('资产名称 / 类目').fill(createdAssetName);
    await page.getByRole('button', { name: SEARCH_BTN }).click();
    await page.waitForTimeout(500);

    // 点击删除
    const assetRow = getRowByName(page, createdAssetName);
    await assetRow.getByRole('button', { name: '删除' }).click();

    // 弹出确认对话框
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await expect(alertDialog.getByText('确认删除')).toBeVisible();
    await expect(alertDialog.getByText(/删除后数据无法恢复/)).toBeVisible();

    // 确认删除
    await alertDialog.getByRole('button', { name: '确认删除' }).click();

    // 等待成功提示
    await expect(page.getByText('资产已删除')).toBeVisible({ timeout: 10000 });

    // 验证资产已从表格中移除
    await expect(page.getByText(createdAssetName)).not.toBeVisible({ timeout: 10000 });
  });
});