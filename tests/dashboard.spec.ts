import { expect, test } from '@playwright/test';

test('desktop dashboard interactions and design tokens', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /早上好/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /视频封面点击率/ })).toBeVisible();
  const cards = page.locator('.kpiStrip article');
  const radii = await cards.evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).borderRadius));
  expect(new Set(radii).size).toBe(1);
  const touchTargets = await page.locator('button:visible').evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().height));
  expect(Math.min(...touchTargets)).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: /切换深浅色/ }).click({ position: { x: 20, y: 20 } });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /问问数据/ }).click();
  await expect(page.getByRole('heading', { name: '问问数据' })).toBeVisible();
});

test('phone uses task-first list without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '稿件表现' })).toBeVisible();
  await expect(page.locator('.dashboardGrid .mapPanel')).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /展开地图/ }).click();
  await expect(page.locator('.mapPanel.fullscreen')).toBeVisible();
  await page.locator('.mapPanel.fullscreen .iconButton').click();
  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
});

test('tablet reflows diagnosis under the map', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'ipad');
  await page.goto('/');
  const map = await page.locator('.mapPanel').boundingBox();
  const diagnosis = await page.locator('.diagnosis').boundingBox();
  expect(map && diagnosis && diagnosis.y > map.y).toBeTruthy();
});
