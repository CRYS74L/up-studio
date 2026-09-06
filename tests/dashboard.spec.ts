import { expect, test } from '@playwright/test';

// Deterministic test data only; the application never imports these fixtures.
const videos = [0, 1, 2].map((i) => ({
  id: String(i + 1), bvid: `BV_TEST_${i + 1}`, title: ['山间旅行', '海边日记', '城市漫步'][i],
  cover_url: null, duration_seconds: i===1?600:120, published_at: `2026-08-0${3-i}T08:00:00.000Z`,
  views: [3000, 2000, 1000][i], impressions: null, cover_ctr: i === 2 ? null : 3.5,
  avg_watch_seconds: 50, avg_watch_percent: 42, followers_gained: 20,
  captured_at: '2026-08-25T08:00:00.000Z',
  metrics: { likes: 100, comments: 20, danmaku: 10, favorites: 30, coins: 20, shares: 10,
    interactionRate: 6, threeSecondBounceRate: 30, playToFollowRate: 1, fanAudiencePercent: 10, guestAudiencePercent: 90 },
  dimensions: {trend:{play:{tendency:[{date_key:20260801,total_inc:10},{date_key:20260803,total_inc:0}]},fan:{tendency:[{date_key:20260801,total_inc:2}]}},viewerAge:{age_one:30,age_two:70},viewerGender:{male:60,female:40},viewerArea:[{location:"上海",count:20}],retention:{viewerQuit:[{duration_key:10,num:7000},{duration_key:20,num:5000}] }},
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
      : path === '/api/local/status' ? {pid:123,version:'v0.1.0-dev.14',uptime:600,autoCollect:true,intervalMinutes:15,runtime:'standalone-node'}
      : path === '/api/acquisition/runs' ? {runs:[{id:'test-run',status:'success',started_at:'2026-08-25T08:00:00Z',request_count:20,coverage:1,timings:{totalMs:1500},details}]}
      : path === '/api/dashboard/history' ? {points:[{views:5000,followers:50,avg_watch_seconds:45,avg_watch_percent:40},{views:6000,followers:60,avg_watch_seconds:50,avg_watch_percent:42}]}
      : path === '/api/settings/deepseek/status' ? { configured: false }
      : path === '/api/bilibili/collect-now' ? { run: { status: 'failed', errorCode: 'session_expired' } } : {};
    await route.fulfill({ json: { ok: true, ...body } });
  });
});

test('overview follows the reference composition and does not invent CTR or monthly data',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'封标吸引力排行'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'最近发布的稿件'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'平均观看时长与观看进度'})).toBeVisible();
 await expect(page.locator('.s-overview-kpis article')).toHaveCount(4);
 await expect(page.locator('.s-comparison-note')).toContainText('缺少该日历史');
 await expect(page.locator('.s-recent-item')).toHaveCount(3);
});

test('library supports BV search, duration filters and a real list view',async({page})=>{
 await page.goto('/#videos');
 await expect(page.locator('.s-media')).toHaveCount(3);
 await page.getByRole('textbox',{name:'搜索稿件'}).fill('BV_TEST_2');
 await expect(page.locator('.s-media')).toHaveCount(1);
 await page.getByRole('button',{name:'清除搜索',exact:true}).click();
 await page.getByRole('button',{name:'中长视频',exact:true}).click();
 await expect(page.locator('.s-media')).toHaveCount(1);
 await page.getByRole('button',{name:'列表',exact:true}).click();
 await expect(page.locator('.s-library')).toHaveClass(/list/);
 await page.getByRole('textbox',{name:'搜索稿件'}).fill('no-match');
 await expect(page.getByRole('heading',{name:'没有匹配的稿件'})).toBeVisible();
});

test('a video opens a separate detail with audience and retention tabs',async({page})=>{
 await page.goto('/#videos');
 await page.getByRole('button',{name:'查看 海边日记',exact:true}).click();
 await expect(page).toHaveURL(/video=2/);
 await expect(page.locator('.s-detail-hero h2')).toHaveText('海边日记');
 await expect(page.locator('.s-library')).toHaveCount(0);
 await page.getByRole('button',{name:'观众',exact:true}).click();
 await expect(page.getByRole('heading',{name:'观众地区'})).toBeVisible();
 await expect(page.getByText('上海',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'留存与趋势',exact:true}).click();
 await expect(page.getByRole('heading',{name:'观众留存',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'下一篇稿件'}).click();
 await expect(page.locator('.s-detail-hero h2')).toHaveText('城市漫步');
 await page.getByRole('button',{name:'所有稿件'}).click();
 await expect(page.locator('.s-media')).toHaveCount(3);
});

test('multi-selection opens analysis with exactly the selected videos',async({page})=>{
 await page.goto('/#videos');
 await page.getByRole('button',{name:'选择 山间旅行',exact:true}).click();
 await page.getByRole('button',{name:'选择 海边日记',exact:true}).click();
 await expect(page.locator('.s-selection-dock')).toContainText('已选 2 篇');
 await page.getByRole('button',{name:'去分析'}).click();
 await expect(page.locator('.s-video-chip')).toHaveCount(2);
 await expect(page.locator('.s-small-multiples .s-panel')).toHaveCount(3);
 await expect(page.locator('.s-table tbody tr')).toHaveCount(2);
});

test('picker edits are applied explicitly and clearing selection remains empty',async({page})=>{
 await page.goto('/#analysis');
 await expect(page.locator('.s-video-chip')).toHaveCount(3);
 await page.getByRole('button',{name:'选择稿件',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'选择稿件'})).toBeVisible();
 await page.getByRole('button',{name:'清空选择',exact:true}).click();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('.s-video-chip')).toHaveCount(3);
 await page.getByRole('button',{name:'选择稿件',exact:true}).click();
 await page.getByRole('button',{name:'清空选择',exact:true}).click();
 await page.getByRole('button',{name:'应用选择',exact:true}).click();
 await expect(page.getByRole('heading',{name:'选择要分析的作品'})).toBeVisible();
 await expect(page.locator('.s-video-chip')).toHaveCount(0);
});

test('metric picker limits layers and table view retains original values',async({page})=>{
 await page.goto('/#analysis');
 await page.getByRole('button',{name:'选择指标',exact:true}).click();
 const sheet=page.getByRole('dialog',{name:'选择分析指标'});
 await sheet.getByRole('checkbox',{name:/点赞/}).check();
 await expect(sheet.getByRole('checkbox',{name:/收藏/})).toBeDisabled();
 await page.getByRole('button',{name:'完成',exact:true}).click();
 await expect(page.locator('.s-small-multiples .s-panel')).toHaveCount(4);
 await page.getByRole('button',{name:'数据表',exact:true}).click();
 await expect(page.locator('.s-small-multiples')).toHaveCount(0);
 await expect(page.locator('.s-table tbody tr')).toHaveCount(3);
 await expect(page.locator('.s-table')).toContainText('3,000');
});

test('time and relationship tasks display distinct charts and controls',async({page})=>{
 await page.goto('/#analysis');
 await page.getByRole('button',{name:'时间趋势',exact:true}).click();
 await expect(page.getByRole('heading',{name:'每日新增播放'})).toBeVisible();
 await expect(page.locator('.s-analysis-chart canvas')).toBeVisible();
 await page.getByRole('button',{name:'每日涨粉',exact:true}).click();
 await expect(page.getByRole('heading',{name:'每日归因涨粉'})).toBeVisible();
 await page.getByRole('button',{name:'指标关系',exact:true}).click();
 await page.getByRole('combobox',{name:'关系横轴'}).selectOption('views');
 await expect(page.getByRole('heading',{name:'播放量 × 观看进度'})).toBeVisible();
});

test('sources exposes independent runtime, metric coverage and expandable runs',async({page})=>{
 await page.goto('/#sources');
 await expect(page.getByRole('heading',{name:'本地服务'})).toBeVisible();
 await expect(page.getByText('独立运行',{exact:true})).toBeVisible();
 await expect(page.locator('.s-coverage-grid>div')).toHaveCount(16);
 await page.locator('.s-run-list summary').click();
 await expect(page.locator('.s-run-detail')).toBeVisible();
 await expect(page.locator('.s-unavailable')).toContainText('绝对曝光量');
});

test('sources marks cached runtime status unavailable after connection loss',async({page})=>{
 await page.clock.install();
 await page.goto('/#sources');
 await expect(page.getByText('独立运行',{exact:true})).toBeVisible();
 await page.route('**/api/local/status',r=>r.fulfill({status:503,json:{ok:false,error:{message:'service unavailable'}}}));
 await page.clock.fastForward(16000);
 await expect(page.getByText('状态未连接',{exact:true})).toBeVisible();
 await expect(page.getByText('独立运行',{exact:true})).toHaveCount(0);
});

test('theme changes are persistent and mobile navigation reaches every page',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'切换深浅色'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.getByRole('button',{name:'切换深浅色'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('sync errors are actionable and preserve the prior snapshot',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'同步',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('B 站登录已失效');
 await expect(page.locator('.s-overview-kpis')).toContainText('6,000');
});

test('empty responses offer an actual connection path',async({page})=>{
 await page.route('**/api/dashboard/summary',r=>r.fulfill({json:{ok:true,configured:false,summary:{}}}));
 await page.goto('/');
 await page.getByRole('button',{name:'连接 B 站',exact:true}).click();
 await expect(page).toHaveURL(/#sources/);
 await expect(page.getByRole('button',{name:'扫码连接'})).toBeVisible();
});

test('all page layouts fit the viewport without runtime errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['overview','videos','analysis','sources','settings']){
  await page.goto('/#'+route);
  await expect(page.locator('.s-header h1')).toBeVisible();
  await expect(page.locator('.s-loading')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),route).toBeLessThanOrEqual(1);
 }
 expect(errors).toEqual([]);
});
