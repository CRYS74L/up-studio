import { expect, test, type Page } from '@playwright/test';

async function themeLandscape(page:Page){
 const viewport=page.viewportSize();
 if(viewport&&viewport.height>=viewport.width)await page.setViewportSize({width:viewport.height,height:viewport.width});
}

test('embedded fonts load before text layout and use downloaded faces', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/fonts/*.woff2', async route => { await gate; await route.continue(); });
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#root')).toBeEmpty();
  release();
  await expect(page.locator('.s-main h1')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();
  expect(await page.evaluate(() => [400,700].every(w => document.fonts.check(`${w} 14px "UP Studio UI"`)))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('400 12px "UP Studio Chart"'))).toBe(true);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const {root} = await cdp.send('DOM.getDocument');
  const {nodeId} = await cdp.send('DOM.querySelector', {nodeId:root.nodeId,selector:'.s-main h1'});
  const {fonts} = await cdp.send('CSS.getPlatformFontsForNode', {nodeId});
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.every(font => font.isCustomFont)).toBe(true);
});

test('failed embedded font downloads offer a working reload', async ({page}) => {
  let fail = true;
  await page.route('**/fonts/*.woff2', route => fail ? route.abort() : route.continue());
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('字体加载失败');
  await expect(page.locator('.s-main')).toHaveCount(0);
  fail = false;
  await page.getByRole('button', {name:'重新加载',exact:true}).click();
  await expect(page.locator('.s-main h1')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

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
const summary = { configured: true, freshnessMinutes: 15000, summary: { account_followers:3382,avg_views:2000,avg_interactions:190,views: 6000, followers: 60, cover_ctr: 3.5, avg_watch_percent: 42, avg_watch_seconds: 50, interaction_rate: 6, fresh: videos[0].captured_at }, comparison: {}, acquisition: { status: 'partial', coverage: .67, details } };

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/api/covers/')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#a8bcca"/></svg>' });
    const body = path === '/api/account/profile' ? {profile:{uid:'123',name:'测试UP主',avatar:null},accounts:[]} : path === '/api/dashboard/summary' ? summary : path === '/api/videos' ? { videos }
      : path === '/api/account/history' ? {points:[{day:'2026-08-24',follows:12,unfollows:3},{day:'2026-08-25',follows:7,unfollows:2}]}
      : path.endsWith('/history') && path.startsWith('/api/videos/') ? {series:{play:{recent30:[{date_key:1785542400,total_inc:10},{date_key:1785628800,total_inc:20}],first48h:[{date_key:1785542400,total_inc:3}],first30d:[{date_key:1785542400,total_inc:30}],lifetime:[{date_key:1785542400,total_inc:10}]}}}
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
 await expect(page.getByRole('heading',{name:'封标点击率'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'最近发布的稿件'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'平均播放时长与完播率'})).toHaveCount(0);
 await expect(page.locator('.s-overview-kpis article')).toHaveCount(4);
 await expect(page.locator('.s-comparison-note')).toHaveCount(0);
 await expect(page.locator('.s-recent-item')).toHaveCount(3);
});

test('library shows all durations in a grid without external quality metrics and keeps search and sort',async({page})=>{
 await page.route(url=>url.pathname==='/api/videos',r=>r.fulfill({json:{ok:true,videos:videos.map((v,i)=>({...v,views:[1000,3000,2000][i]}))}}));
 await page.goto('/#videos');
 await expect(page.locator('.s-media')).toHaveCount(3);
 await page.getByRole('textbox',{name:'搜索稿件'}).fill('BV_TEST_2');
 await expect(page.locator('.s-media')).toHaveCount(1);
 await page.getByRole('button',{name:'清除搜索',exact:true}).click();
 await expect(page.locator('.s-media')).toHaveCount(3);
 await expect(page.getByRole('group',{name:'稿件时长',exact:true})).toHaveCount(0);
 await expect(page.getByRole('group',{name:'浏览方式',exact:true})).toHaveCount(0);
 for(const label of ['封标点击率','平均播放时长','平均播放百分比'])await expect(page.locator('.s-library').getByText(label,{exact:true})).toHaveCount(0);
 expect(await page.locator('.s-library').evaluate(e=>getComputedStyle(e).display)).toBe('grid');
 await choose(page,'稿件排序','播放量');
 await expect(page.locator('.s-media h2').first()).toHaveText('海边日记');
 await page.getByRole('textbox',{name:'搜索稿件'}).fill('no-match');
 await expect(page.getByRole('heading',{name:'没有匹配的稿件'})).toBeVisible();
 await page.getByRole('button',{name:'清除筛选',exact:true}).click();
 await expect(page.locator('.s-media')).toHaveCount(3);
});

test('a video opens a separate detail with audience and retention tabs',async({page})=>{
 await page.goto('/#videos');
 await page.getByRole('button',{name:'查看 海边日记',exact:true}).click();
 await expect(page).toHaveURL(/video=2/);
 await expect(page.locator('.s-detail-hero h2')).toHaveText('海边日记');
 await expect(page.locator('.s-library')).toHaveCount(0);
 for(const label of ['封标点击率','平均播放时长','平均播放百分比'])await expect(page.locator('.s-detail-kpis').getByText(label,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'观众',exact:true}).click();
 await expect(page.getByRole('heading',{name:'地域分布'})).toBeVisible();
 await expect(page.getByText('上海',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'表现',exact:true}).click();
 await expect(page.getByRole('heading',{name:'观众留存',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'下一篇稿件'}).click();
 await expect(page.locator('.s-detail-hero h2')).toHaveText('城市漫步');
 await page.getByRole('button',{name:'所有稿件'}).click();
 await expect(page.locator('.s-media')).toHaveCount(3);
});

test('manuscript selection is available only inside analysis',async({page})=>{
 await page.goto('/#videos');await expect(page.locator('.s-media')).toHaveCount(3);await expect(page.locator('.s-select-cover,.s-selection-dock')).toHaveCount(0);
 await page.goto('/#analysis');await page.getByRole('button',{name:'稿件分析',exact:true}).click();await page.locator('.s-direct-videos').getByRole('button',{name:'城市漫步',exact:true}).click();await expect(page.locator('.s-direct-actions')).toContainText('已选 2 篇');
});

test('picker edits are applied explicitly and clearing selection remains empty',async({page})=>{
 await page.goto('/#analysis');
 await choose(page,'分析主题','作品对比');
 await expect(page.locator('.s-direct-actions')).toContainText('已选 3 篇');
 await page.getByRole('button',{name:'选择稿件',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'选择稿件'})).toBeVisible();
 await page.getByRole('button',{name:'清空选择',exact:true}).click();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('.s-direct-actions')).toContainText('已选 3 篇');
 await page.getByRole('button',{name:'选择稿件',exact:true}).click();
 await page.getByRole('button',{name:'清空选择',exact:true}).click();
 await page.getByRole('button',{name:'应用选择',exact:true}).click();
 await expect(page.getByRole('heading',{name:'选择要分析的作品'})).toBeVisible();
 await expect(page.locator('.s-video-chip')).toHaveCount(0);
});

test('metric picker limits layers and table view retains original values',async({page})=>{
 await page.goto('/#analysis');
 await choose(page,'分析主题','作品对比');
 await page.getByRole('button',{name:'选择指标',exact:true}).click();
 const sheet=page.getByRole('dialog',{name:'选择分析指标'});
 await sheet.getByRole('checkbox',{name:/点赞/}).check();
 await expect(sheet.getByRole('checkbox',{name:/收藏/})).toBeDisabled();
 await page.getByRole('button',{name:'完成',exact:true}).click();
 await expect(page.locator('.s-small-multiples .s-panel')).toHaveCount(4);
 await page.getByRole('button',{name:'数据表',exact:true}).click();
 await expect(page.locator('.s-small-multiples')).toHaveCount(0);
 await expect(page.locator('.s-table tbody tr')).toHaveCount(3);
 await expect(page.locator('.s-table')).toContainText('3000');
});

test('time and relationship tasks display distinct charts and controls',async({page})=>{
 await page.goto('/#analysis');
 await choose(page,'分析主题','时间趋势');
 await expect(page.getByRole('heading',{name:'每日新增播放'})).toBeVisible();
 await page.locator('.s-analysis-chart').first().scrollIntoViewIfNeeded();await expect(page.locator('.s-analysis-chart canvas').first()).toBeVisible();
 await page.getByRole('button',{name:'每日涨粉',exact:true}).click();
 await expect(page.getByRole('heading',{name:'每日涨粉'})).toBeVisible();
 await choose(page,'分析主题','指标关系');
 await choose(page,'关系横轴','播放量');
 await expect(page.getByRole('heading',{name:'播放量 × 平均播放百分比'})).toBeVisible();
});

test('sources exposes independent runtime, metric coverage and expandable runs',async({page})=>{
 await page.goto('/#sources');
 await expect(page.getByRole('heading',{name:'数据更新'})).toBeVisible();
 await expect(page.getByText('独立运行',{exact:true})).toBeVisible();
 await expect(page.locator('.s-coverage-grid')).toHaveCount(0);
 await expect(page.locator('.s-sync-plot rect')).toHaveCount(1);await page.locator('.s-sync-plot rect').click();
 await expect(page.getByRole('tooltip')).toBeVisible();await expect(page.getByRole('tooltip')).toContainText('封标吸引力');await expect(page.getByRole('tooltip')).not.toContainText('3 / 3');
 await expect(page.locator('.s-unavailable')).toHaveCount(0);
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
 await themeLandscape(page);
 await page.goto('/');
 await page.getByRole('button',{name:'深色模式'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.getByRole('button',{name:'浅色模式'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('sync errors are actionable and preserve the prior snapshot',async({page})=>{
 await page.goto('/#sources');
 await page.getByRole('button',{name:'立即同步',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('B 站登录已失效');
 await (await navigationButton(page,'概览')).click();await expect(page.locator('.s-overview-kpis')).toContainText('6000');
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
 for(const route of ['overview','videos','analysis','sources']){
  await page.goto('/#'+route);
  await expect(page.locator('.s-header h1')).toBeVisible();
  await expect(page.locator('.s-loading')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),route).toBeLessThanOrEqual(1);
 }
 expect(errors).toEqual([]);
});


test('combined presets and watch slider use a single rendered chart',async({page})=>{
 await page.goto('/#analysis');
 await page.locator('.s-combo-chart').first().scrollIntoViewIfNeeded();await expect(page.locator('.s-combo-chart canvas').first()).toBeVisible();
 await expect(page.locator('.s-video-chip')).toHaveCount(0);
 await choose(page,'分析主题','平均播放时长与完播率');
 await expect(page.getByRole('heading',{name:'平均播放时长与完播率'})).toBeVisible();
 await page.getByRole('button',{name:'3秒跳出率',exact:true}).click();
 await expect(page.getByRole('button',{name:'3秒跳出率',exact:true})).toHaveAttribute('aria-pressed','true');
 await choose(page,'分析主题','粉丝量变化');
 await page.locator('.s-analysis-chart').first().scrollIntoViewIfNeeded();await expect(page.locator('.s-analysis-chart canvas').first()).toBeVisible();
 await choose(page,'分析主题','自定义叠加');
 await page.getByRole('button',{name:'添加图层',exact:true}).click();
 await expect(page.locator('.s-layer-editor>div')).toHaveCount(3);
 await choose(page,'图层3图形','折线图');
});

test('detail shows labeled audiences and persistent historical windows',async({page})=>{
 await page.goto('/#videos?video=1');
 await page.getByRole('button',{name:'观众',exact:true}).click();
 await page.locator('.s-age-chart').scrollIntoViewIfNeeded();await expect(page.locator('.s-age-chart canvas')).toBeVisible();
 await expect(page.getByRole('heading',{name:'兴趣分布'})).toBeVisible();
 await page.getByRole('button',{name:'表现',exact:true}).click();
 for(const window of ['发稿后48小时','发稿后30天','近30天','全部已记录']){
  await page.getByRole('button',{name:window,exact:true}).click();
  await expect(page.getByRole('heading',{name:window+'播放趋势'})).toBeVisible();
  await page.locator('.s-video-history-chart').scrollIntoViewIfNeeded();await expect(page.locator('.s-video-history-chart canvas')).toBeVisible();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

async function choose(page:Page,name:string,label:string){if(name==='分析主题'){await page.getByRole('button',{name:['作品对比','时间趋势','指标关系','自定义叠加'].includes(label)?'稿件分析':'全局统计',exact:true}).click();return;}await page.getByRole('combobox',{name,exact:true}).click();await page.getByRole('option',{name:label,exact:true}).click();}

test('account information is available from the sidebar or portrait My dock',async({page})=>{
 await openAccount(page);await expect(page.getByRole('dialog',{name:'UP主账号',exact:true}).getByText('测试UP主',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'添加账号',exact:true})).toBeVisible();
});

test('analysis uses two categories and displays multiple charts together',async({page})=>{
 await page.goto('/#analysis');await expect(page.getByRole('combobox',{name:'分析主题'})).toHaveCount(0);
 await expect(page.locator('.s-analysis-grid>.s-combinations')).toHaveCount(4);await expect(page.getByRole('button',{name:'选择稿件',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'稿件分析',exact:true}).click();await expect(page.getByRole('button',{name:'选择稿件',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'自定义组合图'})).toBeVisible();
});
test('the full manuscript card navigates from its padding, cover, title and keyboard',async({page})=>{
 await page.goto('/#videos');await expect(page.locator('.s-media-stats')).toHaveCount(0);
 const card=page.locator('.s-media').first(),box=await card.boundingBox();await card.click({position:{x:box!.width/2,y:box!.height-6}});await expect(page).toHaveURL(/video=1/);
 await page.getByRole('button',{name:'所有稿件'}).click();
 await page.locator('.s-title-link').first().click();await expect(page).toHaveURL(/video=1/);
 await page.getByRole('button',{name:'所有稿件'}).click();await page.locator('.s-media-cover').nth(1).click();await expect(page).toHaveURL(/video=2/);
 await page.getByRole('button',{name:'所有稿件'}).click();await card.focus();await card.press('Enter');await expect(page).toHaveURL(/video=1/);
});

test('pressing cover title or padding scales the entire card without an inner white rim',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#videos');
 const card=page.locator('.s-library>.s-media').first();
 await expect.poll(()=>card.evaluate(e=>e.getAnimations().every(a=>a.playState!=='running'))).toBe(true);
 for(const region of ['cover','title','padding']){
  const target=region==='cover'?await card.locator('.s-media-cover').boundingBox():region==='title'?await card.locator('.s-title-link').boundingBox():await card.boundingBox();
  await page.mouse.move(target!.x+target!.width/2,region==='padding'?target!.y+target!.height-6:target!.y+target!.height/2);
  await expect.poll(()=>card.locator('img').evaluate(e=>e.getAnimations().every(a=>a.playState!=='running'))).toBe(true);
  const before=await card.boundingBox(),image=await card.locator('img').boundingBox(),imageTransform=await card.locator('img').evaluate(e=>getComputedStyle(e).transform);await page.mouse.down();
  const animation=await card.evaluate(e=>{const scale=e.getAnimations().find(a=>a instanceof CSSTransition&&a.transitionProperty==='scale');const s=getComputedStyle(e);return {running:!!scale,duration:scale?.effect?.getTiming().duration,easing:s.transitionTimingFunction}});expect(animation.running).toBe(true);expect(animation.duration).toBe(160);expect(animation.easing).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
  await expect(card).toHaveCSS('scale','0.975');
  const held=await card.boundingBox(),heldImage=await card.locator('img').boundingBox();
  expect(held!.width/before!.width).toBeCloseTo(.975,3);expect(heldImage!.width/image!.width).toBeCloseTo(.975,3);
  expect(heldImage!.x-held!.x).toBeLessThanOrEqual(image!.x-before!.x+.1);
  await expect(card.locator('.s-media-cover')).toHaveCSS('transform','none');await expect(card.locator('.s-title-link')).toHaveCSS('transform','none');await expect(card.locator('img')).toHaveCSS('transform',imageTransform);
  await page.mouse.move(1,1);await page.mouse.up();await expect(page).toHaveURL(/#videos$/);await expect(card).toHaveCSS('scale','none');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await card.hover();const before=await card.boundingBox();await page.mouse.down();await expect(card).toHaveCSS('scale','1');expect((await card.boundingBox())!.width).toBeCloseTo(before!.width,2);await page.mouse.move(1,1);await page.mouse.up();
});

test('native asset dragging is cancelled while the reasoning slider keeps pointer dragging',async({page})=>{
 await page.goto('/#videos');await expect(page.locator('.s-media')).toHaveCount(3);
 for(const selector of ['.s-brand-logo','.s-media-cover img','.s-media svg'])expect(await page.locator(selector).first().evaluate(e=>!e.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true})))).toBe(true);
 expect(await page.evaluate(()=>{const img=document.createElement('img');document.body.append(img);const cancelled=!img.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true}));img.remove();return cancelled;})).toBe(true);
 await page.getByRole('button',{name:'查看 海边日记',exact:true}).click();await expect(page.locator('.s-detail')).toBeVisible();expect(await page.locator('.s-detail-actions a').evaluate(e=>!e.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true})))).toBe(true);
 await page.goto('/#analysis?tab=ai');await page.getByRole('button',{name:'选择模型与推理强度'}).click();const slider=page.getByRole('slider',{name:'推理强度'}),r=await slider.boundingBox();
 await page.mouse.move(r!.x+14,r!.y+14);await page.mouse.down();await page.mouse.move(r!.x+r!.width-14,r!.y+14,{steps:8});await page.mouse.up();await expect(slider).toHaveAttribute('aria-valuetext','最高');
});

test('background snapshots preserve the active detail tab',async({page})=>{
 await page.clock.install();await page.goto('/#videos?video=1');await page.getByRole('button',{name:'观众',exact:true}).click();
 await page.route('**/api/dashboard/summary',r=>r.fulfill({json:{ok:true,...summary,summary:{...summary.summary,fresh:'2026-08-26T08:00:00Z'}}}));
 await page.clock.fastForward(61000);await expect(page.getByRole('button',{name:'观众',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('explanatory subtitles are absent and cover numbers stay on one line',async({page})=>{
 await page.goto('/');await expect(page.locator('.s-header p')).toHaveCount(0);await expect(page.locator('.s-overview .s-note')).toHaveCount(0);
 await page.goto('/#videos');await expect(page.locator('.s-cover-numbers svg').first()).toHaveAttribute('viewBox','0 0 24 24');
 const labels=await page.locator('.s-cover-numbers>span').evaluateAll(els=>els.map(e=>({height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight)})));expect(labels).toHaveLength(6);expect(labels.every(v=>v.height<=v.line+1)).toBe(true);
});

test('overview changes are quantities and not percentages',async({page})=>{
 const keys=['account_followers','views','avg_views','avg_interactions'];const deltas=[2,60,20,.25];
 await page.route('**/api/dashboard/summary',r=>r.fulfill({json:{ok:true,...summary,comparison:Object.fromEntries(keys.map((k,i)=>[k,{delta:deltas[i],direction:'up',changePercent:9}])),comparisonLabels:Object.fromEntries(keys.map(k=>[k,'相比昨天']))}}));
 await page.goto('/');await expect(page.locator('.s-kpi-change b')).toHaveText(['2','60','20','0.25']);await expect(page.locator('.s-delta-triangle')).toHaveCount(4);
});

test('unselected segment hover only changes text color',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#analysis');const target=page.getByRole('button',{name:'稿件分析',exact:true});await target.hover();await expect(target).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(target).toHaveCSS('transition-timing-function','cubic-bezier(0.23, 1, 0.32, 1)');
});

test('rapid library sorting does not scale cards and title area hover is inert',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#videos');
 for(const name of ['播放量','涨粉量','最新发布']){await choose(page,'稿件排序',name);expect(await page.locator('.s-media').evaluateAll(els=>els.every(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return Math.abs(m.a-1)<.001&&Math.abs(m.d-1)<.001&&m.b===0&&m.c===0}))).toBe(true);}
 await page.locator('.s-media-copy').first().hover();await expect(page.locator('.s-media-cover img').first()).toHaveCSS('transform','none');
 await page.locator('.s-media-cover').first().hover();const canHover=await page.evaluate(()=>matchMedia('(hover:hover)').matches);await expect.poll(()=>page.locator('.s-media-cover img').first().evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a)).toBeCloseTo(canHover?1.025:1,3);
});
test('freshness is in the header and relation points have a visible manuscript key',async({page})=>{
 await page.goto('/');await expect(page.locator('.s-header-actions .s-header-freshness')).toBeVisible();await expect(page.getByRole('button',{name:'查看数据状态'})).toHaveCount(0);
 await page.goto('/#analysis');await page.getByRole('button',{name:'稿件分析',exact:true}).click();await expect(page.locator('.s-point-key')).toHaveCount(0);await expect(page.getByRole('heading',{name:'封标点击率 × 平均播放百分比'})).toBeVisible();
});

test('sync toast disappears without a close button',async({page})=>{
 await page.clock.install();await page.route('**/api/bilibili/collect-now',r=>r.fulfill({json:{ok:true,run:{status:'success'}}}));await page.goto('/#sources');await expect(page.locator('.s-header-freshness')).toBeVisible();await page.getByRole('button',{name:'立即同步',exact:true}).click();await expect(page.locator('.s-floating-toast')).toContainText('同步完成');await expect(page.getByRole('button',{name:'关闭同步提示'})).toHaveCount(0);await page.clock.fastForward(4000);await expect(page.locator('.s-floating-toast')).toHaveCount(0);
});
test('settings uses current model and effort names and has no export action',async({page})=>{
 await page.goto('/#analysis?tab=ai');await page.getByRole('button',{name:'AI模型设置'}).click();await choose(page,'DeepSeek分析模型','DeepSeek V4 Pro');await expect(page.getByRole('combobox',{name:'DeepSeek分析模型'})).toContainText('V4 Pro');
 await page.getByRole('combobox',{name:'思考强度'}).click();await expect(page.getByRole('option')).toHaveText(['轻度','高','最高']);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'数据导出',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:/导出 CSV/})).toHaveCount(0);
});

test('AI chat streams replies and preserves the conversation after navigation',async({page})=>{
 let record:any=null;
 await page.route('**/api/ai/status',r=>r.fulfill({json:{ok:true,configured:true,model:'deepseek-flash'}}));
 await page.route('**/api/ai/conversations',r=>r.fulfill({json:{ok:true,conversations:record?[{...record,updatedAt:'2026-09-10'}]:[]}}));
 await page.route('**/api/ai/conversations/chat-test',r=>r.fulfill({json:{ok:true,conversation:record}}));
 await page.route('**/api/ai/chat',r=>{const body=r.request().postDataJSON();record={id:'chat-test',title:body.message,videoIds:['1','2','3'],busy:false,messages:[{id:'u',role:'user',content:body.message},{id:'a',role:'assistant',content:'优先测试开头。\n\n- 播放量：3000\n- 测试前3秒',status:'complete'}]};const initial={...record,busy:true,messages:[record.messages[0],{...record.messages[1],content:'',status:'pending'}]};const events=[['conversation',initial],['delta',{text:record.messages[1].content}],['done',{conversation:record}]];return r.fulfill({contentType:'text/event-stream',body:events.map(([event,data])=>'event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n').join('')});});
 await page.goto('/#analysis');await page.getByRole('button',{name:'AI 对话',exact:true}).click();await page.getByRole('textbox',{name:'AI对话消息'}).fill('帮我分析开头');await page.getByRole('button',{name:'发送消息',exact:true}).click();await expect(page.locator('.s-chat-message.assistant')).toContainText('测试前3秒');await expect(page.locator('.s-chat-message.assistant')).toContainText('3000');
 await page.goto('/#videos');await page.goto('/#analysis');await page.getByRole('button',{name:'AI 对话',exact:true}).click();await expect(page.locator('.s-chat-message.assistant')).toContainText('优先测试开头');
});

test('automatic update frequency can be changed',async({page})=>{
 let interval=15;await page.route('**/api/local/status',r=>r.fulfill({json:{ok:true,version:'test',uptime:30,autoCollect:true,intervalMinutes:interval}}));await page.route('**/api/local/schedule',r=>{interval=r.request().postDataJSON().intervalMinutes;return r.fulfill({json:{ok:true,intervalMinutes:interval}})});await page.goto('/#sources');await choose(page,'自动更新频率','每10分钟');await expect(page.getByRole('combobox',{name:'自动更新频率'})).toContainText('每10分钟');await choose(page,'自动更新频率','每1小时');await expect(page.getByRole('combobox',{name:'自动更新频率'})).toContainText('每1小时');
});

test('sync icon settles while the pointer remains on the button',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#sources');const button=page.getByRole('button',{name:'刷新同步记录',exact:true});const icon=button.locator('svg');await button.hover();await expect(icon).toHaveAttribute('data-motion-state','resting');await expect(icon).toHaveAttribute('data-motion-state','resting',{timeout:2500});await page.waitForTimeout(650);await expect(icon).toHaveAttribute('data-motion-state','resting');await expect(button.locator('.spin')).toHaveCount(0);
});

test('reordering has real positional animation without scaling',async({page})=>{
 await page.route(url=>url.pathname==='/api/videos',r=>r.fulfill({json:{ok:true,videos:videos.map((v,i)=>({...v,views:[1000,3000,2000][i]}))}}));
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#videos');await expect(page.locator('.s-media')).toHaveCount(3);await choose(page,'稿件排序','播放量');const moving=await page.locator('.s-media').evaluateAll(els=>els.some(e=>e.getAnimations().some(a=>a.playState==='running')));expect(moving).toBe(true);await expect.poll(()=>page.locator('.s-media').evaluateAll(els=>els.every(e=>e.getAnimations().every(a=>a.playState!=='running')))).toBe(true);
});

test('saved AI reports remain in chat history and account connection opens a QR code',async({page})=>{
 const record={id:'saved',title:'之前的问题',updatedAt:'2026-09-08',videoIds:['1'],busy:false,messages:[{id:'a',role:'assistant',content:'保留的分析结论',status:'complete'}]};
 await page.route('**/api/ai/conversations',r=>r.fulfill({json:{ok:true,conversations:[record]}}));await page.route('**/api/ai/conversations/saved',r=>r.fulfill({json:{ok:true,conversation:record}}));
 await page.goto('/#analysis');await page.getByRole('button',{name:'AI 对话',exact:true}).click();if(page.viewportSize()!.width<1000)await page.getByRole('button',{name:'切换对话记录'}).click();await page.locator('.s-chat-history-list').getByRole('button',{name:/之前的问题/}).first().click();await expect(page.locator('.s-chat-message')).toContainText('保留的分析结论');
 await page.route('**/api/bilibili/qr/start',r=>r.fulfill({json:{ok:true,key:'test',url:'https://example.com/test-qr'}}));await page.route('**/api/bilibili/qr/status/test',r=>r.fulfill({json:{ok:true,state:'waiting'}}));await openAccount(page);await page.getByRole('button',{name:'添加账号',exact:true}).click();await expect(page.getByRole('img',{name:'B站账号登录二维码'})).toBeVisible();
});

test('direct manuscript selection avoids a modal and KPI content stays within each card',async({page})=>{
 await page.goto('/');const outside=await page.locator('.s-overview-kpis article').evaluateAll(cards=>cards.some(card=>{const r=card.getBoundingClientRect();return [...card.querySelectorAll('strong,.s-kpi-change,.s-spark')].some(el=>{const b=el.getBoundingClientRect();return b.left<r.left-1||b.right>r.right+1})}));expect(outside).toBe(false);
 await page.goto('/#analysis');await page.getByRole('button',{name:'稿件分析',exact:true}).click();await expect(page.locator('.s-direct-videos>button')).toHaveCount(3);await page.locator('.s-direct-videos>button').first().click();await expect(page.locator('.s-direct-actions')).toContainText('已选 2 篇');await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('realistic manuscript count retains readable categories and two recent rows',async({page})=>{
 const many=Array.from({length:17},(_,i)=>({...videos[i%3],id:String(i+1),title:'第'+(i+1)+'篇长标题稿件',published_at:new Date(2026,0,i+1).toISOString()}));
 await page.route('**/api/videos*',r=>r.fulfill({json:{ok:true,videos:many}}));
 await page.route('**/api/dashboard/summary',r=>r.fulfill({json:{ok:true,...summary,miniTrends:{overview:[{views:5000,avg_views:1900,avg_interactions:180},{views:6000,avg_views:2000,avg_interactions:190}],account:[{followers:3380},{followers:3382}]}}}));
 await page.goto('/');await expect(page.locator('.s-overview-kpis .s-spark')).toHaveCount(4);await expect(page.locator('.s-spark-loading')).toHaveCount(0);
 const recent=page.locator('.s-recent-item:visible');await expect(recent).toHaveCount((page.viewportSize()!.width<page.viewportSize()!.height||page.viewportSize()!.width<700)?4:8);const rows=await recent.evaluateAll(els=>new Set(els.map(e=>Math.round(e.getBoundingClientRect().top))).size);expect(rows).toBe(2);
 const clipped=await recent.evaluateAll(els=>els.some(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('h3,.s-stat')].some(child=>child.getBoundingClientRect().right>r.right+1)}));expect(clipped).toBe(false);
 await page.goto('/#analysis');await expect(page.locator('.s-combo-chart')).toHaveCount(3);for(const chart of await page.locator('.s-combo-chart').all()){expect(await chart.evaluate(e=>e.clientWidth)).toBeGreaterThanOrEqual(250);}
});

test('AI stays in analysis, sidebar profile is static, and icons animate only on activation',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const nav=await navigationButton(page,'概览');await nav.hover();await expect(nav.locator('svg')).toHaveAttribute('data-motion-state','resting');await nav.click();await expect(nav.locator('svg')).toHaveAttribute('data-motion-state','drawing');await expect(page.locator('.s-sidebar button[aria-label="UP主账号"]')).toHaveCount(1);
 for(const pageName of ['overview','videos','analysis','sources']){await page.goto('/#'+pageName);await expect(page.locator('.s-header-actions .s-ai-capsule')).toHaveCount(0);await expect(page.locator('button.s-brand')).toHaveCount(0);}
});
test('detail content follows performance and audience groups and has cover overlays',async({page})=>{
 await page.goto('/#videos?video=1');await expect(page.locator('.s-detail-cover .s-cover-numbers')).toContainText('3000');await expect(page.getByRole('button',{name:'留存与趋势',exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'观众留存',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'游客播放与转粉'})).toHaveCount(0);await page.getByRole('button',{name:'观众',exact:true}).click();await expect(page.getByRole('heading',{name:'游客播放与转粉'})).toBeVisible();await expect(page.getByRole('heading',{name:'观众选题偏好'})).toBeVisible();await expect(page.getByRole('heading',{name:'观众留存',exact:true})).toHaveCount(0);
});
test('saved API key is masked and never resubmitted as a replacement',async({page})=>{
 await page.route('**/api/settings/deepseek/status',r=>r.fulfill({json:{ok:true,configured:true,maskedKey:'sk-a********7890',model:'deepseek-flash'}}));let body:any;await page.route('**/api/settings/deepseek',r=>{body=r.request().postDataJSON();return r.fulfill({json:{ok:true}})});await page.goto('/#analysis?tab=ai');await page.getByRole('button',{name:'AI模型设置'}).click();await expect(page.locator('.s-field input')).toHaveValue('sk-a********7890');await page.getByRole('button',{name:'保存设置'}).click();expect(body.apiKey).toBeUndefined();
});

test('portrait spacing, static branding, detail metrics and search feedback match the revised layout',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await expect(page.locator('.s-overview-kpis article')).toHaveCount(4);
 if(page.viewportSize()!.width<page.viewportSize()!.height){const inset=await page.locator('.s-overview-kpis article').first().evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft));expect(inset).toBeGreaterThanOrEqual(18);}
 if(await page.locator('.s-sidebar').isVisible()){const gaps=await page.locator('.s-sidebar-footer').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.s-sidebar')!.getBoundingClientRect();return [r.left-p.left,p.right-r.right,p.bottom-r.bottom]});expect(Math.max(...gaps)-Math.min(...gaps)).toBeLessThanOrEqual(1);const centered=await page.locator('.s-brand').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.s-sidebar')!.getBoundingClientRect();return Math.abs(r.left+r.width/2-p.left-p.width/2)});expect(centered).toBeCloseTo(4,0);}
 await page.goto('/#videos');const search=page.locator('.s-library-toolbar .s-search'),before=await search.evaluate(e=>getComputedStyle(e).backgroundColor);await search.hover();await expect.poll(()=>search.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(before);await page.getByRole('textbox',{name:'搜索稿件'}).click();await expect.poll(()=>search.evaluate(e=>getComputedStyle(e).boxShadow)).not.toBe('none');
 await page.goto('/#videos?video=1');await expect(page.getByRole('button',{name:'分析这篇稿件'})).toHaveCount(0);await expect(page.locator('.s-detail-metrics')).toHaveCount(0);await expect(page.locator('.s-detail-all-metrics')).toContainText('点赞');const order=await page.locator('.s-detail-all-metrics').evaluate(e=>e.getBoundingClientRect().bottom<=e.nextElementSibling!.getBoundingClientRect().top);expect(order).toBe(true);await expect(page.locator('.s-detail-kpis .s-stat>span')).not.toContainText(['播放量']);
});

test('AI composer clears the mobile navigation and account cards have distinct active and hover states',async({page})=>{
 await page.route('**/api/account/profile',r=>r.fulfill({json:{ok:true,profile:{uid:'123',name:'当前账号'},accounts:[{uid:'123',name:'当前账号'},{uid:'456',name:'另一个账号'}]}}));
 await openAccount(page);const current=page.locator('.s-account-row[data-active=true]'),other=page.locator('.s-account-row[data-active=false]');const bg=await current.evaluate(e=>getComputedStyle(e).backgroundColor);expect(await other.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(bg);const initial=await other.evaluate(e=>getComputedStyle(e).backgroundColor);await other.hover();await expect.poll(()=>other.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(initial);
 await page.route('**/api/ai/conversations',r=>r.fulfill({json:{ok:true,conversations:[]}}));await page.goto('/#analysis?tab=ai');await expect(page.getByRole('textbox',{name:'AI对话消息'})).toBeVisible();if(page.viewportSize()!.width<700){const button=await page.locator('.s-chat-send').boundingBox(),nav=await page.locator('.s-mobile-nav').boundingBox();expect(button!.y+button!.height).toBeLessThan(nav!.y);}
});

test('each status cell represents one sync and only the selected record expands',async({page})=>{
 const runs=Array.from({length:90},(_,i)=>({id:'run-'+i,status:i%8===0?'partial':'success',started_at:new Date(Date.UTC(2026,8,10,12,-10*i)).toISOString(),request_count:100+i,timings:{totalMs:2000},coverage:1,details:{warnings:[]}}));
 await page.route('**/api/acquisition/runs',r=>r.fulfill({json:{ok:true,runs}}));await page.goto('/#sources');const cells=page.locator('.s-sync-plot rect');await expect(cells.first()).toBeVisible();await expect(cells.first()).toHaveAttribute('width','5');await expect(cells.first()).toHaveAttribute('height','16');await expect(cells.first()).toHaveAttribute('rx','1');await expect(page.locator('.s-run-list')).toHaveCount(0);await expect(page.locator('.s-single-run')).toHaveCount(0);
 await cells.first().click();await expect(page.getByRole('tooltip')).toHaveCount(1);const first=await page.getByRole('tooltip').textContent();await cells.last().click();await expect(page.getByRole('tooltip')).toHaveCount(1);await expect.poll(()=>page.getByRole('tooltip').textContent()).not.toBe(first);await expect(page.getByRole('tooltip')).toContainText('100 次请求');
});

async function openAccount(page:Page){await page.goto('/#overview');const account=page.getByRole('button',{name:'UP主账号',exact:true});if(await account.isVisible())await account.click();else await page.getByRole('button',{name:'我的',exact:true}).click();}

test('navigation never blanks and root width stays fixed when scrollbars change',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await expect(page.locator('.s-overview-kpis')).toBeVisible();const before=await page.locator('.s-main').boundingBox();await page.evaluate(()=>{(window as any).transitionFrames=[];const stop=performance.now()+700;function sample(){const el=document.querySelector('.s-page');(window as any).transitionFrames.push({exists:!!el,opacity:el?Number(getComputedStyle(el).opacity):0,transform:el?getComputedStyle(el).transform:''});if(performance.now()<stop)requestAnimationFrame(sample)}sample()});
 await (await navigationButton(page,'稿件')).click();await expect(page.locator('.s-library')).toBeVisible();await page.waitForTimeout(400);const frames=await page.evaluate(()=>(window as any).transitionFrames);expect(frames.every((f:any)=>f.exists&&f.opacity>=.7&&f.transform==='none')).toBe(true);await page.evaluate(()=>document.body.style.overflow='hidden');const after=await page.locator('.s-main').boundingBox();expect(after!.width).toBeCloseTo(before!.width,0);expect(after!.x).toBeCloseTo(before!.x,0);
});

test('theme slider, back to top and account modal provide the shell controls',async({page})=>{
 await themeLandscape(page);
 await page.route('**/api/videos*',r=>r.fulfill({json:{ok:true,videos:Array.from({length:18},(_,i)=>({...videos[i%3],id:String(i+1)}))}}));
 await page.goto('/#videos');await page.getByRole('button',{name:'深色模式',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.getByRole('button',{name:'浅色模式',exact:true}).click();await page.evaluate(()=>window.scrollTo(0,500));await expect(page.getByRole('button',{name:'回到顶部'})).toBeVisible();await page.getByRole('button',{name:'回到顶部'}).click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await openAccount(page);await expect(page.getByRole('dialog',{name:'UP主账号',exact:true})).toBeVisible();await expect(page.locator('.s-version')).toContainText('v0.1.0-dev.14');await expect(page.locator('.s-sidebar nav').getByRole('button',{name:'设置',exact:true})).toHaveCount(0);
});

test('chat model and reasoning selections are sent to the provider request',async({page})=>{
 await page.route('**/api/ai/status',r=>r.fulfill({json:{ok:true,configured:true,model:'deepseek-flash',effort:'high'}}));let sent:any;
 await page.route('**/api/ai/chat',r=>{sent=r.request().postDataJSON();return r.fulfill({status:429,json:{ok:false,error:{message:'测试请求已截获'}}})});await page.goto('/#analysis?tab=ai');await page.getByRole('button',{name:'选择模型与推理强度'}).click();await page.getByRole('button',{name:'选择对话模型'}).click();await page.getByRole('option',{name:'DeepSeek V4 Pro',exact:true}).click();await page.getByRole('slider',{name:'推理强度'}).press('End');await expect(page.getByRole('slider',{name:'推理强度'})).toHaveAttribute('aria-valuetext','最高');await page.keyboard.press('Escape');await page.getByRole('textbox',{name:'AI对话消息'}).fill('检查设置');await page.getByRole('button',{name:'发送消息',exact:true}).click();await expect.poll(()=>sent?.effort).toBe('max');expect(sent.model).toBe('deepseek-v4-pro');await page.getByRole('button',{name:'AI模型设置'}).click();await expect(page.getByRole('dialog',{name:'AI 对话设置'})).toBeVisible();
});

test('wide and narrow dropdowns retain a restrained press with bounded contraction',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const [route,label]of [['videos','稿件排序'],['sources','自动更新频率']]){await page.goto('/#'+route);const trigger=page.getByRole('combobox',{name:label,exact:true});await trigger.scrollIntoViewIfNeeded();const before=await trigger.boundingBox();await trigger.hover();await page.mouse.down();await page.waitForTimeout(180);const pressed=await trigger.boundingBox();expect(before!.width-pressed!.width).toBeGreaterThan(.5);expect(before!.width-pressed!.width).toBeLessThanOrEqual(3.2);expect(before!.height-pressed!.height).toBeGreaterThan(0);await page.mouse.up();await expect(page.getByRole('listbox',{name:label,exact:true})).toBeVisible();await expect(page.getByRole('listbox',{name:label,exact:true})).toHaveCSS('transform','none');await page.keyboard.press('Escape');}
});

async function navigationButton(page:Page,name:string){const desktop=page.locator('.s-sidebar nav').getByRole('button',{name,exact:true});return await desktop.isVisible()?desktop:page.locator('.s-mobile-nav').getByRole('button',{name,exact:true});}

test('portrait uses My dock with no hamburger or sidebar and brand hover stays unchanged',async({page})=>{
 await page.goto('/');await expect(page.locator('.s-overview-kpis')).toBeVisible();await expect(page.getByRole('button',{name:'打开导航'})).toHaveCount(0);
 const portrait=page.viewportSize()!.height>page.viewportSize()!.width;
 if(portrait){await expect(page.locator('.s-sidebar')).toBeHidden();await expect(page.locator('.s-mobile-nav>button')).toHaveCount(5);await page.getByRole('button',{name:'我的',exact:true}).click();await expect(page.getByRole('dialog',{name:'UP主账号',exact:true})).toBeVisible();}
 else {const brand=page.locator('.s-brand'),before=await brand.screenshot();await brand.hover();expect(await brand.screenshot()).toEqual(before);const profile=page.locator('.s-sidebar-footer'),bg=await profile.evaluate(e=>getComputedStyle(e).backgroundColor);await profile.hover();await expect.poll(()=>profile.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(bg);}
});

test('shared reasoning slider tracks a drag and sync hover equals selected styling',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#analysis?tab=ai');await page.getByRole('button',{name:'选择模型与推理强度'}).click();const slider=page.getByRole('slider',{name:'推理强度'});await expect(slider).toBeVisible();const r=await slider.boundingBox();await page.mouse.move(r!.x+14,r!.y+14);await page.mouse.down();await page.mouse.move(r!.x+r!.width-14,r!.y+14,{steps:8});await page.mouse.up();await expect(slider).toHaveAttribute('aria-valuetext','最高');expect((await page.locator('.ui-slider-thumb').boundingBox())!.width).toBeCloseTo(28,2);await page.keyboard.press('Escape');await page.goto('/#sources');const cell=page.locator('.s-sync-plot rect').first();await cell.hover();await expect(page.getByRole('tooltip')).toBeVisible();await expect(cell).toHaveCSS('fill','rgb(31, 163, 130)');const hovered=await cell.evaluate(e=>({fill:getComputedStyle(e).fill,stroke:getComputedStyle(e).stroke}));await cell.click();await page.mouse.move(2,2);await expect(page.getByRole('tooltip')).toBeVisible();expect(await cell.evaluate(e=>({fill:getComputedStyle(e).fill,stroke:getComputedStyle(e).stroke}))).toEqual(hovered);expect(hovered.stroke).toBe('none');
});

test('chat history keeps messages and image attachments without branching actions and supports desktop rename',async({page})=>{
 let record:any={id:'manage',title:'原始对话',updatedAt:'2026-09-11',videoIds:['1'],busy:false,messages:[{id:'u1',role:'user',content:'问题'},{id:'a1',role:'assistant',content:'原始回复',status:'complete'}]},sent:any;
 await page.route('**/api/ai/status',r=>r.fulfill({json:{ok:true,configured:true,model:'deepseek-flash',effort:'high'}}));
 await page.route('**/api/ai/conversations*',r=>r.fulfill({json:{ok:true,conversations:[record]}}));
 await page.route('**/api/ai/conversations/manage',r=>{if(r.request().method()==='PATCH'){const body=r.request().postDataJSON();record={...record,title:body.title??record.title};return r.fulfill({json:{ok:true}})}return r.fulfill({json:{ok:true,conversation:record}})});
 await page.route('**/api/ai/chat',r=>{sent=r.request().postDataJSON();return r.fulfill({status:429,json:{ok:false,error:{message:'测试截获'}}})});
 await page.goto('/#analysis?tab=ai');if(page.viewportSize()!.width<1000)await page.getByRole('button',{name:'切换对话记录'}).click();await page.locator('.ai-session-row>button').first().click();await expect(page.locator('.s-chat-message')).toHaveCount(2);
 for(const label of ['从消息创建分支','编辑消息','重新回答'])await expect(page.getByRole('button',{name:label,exact:true})).toHaveCount(0);
 if(page.viewportSize()!.width>=1000){await page.getByRole('button',{name:'重命名对话'}).click();await page.getByRole('textbox',{name:'对话名称'}).fill('修改后的对话');await page.getByRole('button',{name:'保存名称'}).click();await expect(page.locator('.ai-toolbar-title')).toContainText('修改后的对话');}
 await page.getByLabel('上传分析图片').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6X1cAAAAASUVORK5CYII=','base64')});await expect(page.locator('.ai-attachments img')).toHaveCount(1);await page.getByRole('textbox',{name:'AI对话消息'}).fill('分析附图');await page.getByRole('button',{name:'发送消息',exact:true}).click();await expect.poll(()=>sent?.attachments?.length).toBe(1);expect(sent.attachments[0].dataUrl).toContain('data:image/png;base64,');
});

test('page motion prepares first-screen images and theme reveal starts at its control',async({page})=>{
 await themeLandscape(page);
 await page.emulateMedia({reducedMotion:'no-preference'});
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r});await page.route('**/api/covers/**',async route=>{await gate;await route.fallback()});
 await page.goto('/#sources');await expect(page.locator('.s-sources')).toHaveAttribute('data-page-pending','false');await (await navigationButton(page,'稿件')).click();release();await expect(page.locator('.s-media-cover img').first()).toHaveAttribute('data-decoded','true');await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.transitionKind??'')).toBe('');
 const control=await page.locator('.s-theme-anchor').boundingBox();await page.getByRole('button',{name:'深色模式',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.getAnimations().some(a=>(a.effect as any)?.pseudoElement==='::view-transition-new(root)'))).toBe(true);const reveal=await page.evaluate(()=>{const effect=document.getAnimations().find(a=>(a.effect as any)?.pseudoElement==='::view-transition-new(root)')?.effect as KeyframeEffect;return {frames:effect.getKeyframes(),timing:effect.getTiming()}});expect(reveal.timing.easing).toBe('cubic-bezier(0.23, 1, 0.32, 1)');expect(reveal.frames[0]['--reveal-radius']).toBe('0px');const mask=await page.evaluate(()=>({image:getComputedStyle(document.documentElement,'::view-transition-new(root)').maskImage,x:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--reveal-x')),y:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--reveal-y')),feather:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--reveal-feather'))}));expect(mask.image).toContain('radial-gradient');expect(mask.feather).toBeGreaterThanOrEqual(40);expect(mask.x).toBeCloseTo(control!.x+control!.width/2,0);expect(mask.y).toBeCloseTo(control!.y+control!.height/2,0);
});

test('header controls align, segment labels fit, and profile hover never floats',async({page})=>{
 await themeLandscape(page);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#videos');await expect(page.locator('.s-library')).toBeVisible();await expect(page.locator('.s-header-actions>.s-sync')).toHaveCount(0);await expect(page.locator('.s-theme-switch')).toBeVisible();
 const fit=await page.locator('.ui-segments>button').evaluateAll(buttons=>buttons.every(b=>{const r=b.getBoundingClientRect();const label=b.querySelector('span,svg');if(!label)return true;const t=label.getBoundingClientRect();return t.width<=r.width-8&&t.height<=r.height-6}));expect(fit).toBe(true);
 if(await page.locator('.s-sidebar').isVisible()){const profile=page.locator('.s-sidebar-footer'),before=await profile.boundingBox();await profile.hover();await page.waitForTimeout(280);expect((await profile.boundingBox())!.y).toBeCloseTo(before!.y,1)}
});

test('sheet and backdrop disappear together, without a lingering shaded page',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await openAccount(page);const sheet=page.getByRole('dialog',{name:'UP主账号',exact:true});await expect(sheet).toHaveCSS('opacity','1');await page.evaluate(()=>{(window as any).closingFrames=[];const stop=performance.now()+600;function sample(){const d=document.querySelector('dialog[open]');if(d)(window as any).closingFrames.push({panel:Number(getComputedStyle(d).opacity),backdrop:Number(getComputedStyle(d,'::backdrop').opacity)});if(performance.now()<stop)requestAnimationFrame(sample)}sample()});await page.getByRole('button',{name:'关闭',exact:true}).click();await expect(sheet).toHaveCount(0);const frames=await page.evaluate(()=>(window as any).closingFrames);expect(frames.some((f:any)=>f.panel<.8&&f.backdrop<.8)).toBe(true);expect(frames.some((f:any)=>f.panel<.15&&f.backdrop>.45)).toBe(false);
});

test('returning from a scrolled detail restores the list once and does not replay a fade',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.route('**/api/videos*',r=>r.fulfill({json:{ok:true,videos:Array.from({length:18},(_,i)=>({...videos[i%3],id:String(i+1)}))}}));await page.goto('/#videos');await page.locator('.s-media').nth(4).scrollIntoViewIfNeeded();const original=await page.evaluate(()=>scrollY);await page.locator('.s-media').nth(4).click();await expect(page.locator('.s-detail')).toBeVisible();await page.evaluate(()=>scrollTo(0,700));await page.goBack();await expect(page.locator('.s-library')).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.transitionKind??'')).toBe('');await expect.poll(()=>page.evaluate(()=>scrollY)).toBeCloseTo(original,0);const nav=page.locator('.s-mobile-nav');if(await nav.isVisible()){const selected=await nav.locator('[aria-current=page]').boundingBox(),indicator=await nav.locator('.s-nav-indicator').boundingBox();expect(indicator!.y).toBeCloseTo(selected!.y,0);expect(indicator!.x).toBeCloseTo(selected!.x,0);await expect(nav.locator('.s-nav-indicator')).toHaveCSS('opacity','1')}const left=page.viewportSize()!.width>page.viewportSize()!.height?240:0;const clip={x:left,y:100,width:page.viewportSize()!.width-left-16,height:250};const first=await page.screenshot({clip,path:'.local-runtime/qa30/return-first-'+page.viewportSize()!.width+'.png'});await page.waitForTimeout(350);const last=await page.screenshot({clip,path:'.local-runtime/qa30/return-last-'+page.viewportSize()!.width+'.png'});expect(last.equals(first),'Page changed after transition finished').toBe(true);expect(await page.evaluate(()=>scrollY)).toBeCloseTo(original,0);
});

test('sync cells show only issues from that run and have no black focus outline',async({page})=>{
 const old={id:'old',status:'partial',started_at:'2026-09-01T00:00:00Z',request_count:20,details:{totalVideos:7,metricCounts:{views:2,likes:7}}};
 const success={...old,id:'complete',status:'success',started_at:'2026-09-03T00:00:00Z',details:{totalVideos:17,metricCounts:{views:17,likes:17}}};
 const failed={id:'failed',status:'failed',started_at:'2026-09-02T00:00:00Z',error_code:'session_expired'};
 await page.route('**/api/acquisition/runs',r=>r.fulfill({json:{ok:true,runs:[success,failed,old]}}));await page.goto('/#sources');await expect(page.getByRole('heading',{name:'数据质量',exact:true})).toHaveCount(0);
 const cells=page.locator('.s-sync-plot rect');await cells.first().click();const tip=page.getByRole('tooltip');await expect(tip).toContainText('5 篇未返回');await expect(tip).not.toContainText('点赞');await expect(tip).not.toContainText('2 / 7');
 expect(await cells.first().evaluate(e=>getComputedStyle(e).outlineWidth)).toBe('0px');expect(await page.locator('.s-sync-plot svg').evaluate(e=>getComputedStyle(e).outlineWidth)).toBe('0px');
 await cells.nth(1).click();await expect(tip).toContainText('登录已过期');await expect(tip).not.toContainText('播放量');
 await cells.last().click();await expect(tip).toContainText('同步完成');await expect(tip.locator('.s-run-issues')).toHaveCount(0);await expect(tip).not.toContainText('17');await expect(tip).not.toContainText('数据质量');
});
