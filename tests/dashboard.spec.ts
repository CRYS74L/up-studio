import { expect, test } from '@playwright/test';

test('desktop renders real data and keeps the product name on one line', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'desktop') test.skip();
  await page.goto('/');
  await expect(page.getByText(/真实数据 · (已接入指标完整|采集不完整)|等待真实数据/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '所有视频封面点击率' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '最近更新的稿件' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '观看深度总览' })).toBeVisible();
  await expect(page.locator('.kpiDelta')).toHaveCount(6);
  await expect(page.locator('.kpiDelta').first()).toContainText(/较上个可比快照|暂无可比快照/);
  await expect(page.locator('.homeDashboard .mapChart')).toHaveCount(0);
  const logo = page.locator('.sidebar .logo b');
  await expect(logo).toHaveText('哔哩哔哩数据看板');
  const oneLine = await logo.evaluate((node) => {
    const range = document.createRange(); range.selectNodeContents(node);
    return range.getClientRects().length === 1 && getComputedStyle(node).whiteSpace === 'nowrap';
  });
  expect(oneLine).toBeTruthy();
  const targets = await page.locator('button:visible').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(Math.min(...targets)).toBeGreaterThanOrEqual(44);
  await expect(page.locator('.recentVideoCard img').first()).toHaveJSProperty('complete', true);
  expect(await page.locator('.recentVideoCard img').first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const zeroStackWarning = page.getByText('缺失稿件未以 0 代替');
  if (await zeroStackWarning.isVisible()) await expect(zeroStackWarning).toBeVisible();
  await page.getByRole('button', { name: '内容吸引力矩阵' }).click();
  await expect(page.getByRole('heading', { name: '封面吸引力 × 观看深度矩阵' })).toBeVisible();
  await expect(page.locator('.mapChart canvas')).toBeVisible();
  await expect(page.getByText('近邻稿件已做确定性轻微避让')).toBeVisible();
  for (const label of ['低点击 · 高深度', '高点击 · 高深度', '低点击 · 低深度', '高点击 · 低深度']) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
  }
  await page.getByRole('button', { name: '联合分析' }).click();
  await expect(page.getByRole('heading', { name: '联合分析' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '指标图层' })).toBeVisible();
  await expect(page.getByText('把不同指标叠加到同一张图表')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '播放量' })).toBeChecked();
  await expect(page.locator('.jointAnalysisChart canvas')).toBeVisible();
  await expect(page.getByText(/气泡大小|气泡图/)).toHaveCount(0);
  await page.getByRole('button', { name: /切换深浅色/ }).click({ position: { x: 20, y: 20 } });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('overview charts keep their light theme, tooltip bounds, and full-width data after theme roundtrip', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'desktop') test.skip();
  await page.goto('/');

  const themeButton = page.getByRole('button', { name: '切换深浅色' });
  if (await page.locator('html').getAttribute('data-theme') === 'dark') await themeButton.click();
  await themeButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await themeButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const ctrChart = page.locator('.homeCtrChart');
  const ctrBox = await ctrChart.boundingBox();
  expect(ctrBox).not.toBeNull();
  await ctrChart.hover({ position: { x: Math.max(12, ctrBox!.width * 0.72), y: 44 } });
  const tooltip = ctrChart.locator('div[style*="position: absolute"]').filter({ hasText: '封面点击率' }).first();
  if (await tooltip.count()) {
    await expect(tooltip).toBeVisible();
    const tipBox = await tooltip.boundingBox();
    expect(tipBox).not.toBeNull();
    expect(tipBox!.x).toBeGreaterThanOrEqual(ctrBox!.x - 1);
    expect(tipBox!.x + tipBox!.width).toBeLessThanOrEqual(ctrBox!.x + ctrBox!.width + 1);
  }

  const watchChart = page.locator('.homeWatchChart');
  const watchSize = await watchChart.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(watchSize.scrollWidth).toBe(watchSize.clientWidth);
  expect(watchSize.pageOverflow).toBeLessThanOrEqual(1);

});

test('performance map hover cannot reorder bubbles while selection can', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'desktop') test.skip();
  await page.goto('/');
  await page.getByRole('button', { name: '内容吸引力矩阵' }).click();
  await expect(page.locator('.mapChart canvas')).toBeVisible();
});

test('video selection opens a wide visual diagnostic workbench', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'desktop') test.skip();
  await page.goto('/');
  await page.getByRole('button', { name: '稿件' }).click();
  await expect(page.locator('.videoLibraryCard').first()).toBeVisible();
  await page.locator('.videoLibraryCard').nth(1).click();
  const detail = page.locator('.videoDetailWorkbench');
  await expect(detail).toBeVisible();
  expect((await detail.boundingBox())!.width).toBeGreaterThan(900);
  await expect(detail.locator('canvas')).toHaveCount(4);
  await expect(detail.getByRole('heading', { name: '诊断漏斗' })).toBeVisible();
  await expect(detail.getByRole('heading', { name: '互动构成' })).toBeVisible();
  await expect(detail.getByRole('heading', { name: '观众构成' })).toBeVisible();
});

test('joint analysis lets metrics share one non-bubble chart', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'desktop') test.skip();
  await page.goto('/');
  await page.getByRole('button', { name: '联合分析' }).click();
  const layers = page.locator('.analysisLayerChip');
  const before = await layers.count();
  await page.getByRole('checkbox', { name: '涨粉量' }).check();
  await expect(layers).toHaveCount(before + 1);
  await page.getByRole('checkbox', { name: '播放量' }).uncheck();
  await expect(layers).toHaveCount(before);
  await expect(page.locator('.jointAnalysisChart canvas')).toBeVisible();
});

test('data source reports a successful self-run acquisition', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'desktop') test.skip();
  await page.goto('/');
  await page.getByText(/真实数据|等待真实数据/).first().waitFor();
  await page.getByRole('button', { name: '数据源' }).click();
  await expect(page.getByText('已连接真实账号')).toBeVisible();
  await expect(page.locator('.runHero b')).toHaveText(/success|partial/);
  const runStatus = await page.locator('.runHero b').textContent();
  if (runStatus === 'success') await expect(page.getByText('100.0%')).toBeVisible();
  else await expect(page.locator('.runCoverageReport')).toBeVisible();
  await expect(page.getByText('当前已接入指标完整稿件')).toBeVisible();
  await expect(page.getByText(/2 类计划指标尚未接入/)).toBeVisible();
  await expect(page.getByText(/类源字段已保存/)).toBeVisible();
  await expect(page.locator('.capabilityCoverage span').filter({ hasText: '留存曲线' })).toContainText('17/17');
});

test('content matrix keeps coordinates stable when the underlying snapshot is unchanged', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'desktop') test.skip();
  await page.goto('/');
  await page.getByRole('button', { name: '内容吸引力矩阵' }).click();
  const canvas = page.locator('.mapChart canvas');
  await expect(canvas).toBeVisible();
  const before = await canvas.screenshot();
  await page.getByRole('button', { name: '概览' }).click();
  await page.getByRole('button', { name: '内容吸引力矩阵' }).click();
  await expect(canvas).toBeVisible();
  expect(await canvas.screenshot()).toEqual(before);
});

test('phone keeps core pages within the viewport', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'iphone') test.skip();
  await page.goto('/');
  await expect(page.getByRole('main').getByText('哔哩哔哩数据看板', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.mobileNav').getByRole('button', { name: '稿件' }).click();
  await expect(page.getByRole('heading', { name: '稿件' })).toBeVisible();
  await expect(page.locator('.videoLibraryCard').first()).toBeVisible();
  const percentages = await page.locator('.audienceVisual b').allTextContents();
  for (const value of percentages) expect(Number(value.replace('%', ''))).toBeGreaterThanOrEqual(0);
  for (const value of percentages) expect(Number(value.replace('%', ''))).toBeLessThanOrEqual(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.mobileNav').getByRole('button', { name: '分析' }).click();
  await expect(page.getByRole('heading', { name: '联合分析' })).toBeVisible();
});

test('tablet renders the real overview without overflow', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'ipad') test.skip();
  await page.goto('/');
  await expect(page.getByText(/真实数据 · (已接入指标完整|采集不完整)|等待真实数据/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
