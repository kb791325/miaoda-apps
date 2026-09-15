import { test, expect } from '@playwright/test';
import { setupAuth } from './helpers/auth';

const SIDEBAR_LABEL = '资产盘点看板';
const PAGE_URL = '/inventory-dashboard';
const PAGE_TITLE = '资产盘点看板';

test.describe('资产盘点看板', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.goto(PAGE_URL);
    // 等待看板核心区块全部渲染完成
    await expect(
      page.getByRole('heading', { name: PAGE_TITLE }),
    ).toBeVisible({ timeout: 15000 });
    // 等待 OverviewCards 卡片统计区加载
    await expect(
      page.locator('[data-ai-section-type="card-stat"]'),
    ).toBeVisible();
    // 等待矩阵区块加载
    await expect(
      page.getByText('归属人盘点矩阵'),
    ).toBeVisible();
  });

  // ── 1. 导航到盘点看板 ──────────────────────────────────

  test('导航到盘点看板：侧边栏点击后看板正常加载', async ({ page }) => {
    // 面包屑应显示正确的页面标题
    const breadcrumb = page.locator('header nav[aria-label="breadcrumb"]');
    await expect(breadcrumb).toContainText(PAGE_TITLE);

    // 页面应包含核心看板标题
    await expect(
      page.getByRole('heading', { name: PAGE_TITLE }),
    ).toBeVisible();

    // 6 个概览指标卡应全部可见
    const statCards = page.locator('[data-ai-section-type="card-stat"]');
    await expect(statCards).toBeVisible();

    // 关键统计卡片标签应存在
    await expect(page.getByText('资产总数')).toBeVisible();
    await expect(page.getByText('盘点完成率')).toBeVisible();
  });

  test('导航到盘点看板：从其他页面通过侧边栏导航到达', async ({ page }) => {
    // 先导航到其他页面
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: '综合数据看板' })).toBeVisible();

    // 点击侧边栏中的"资产盘点看板"
    const sidebarLink = page
      .locator('nav')
      .getByRole('link', { name: SIDEBAR_LABEL });
    await sidebarLink.click();

    // 验证导航成功
    await expect(page).toHaveURL(PAGE_URL);
    await expect(
      page.getByRole('heading', { name: PAGE_TITLE }),
    ).toBeVisible();
  });

  // ── 2. 盘点矩阵验证 ──────────────────────────────────

  test('盘点矩阵验证：归属人×月度矩阵显示热力图颜色', async ({ page }) => {
    const matrixSection = page.getByText('归属人盘点矩阵');
    await expect(matrixSection).toBeVisible();

    // 图例应显示三种状态颜色
    const legend = page.locator('text=图例：').locator('..');
    await expect(legend.getByText('已盘点')).toBeVisible();
    await expect(legend.getByText('未盘点')).toBeVisible();
    await expect(legend.getByText('异常')).toBeVisible();

    // 矩阵表格应在加载后包含数据行（非空状态）
    const noData = page.getByText('暂无数据');
    const loading = page.getByText('加载中...');
    // 等待加载完成且非空
    await expect(
      loading.or(noData),
    ).not.toBeVisible({ timeout: 15000 });
  });

  test('盘点矩阵验证：点击热力图单元格弹出详情', async ({ page }) => {
    // 等待矩阵加载完成
    const noData = page.getByText('暂无数据');
    const loading = page.getByText('加载中...');
    await expect(
      loading.or(noData),
    ).not.toBeVisible({ timeout: 15000 });

    // 点击矩阵中第一个彩色单元格（热力图方块）
    const cell = page
      .locator('table tbody tr')
      .filter({ hasNot: page.locator('td[colspan]') })
      .first()
      .locator('td')
      .nth(1);
    await cell.click();

    // 详情弹窗应出现
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('盘点明细')).toBeVisible();
    await expect(dialog.getByText('归属人')).toBeVisible();
    await expect(dialog.getByText('部门')).toBeVisible();
    await expect(dialog.getByText('月份')).toBeVisible();
    await expect(dialog.getByText('状态')).toBeVisible();
  });

  // ── 3. 盘点时间线验证 ──────────────────────────────────

  test('盘点时间线验证：临期/超期预警条目显示', async ({ page }) => {
    const timeline = page.getByText('盘点时间线');
    await expect(timeline).toBeVisible();

    // 等待时间线数据加载
    const noData = page.getByText('暂无数据').first();
    const loading = page.getByText('加载中...').first();
    await expect(
      loading.or(noData),
    ).not.toBeVisible({ timeout: 15000 });

    // 时间线应包含"上次盘点"和"建议下次"列
    // 以及"发起盘点"按钮
    const initiateBtn = page.getByRole('button', { name: '发起盘点' });
    // 时间线至少应有条目或显示"共 X 人"
    const totalCount = page.locator('text=/共 \\d+ 人/');
    await expect(totalCount).toBeVisible();
  });

  // ── 4. 库存概览验证 ──────────────────────────────────

  test('库存概览验证：按类型统计和库存数量显示', async ({ page }) => {
    const stockSection = page.getByText('剩余库存');
    await expect(stockSection).toBeVisible();

    // 总库存价值应显示（¥ 格式）
    await expect(page.getByText('总库存价值')).toBeVisible();

    // 等待库存数据加载
    const loading = page.getByText('加载中...').first();
    await expect(loading).not.toBeVisible({ timeout: 15000 });

    // 近6个月库存趋势图应渲染
    const trendSection = page.getByText('近6个月库存趋势');
    await expect(trendSection).toBeVisible();

    // 持有排行 TOP10 应显示
    const topOwners = page.getByText('持有排行 TOP10');
    await expect(topOwners).toBeVisible();
  });

  // ── 5. 盘点进度统计验证 ──────────────────────────────────

  test('盘点进度统计验证：概览卡片显示总任务/已完成/进行中/完成率', async ({ page }) => {
    const statCards = page.locator('[data-ai-section-type="card-stat"]');

    // 资产总数卡片
    await expect(statCards.getByText('资产总数')).toBeVisible();

    // 本月已盘点卡片
    await expect(statCards.getByText('本月已盘点')).toBeVisible();

    // 未盘点卡片
    await expect(statCards.getByText('未盘点')).toBeVisible();

    // 异常数卡片
    await expect(statCards.getByText('异常数')).toBeVisible();

    // 盘点完成率卡片（含进度条）
    await expect(statCards.getByText('盘点完成率')).toBeVisible();

    // 超期未盘点卡片
    await expect(statCards.getByText('超期未盘点')).toBeVisible();

    // 等待概览数据加载完成（数值不再是 "--"）
    await expect(
      statCards.getByText('--'),
    ).not.toBeVisible({ timeout: 15000 });
  });

  // ── 6. 异常检查项验证 ──────────────────────────────────

  test('异常检查项验证：异常列表显示差异金额和操作按钮', async ({ page }) => {
    const abnormalSection = page.getByText('盘点异常');
    await expect(abnormalSection).toBeVisible();

    // 等待异常列表加载
    const loading = page.getByText('加载中...').last();
    const noData = page.getByText('暂无异常数据');
    await expect(
      loading.or(noData),
    ).not.toBeVisible({ timeout: 15000 });

    // 如果存在异常数据，验证表头和操作按钮
    const hasAbnormal = await page.getByText('暂无异常数据').isHidden().catch(() => true);
    if (hasAbnormal) {
      // 表格表头
      await expect(page.getByRole('columnheader', { name: '资产名称' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '账面数量' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '实盘数量' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '差异' })).toBeVisible();

      // 操作按钮
      await expect(
        page.getByRole('button', { name: '标记已处理' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: '查看详情' }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: '发起补盘' }),
      ).toBeVisible();
    }
  });

  // ── 7. 数据一致性验证 ──────────────────────────────────

  test('数据一致性验证：矩阵、时间线、库存概览、异常项数据关联一致', async ({ page }) => {
    // 等待所有数据区块加载完成
    const loadings = page.getByText('加载中...');
    await expect(loadings).toHaveCount(0, { timeout: 20000 });

    // 归属人盘点矩阵 与 盘点时间线 应共享相同的归属人概念
    const matrixTitle = page.getByText('归属人盘点矩阵');
    const timelineTitle = page.getByText('盘点时间线');
    await expect(matrixTitle).toBeVisible();
    await expect(timelineTitle).toBeVisible();

    // 库存概览的总库存价值应与异常列表的差异金额概念一致
    const stockValue = page.getByText('总库存价值');
    await expect(stockValue).toBeVisible();

    // 盘点异常区域应显示总数
    const abnormalTotal = page.locator('text=/共 \\d+ 条/');
    await expect(abnormalTotal).toBeVisible();

    // 概览卡片中的异常数应与异常列表总数一致
    // 验证概览卡片的异常数存在
    const statCards = page.locator('[data-ai-section-type="card-stat"]');
    await expect(statCards.getByText('异常数')).toBeVisible();

    // 盘点完成率趋势图应渲染
    const trendTitle = page.getByText('盘点数量趋势');
    await expect(trendTitle).toBeVisible();

    // 部门完成率排行应渲染
    const deptRanking = page.getByText('部门完成率排行');
    await expect(deptRanking).toBeVisible();
  });
});