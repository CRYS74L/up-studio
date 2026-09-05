import { expect, test } from '@playwright/test';

// Deterministic test data only; the application never imports these fixtures.
const videos = [0, 1, 2].map((i) => ({
  id: String(i + 1), bvid: `BV_TEST_${i + 1}`, title: ['山间旅行', '海边日记', '城市漫步'][i],
  cover_url: null, duration_seconds: 120, published_at: `2026-08-0${3-i}T08:00:00.000Z`,
  views: [3000, 2000, 1000][i], impressions: null, cover_ctr: i === 2 ? null : 3.5,
  avg_watch_seconds: 50, avg_watch_percent: 42, followers_gained: 20,
  captured_at: '2026-08-25T08:00:00.000Z',
  metrics: { likes: 100, comments: 20, danmaku: 10, favorites: 30, coins: 20, shares: 10,
    interactionRate: 6, threeSecondBounceRate: 30, playToFollowRate: 1, fanAudiencePercent: 10, guestAudiencePercent: 90 },
  dimensions: {},
}));
const details = { totalVideos: 3, completeVideos: 2, metricCounts: { views: 3, coverAttractionScore: 2 }, missingByVideo: [], warnings: [], plannedNotIntegrated: ['absoluteCoverCtr','impressions','recommendationTrafficSources'], capabilityCounts: {} };
const summary = { configured: true, freshnessMinutes: 15000, summary: { views: 6000, followers: 60, cover_ctr: 3.5, avg_watch_percent: 42, avg_watch_seconds: 50, interaction_rate: 6, fresh: videos[0].captured_at }, comparison: {}, acquisition: { status: 'partial', coverage: .67, details } };

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/api/covers/')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#a8bcca"/></svg>' });
    const body = path === '/api/dashboard/summary' ? summary : path === '/api/videos' ? { videos }
      : path.endsWith('/timeseries') ? { points: [] }
      : path === '/api/bilibili/status' ? { connected: false, lastRun: null }
      : path === '/api/settings/deepseek/status' ? { configured: false }
      : path === '/api/bilibili/collect-now' ? { run: { status: 'failed', errorCode: 'session_expired' } } : {};
    await route.fulfill({ json: { ok: true, ...body } });
  });
});

test('overview presents stale data honestly and switches metrics without replacing the canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '创作表现' })).toBeVisible();
  await expect(page.locator('.snapshotStatus')).toContainText('历史快照');
  await expect(page.locator('.healthFootnote')).toContainText('不计入');
  await page.locator('.iosPerformanceChart canvas').evaluate((node) => node.setAttribute('data-lifecycle-proof', 'kept'));
  await page.getByRole('button', { name: '观看质量', exact: true }).click();
  await expect(page.getByRole('button', { name: '观看质量', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.iosPerformanceChart canvas')).toHaveAttribute('data-lifecycle-proof', 'kept');
  await page.getByText('查看图表数据', { exact: true }).click();
  await expect(page.locator('.chartTable tbody tr')).toHaveCount(3);
});

test('overview identifies its monthly baseline and uses a readable type scale', async ({ page }) => {
  await page.route('**/api/dashboard/summary', (route) => route.fulfill({ json: { ok: true, ...summary,
    comparisonPeriod: { label: '2026年7月25日' }, comparisonCapturedAt: '2026-07-25T08:00:00.000Z',
    comparison: { views: { current: 6000, previous: 5000, delta: 1000, changePercent: 20, direction: 'up', deltaKind: 'percent' } },
  } }));
  await page.goto('/');
  await expect(page.locator('.comparisonBasis')).toContainText('2026/07/25');
  await expect(page.locator('.metricComparison').first()).toContainText('较一个月前');
  await expect(page.getByText('较上个快照')).toHaveCount(0);
  const sizes = await page.evaluate(() => ({ title: parseFloat(getComputedStyle(document.querySelector('.iosTitle h1')!).fontSize), number: parseFloat(getComputedStyle(document.querySelector('.metricCells strong')!).fontSize), caption: parseFloat(getComputedStyle(document.querySelector('.metricComparison')!).fontSize) }));
  expect(sizes.title).toBeLessThanOrEqual(30);
  expect(sizes.number).toBeLessThanOrEqual(28);
  expect(sizes.caption).toBeGreaterThanOrEqual(12);
});

test('a recent video opens the correct detail and BV search falls back to a valid selected result', async ({ page }) => {
  await page.goto('/');
  await page.locator('.iosVideoRow').nth(1).click();
  await expect(page).toHaveURL(/#videos\?video=2$/);
  await expect(page.locator('.videoDetailWorkbench h2')).toHaveText('海边日记');
  await page.getByRole('textbox', { name: '搜索标题或 BV 号' }).fill('BV_TEST_3');
  await expect(page.locator('.videoLibraryCard')).toHaveCount(1);
  await expect(page.locator('.videoDetailWorkbench h2')).toHaveText('城市漫步');
  await page.getByRole('textbox', { name: '搜索标题或 BV 号' }).fill('no-match');
  await expect(page.getByText('没有匹配的稿件')).toBeVisible();
  await page.getByRole('textbox', { name: '搜索标题或 BV 号' }).fill('');
  await expect(page.locator('.videoLibraryCard')).toHaveCount(3);
});

test('detail groups show the requested section and do not mislabel score as a percentage funnel', async ({ page }) => {
  await page.goto('/#videos?video=1');
  await expect(page.locator('.videoDetailWorkbench h2')).toHaveText('山间旅行');
  await page.getByRole('group', { name: '稿件详情分组' }).getByRole('button', { name: '观看质量' }).click();
  await expect(page.getByRole('heading', { name: '观看与转化' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '观众留存曲线' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '互动构成' })).not.toBeVisible();
  await expect(page.getByText('不同口径的比例并列对照，不构成逐级漏斗；封标星级不换算成点击率。')).toBeVisible();
});

test('an insight can switch to another video while already on the detail page', async ({ page }) => {
  await page.goto('/#videos?video=2');
  await expect(page.locator('.videoDetailWorkbench h2')).toHaveText('海边日记');
  await page.getByRole('button', { name: '查看创作建议' }).click();
  await page.locator('.insightItem').first().click();
  await expect(page).toHaveURL(/#videos\?video=1$/);
  await expect(page.locator('.videoDetailWorkbench h2')).toHaveText('山间旅行');
  await page.goBack();
  await expect(page.locator('.videoDetailWorkbench h2')).toHaveText('海边日记');
});

test('analysis clear stays empty and selecting a single video restores one data row', async ({ page }) => {
  await page.goto('/#analysis');
  const rail = page.locator('.analysisSelectionRail');
  await expect(rail).toBeVisible();
  await rail.getByRole('button', { name: '清除', exact: true }).click();
  await expect(page.getByText('请选择至少一篇稿件')).toBeVisible();
  await expect(rail.locator('button[aria-pressed="true"]')).toHaveCount(0);
  await rail.getByRole('button', { name: '山间旅行', exact: true }).click();
  await expect(rail.locator('button[aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('.jointAnalysisChart canvas')).toBeVisible();
  await page.getByRole('radio', { name: '相对尺度' }).check();
  await expect(page.getByText('每项指标映射为自身稿件范围内的相对位置。')).toBeVisible();
});

test('theme switches on all pages; drawer closes with Escape and restores focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '切换深浅色' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: '切换深浅色' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: '查看创作建议' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('基于当前快照的本地统计。没有调用 AI，也没有向外部服务发送数据。')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看创作建议' })).toBeFocused();
});

test('sync failure has an actionable message and never claims success', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '同步数据', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('B 站登录已失效');
  await expect(page.getByText('已获取最新快照')).toHaveCount(0);
  await expect(page.locator('.metricCells')).toContainText('6,000');
});

test('automatic refresh requests videos from the new summary snapshot', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('.metricCells')).toContainText('6,000');
  const capturedAt = '2026-09-05T08:00:00.000Z';
  await page.route('**/api/dashboard/summary', (route) => route.fulfill({ json: { ok: true, ...summary, freshnessMinutes: 0, summary: { ...summary.summary, views: 9000, fresh: capturedAt } } }));
  const requested = page.waitForRequest((r) => new URL(r.url()).pathname === '/api/videos' && new URL(r.url()).searchParams.get('capturedAt') === capturedAt);
  await page.clock.fastForward(61_000);
  await requested;
  await expect(page.locator('.metricCells')).toContainText('9,000');
});

test('snapshot export downloads data without credentials', async ({ page }) => {
  await page.goto('/#settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^bilibili-snapshot-.*\.json$/);
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const payload = JSON.parse(Buffer.concat(chunks).toString());
  expect(payload.videos).toHaveLength(3);
  expect(payload.capturedAt).toBe(summary.summary.fresh);
  expect(JSON.stringify(payload)).not.toMatch(/SESSDATA|api_key|ciphertext|MASTER_ENCRYPTION/);
});

test('all core pages stay within viewport and emit no runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of ['overview','videos','matrix','analysis','sources','settings']) {
    await page.goto(`/#${route}`);
    await expect(page.locator('.iosTitle h1')).toBeVisible();
    await expect(page.locator('.pageStage')).not.toBeEmpty();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test('empty and failed responses have useful recovery routes', async ({ page }) => {
  await page.route('**/api/dashboard/summary', (route) => route.fulfill({ status: 503, json: { ok: false, error: { message: '暂时无法连接' } } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '暂时无法读取数据' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible();
  await page.route('**/api/dashboard/summary', (route) => route.fulfill({ json: { ok: true, configured: false, summary: {} } }));
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.getByRole('button', { name: '连接 B 站' })).toBeVisible();
});
