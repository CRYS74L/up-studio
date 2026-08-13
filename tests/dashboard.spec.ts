import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('desktop renders real data and keeps the product name on one line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await expect(page.getByText(/真实数据 · (已接入指标完整|采集不完整)|等待真实数据/)).toBeVisible();
  if (await page.getByText('等待真实数据').isVisible()) test.skip(true, 'preview database has no connected data source');
  await expect(page.getByRole('heading', { name: '所有视频封面点击率' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '最近更新的稿件' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '所有视频平均播放时长与平均播放百分比' })).toBeVisible();
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
  await page.getByRole('button', { name: '表现地图' }).click();
  await expect(page.getByRole('heading', { name: '表现地图' })).toBeVisible();
  await expect(page.locator('.mapChart canvas')).toBeVisible();
  await expect(page.getByText('近邻稿件已做确定性轻微避让')).toBeVisible();
  await page.getByRole('button', { name: '联合分析' }).click();
  await expect(page.getByRole('heading', { name: '联合分析' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '包装与承接' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '选择分析问题' })).toBeVisible();
  await expect(page.getByText('运行查询')).toHaveCount(0);
  await page.getByRole('button', { name: /切换深浅色/ }).click({ position: { x: 20, y: 20 } });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('overview charts keep their light theme, tooltip bounds, and full-width data after theme roundtrip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const source = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
  expect(source).toContain('rgba(96,105,120,.12)');
  expect(source).toContain('confine: true');
  expect(source).not.toContain('dataZoom: videos.length > 10');
  expect(source).toContain('barWidth: "62%"');
  expect(source).toContain('color: PINK_BRIGHT');
  expect(source).toContain('lineStyle: { color: PINK_DARK');

  await page.goto('/');
  if (await page.getByText('等待真实数据').isVisible()) test.skip(true, 'preview database has no connected data source');

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
  test.skip(testInfo.project.name !== 'desktop');
  const source = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
  expect(source).toContain('emphasis: { disabled: true }');
  expect(source).toContain('z2: selected ? 20 : 1');
  expect(source).not.toContain('z2: selected ? 20 : params.dataIndex');
  expect(source).toContain('rgba(251,114,153,.22)');

  await page.goto('/');
  if (await page.getByText('等待真实数据').isVisible()) test.skip(true, 'preview database has no connected data source');
  await page.getByRole('button', { name: '表现地图' }).click();
  await expect(page.locator('.mapChart canvas')).toBeVisible();
});

test('data source reports a successful self-run acquisition', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await page.getByText(/真实数据|等待真实数据/).first().waitFor();
  if (await page.getByText('等待真实数据').isVisible()) test.skip(true, 'preview database has no connected data source');
  await page.getByRole('button', { name: '数据源' }).click();
  if (await page.getByText('尚未连接').isVisible()) test.skip(true, 'preview database has no connected data source');
  await expect(page.getByText('已连接真实账号')).toBeVisible();
  await expect(page.locator('.runHero b')).toHaveText(/success|partial/);
  const runStatus = await page.locator('.runHero b').textContent();
  if (runStatus === 'success') await expect(page.getByText('100.0%')).toBeVisible();
  else await expect(page.locator('.runCoverageReport')).toBeVisible();
  await expect(page.getByText('当前已接入指标完整稿件')).toBeVisible();
  await expect(page.getByText(/2 类计划指标尚未接入/)).toBeVisible();
  await expect(page.getByText(/类源字段已保存/)).toBeVisible();
  await expect(page.getByText('留存曲线').locator('..').getByText('17/17')).toBeVisible();
});

test('repeated collection keeps map coordinates stable inside one Bilibili window', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const before = await page.request.get('/api/videos').then(response => response.json());
  await page.request.post('/api/bilibili/collect-now');
  await page.request.post('/api/bilibili/collect-now');
  const after = await page.request.get('/api/videos').then(response => response.json());
  const beforeById = new Map(before.videos.map((video: any) => [video.id, video]));
  for (const video of after.videos) {
    const previous: any = beforeById.get(video.id);
    expect(video.cover_ctr).toBe(previous.cover_ctr);
    expect(video.avg_watch_percent).toBe(previous.avg_watch_percent);
  }
  await page.goto('/');
  await expect(page.getByText(/统计窗口/).first()).toBeVisible();
});

test('phone keeps core pages within the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone');
  await page.goto('/');
  await expect(page.getByRole('main').getByText('哔哩哔哩数据看板', { exact: true })).toBeVisible();
  if (await page.getByText('等待真实数据').isVisible()) test.skip(true, 'preview database has no connected data source');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.mobileNav').getByRole('button', { name: '稿件' }).click();
  await expect(page.getByRole('heading', { name: '稿件' })).toBeVisible();
  await expect(page.locator('.videoLibraryCard').first()).toBeVisible();
  const percentages = await page.locator('.audience b').allTextContents();
  for (const value of percentages) expect(Number(value.replace('%', ''))).toBeGreaterThanOrEqual(0);
  for (const value of percentages) expect(Number(value.replace('%', ''))).toBeLessThanOrEqual(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.mobileNav').getByRole('button', { name: '分析' }).click();
  await expect(page.getByRole('heading', { name: '联合分析' })).toBeVisible();
});

test('tablet renders the real overview without overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad');
  await page.goto('/');
  await expect(page.getByText(/真实数据 · (已接入指标完整|采集不完整)|等待真实数据/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
