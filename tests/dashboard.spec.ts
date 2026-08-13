import { expect, test } from '@playwright/test';

test('desktop renders real data and keeps the product name on one line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await expect(page.getByText('真实数据', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '表现地图' })).toBeVisible();
  const logo = page.locator('.sidebar .logo b');
  await expect(logo).toHaveText('哔哩哔哩数据看板');
  const oneLine = await logo.evaluate((node) => {
    const range = document.createRange(); range.selectNodeContents(node);
    return range.getClientRects().length === 1 && getComputedStyle(node).whiteSpace === 'nowrap';
  });
  expect(oneLine).toBeTruthy();
  const targets = await page.locator('button:visible').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
  expect(Math.min(...targets)).toBeGreaterThanOrEqual(44);
  await expect(page.locator('.overviewCover')).toHaveJSProperty('complete', true);
  expect(await page.locator('.overviewCover').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.overviewMapChart canvas')).toBeVisible();
  await page.getByRole('button', { name: '表现地图' }).click();
  await expect(page.getByRole('heading', { name: '表现地图' })).toBeVisible();
  await expect(page.locator('.mapChart canvas')).toBeVisible();
  await page.getByRole('button', { name: '分析实验室' }).click();
  await page.getByRole('button', { name: '运行查询' }).click();
  await expect(page.locator('.labChart canvas')).toBeVisible();
  await page.getByRole('button', { name: /切换深浅色/ }).click({ position: { x: 20, y: 20 } });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('data source reports a successful self-run acquisition', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await page.getByRole('button', { name: '数据源' }).click();
  await expect(page.getByText('已连接真实账号')).toBeVisible();
  await expect(page.locator('.runHero b')).toHaveText('success');
  await expect(page.getByText('100.0%')).toBeVisible();
});

test('phone keeps core pages within the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone');
  await page.goto('/');
  await expect(page.getByRole('main').getByText('哔哩哔哩数据看板', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: '稿件' }).click();
  await expect(page.getByRole('heading', { name: '稿件' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: '实验室' }).click();
  await expect(page.getByRole('heading', { name: '分析实验室' })).toBeVisible();
});

test('tablet renders the real overview without overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad');
  await page.goto('/');
  await expect(page.getByText('真实数据', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
