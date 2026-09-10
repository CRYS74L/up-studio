import { expect, test, type Page } from '@playwright/test';

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
 await expect(page.locator('.s-coverage-grid>div')).toHaveCount(16);
 await expect(page.locator('.s-sync-plot rect')).toHaveCount(1);await page.locator('.s-sync-plot rect').click();
 await expect(page.locator('.s-run-detail')).toBeVisible();
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
 await expect(page.locator('.s-overview-kpis')).toContainText('6000');
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

test('expanded sidebar shows the real UP profile and account actions',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'收起侧栏'})).toHaveCount(0);
 if((page.viewportSize()?.width??1000)<700)await page.getByRole('button',{name:'打开导航'}).click();
 await expect(page.getByText('测试UP主',{exact:true})).toBeVisible();await page.goto('/#settings');
 await expect(page.getByRole('heading',{name:'哔哩哔哩账号'})).toBeVisible();await expect(page.getByRole('button',{name:'添加账号',exact:true})).toBeVisible();
});
test('analysis uses two categories and displays multiple charts together',async({page})=>{
 await page.goto('/#analysis');await expect(page.getByRole('combobox',{name:'分析主题'})).toHaveCount(0);
 await expect(page.locator('.s-analysis-grid>.s-combinations')).toHaveCount(4);await expect(page.getByRole('button',{name:'选择稿件',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'稿件分析',exact:true}).click();await expect(page.getByRole('button',{name:'选择稿件',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'自定义组合图'})).toBeVisible();
});
test('video metrics are inert while cover and title navigate',async({page})=>{
 await page.goto('/#videos');await page.locator('.s-media-stats').first().click();await expect(page).toHaveURL(/#videos$/);
 await page.locator('.s-title-link').first().click();await expect(page).toHaveURL(/video=1/);
});

test('background snapshots preserve the active detail tab',async({page})=>{
 await page.clock.install();await page.goto('/#videos?video=1');await page.getByRole('button',{name:'观众',exact:true}).click();
 await page.route('**/api/dashboard/summary',r=>r.fulfill({json:{ok:true,...summary,summary:{...summary.summary,fresh:'2026-08-26T08:00:00Z'}}}));
 await page.clock.fastForward(61000);await expect(page.getByRole('button',{name:'观众',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('explanatory subtitles are absent and library metrics stay on one line',async({page})=>{
 await page.goto('/');await expect(page.locator('.s-header p')).toHaveCount(0);await expect(page.locator('.s-overview .s-note')).toHaveCount(0);
 await page.goto('/#videos');await expect(page.locator('.s-cover-numbers svg').first()).toHaveAttribute('viewBox','0 0 24 24');
 const labels=await page.locator('.s-media-stats .s-stat>span').evaluateAll(els=>els.map(e=>({height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight)})));expect(labels.every(v=>v.height<=v.line+1)).toBe(true);
});

test('overview changes are quantities and not percentages',async({page})=>{
 const keys=['account_followers','views','avg_views','avg_interactions'];const deltas=[2,60,20,.25];
 await page.route('**/api/dashboard/summary',r=>r.fulfill({json:{ok:true,...summary,comparison:Object.fromEntries(keys.map((k,i)=>[k,{delta:deltas[i],direction:'up',changePercent:9}])),comparisonLabels:Object.fromEntries(keys.map(k=>[k,'相比昨天']))}}));
 await page.goto('/');await expect(page.locator('.s-kpi-change b')).toHaveText(['2','60','20','0.25']);await expect(page.locator('.s-delta-triangle')).toHaveCount(4);
});

test('unselected segment hover only changes text color',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#analysis');const target=page.getByRole('button',{name:'稿件分析',exact:true});await target.hover();await expect(target).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(target).toHaveCSS('transition-timing-function','cubic-bezier(0.22, 1, 0.36, 1)');
});

test('rapid library switches do not scale cards and metric hover is inert',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#videos');
 for(const name of ['列表','网格','中长视频','全部','短视频','全部']){await page.getByRole('button',{name,exact:true}).click();expect(await page.locator('.s-media').evaluateAll(els=>els.every(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return Math.abs(m.a-1)<.001&&Math.abs(m.d-1)<.001&&m.b===0&&m.c===0}))).toBe(true);}
 await page.locator('.s-media-stats').first().hover();await expect(page.locator('.s-media-cover img').first()).toHaveCSS('transform','none');
});
test('freshness is in the header and relation points have a visible manuscript key',async({page})=>{
 await page.goto('/');await expect(page.locator('.s-header-actions .s-header-freshness')).toBeVisible();await expect(page.getByRole('button',{name:'查看数据状态'})).toHaveCount(0);
 await page.goto('/#analysis');await page.getByRole('button',{name:'稿件分析',exact:true}).click();await expect(page.locator('.s-point-key')).toHaveCount(0);await expect(page.getByRole('heading',{name:'封标点击率 × 平均播放百分比'})).toBeVisible();
});

test('sync toast disappears without a close button',async({page})=>{
 await page.clock.install();await page.route('**/api/bilibili/collect-now',r=>r.fulfill({json:{ok:true,run:{status:'success'}}}));await page.goto('/#videos');await expect(page.locator('.s-header-freshness')).toBeVisible();await page.getByRole('button',{name:'同步',exact:true}).click();await expect(page.locator('.s-floating-toast')).toContainText('同步完成');await expect(page.getByRole('button',{name:'关闭同步提示'})).toHaveCount(0);await page.clock.fastForward(4000);await expect(page.locator('.s-floating-toast')).toHaveCount(0);
});
test('settings uses current model and effort names and has no export action',async({page})=>{
 await page.goto('/#settings');await page.getByRole('button',{name:'AI设置',exact:true}).click();await choose(page,'DeepSeek分析模型','DeepSeek V4 Pro');await expect(page.getByRole('combobox',{name:'DeepSeek分析模型'})).toContainText('V4 Pro');
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
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const button=page.getByRole('button',{name:'同步',exact:true});const icon=button.locator('svg');await button.hover();await expect(icon).toHaveAttribute('data-motion-state','resting');await expect(icon).toHaveAttribute('data-motion-state','resting',{timeout:2500});await page.waitForTimeout(650);await expect(icon).toHaveAttribute('data-motion-state','resting');await expect(button.locator('.spin')).toHaveCount(0);
});

test('reordering has real positional animation without scaling',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/#videos');await expect(page.locator('.s-media')).toHaveCount(3);await page.getByRole('button',{name:'列表',exact:true}).click();const moving=await page.locator('.s-media').evaluateAll(els=>els.some(e=>e.getAnimations().some(a=>a.playState==='running')));expect(moving).toBe(true);await expect.poll(()=>page.locator('.s-media').evaluateAll(els=>els.every(e=>e.getAnimations().every(a=>a.playState!=='running')))).toBe(true);
});

test('saved AI reports remain in chat history and account connection opens a QR code',async({page})=>{
 const record={id:'saved',title:'之前的问题',updatedAt:'2026-09-08',videoIds:['1'],busy:false,messages:[{id:'a',role:'assistant',content:'保留的分析结论',status:'complete'}]};
 await page.route('**/api/ai/conversations',r=>r.fulfill({json:{ok:true,conversations:[record]}}));await page.route('**/api/ai/conversations/saved',r=>r.fulfill({json:{ok:true,conversation:record}}));
 await page.goto('/#analysis');await page.getByRole('button',{name:'AI 对话',exact:true}).click();if(page.viewportSize()!.width<1000)await page.getByRole('button',{name:'切换对话记录'}).click();await page.locator('.s-chat-history-list').getByRole('button',{name:/之前的问题/}).click();await expect(page.locator('.s-chat-message')).toContainText('保留的分析结论');
 await page.route('**/api/bilibili/qr/start',r=>r.fulfill({json:{ok:true,key:'test',url:'https://example.com/test-qr'}}));await page.route('**/api/bilibili/qr/status/test',r=>r.fulfill({json:{ok:true,state:'waiting'}}));await page.goto('/#settings');await page.getByRole('button',{name:'添加账号',exact:true}).click();await expect(page.getByRole('img',{name:'B站账号登录二维码'})).toBeVisible();
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
 await page.goto('/#analysis');await expect(page.locator('.s-combo-chart')).toHaveCount(3);for(const chart of await page.locator('.s-combo-chart').all()){expect(await chart.evaluate(e=>e.clientWidth)).toBeGreaterThanOrEqual(17*30);}
});

test('AI stays in analysis, sidebar profile is static, and icons animate only on activation',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const nav=page.locator('.s-sidebar nav').getByRole('button',{name:'概览',exact:true});if((page.viewportSize()?.width??1000)<700)await page.getByRole('button',{name:'打开导航'}).click();await nav.hover();await expect(nav.locator('svg')).toHaveAttribute('data-motion-state','resting');await nav.click();if((page.viewportSize()?.width??1000)>=700)await expect(nav.locator('svg')).toHaveAttribute('data-motion-state','drawing');else await expect(page.locator('.s-nav-scrim')).toHaveCount(0);await expect(page.getByRole('button',{name:'UP主账号'})).toHaveCount(0);
 for(const pageName of ['overview','videos','analysis','sources','settings']){await page.goto('/#'+pageName);await expect(page.locator('.s-header-actions .s-ai-capsule')).toHaveCount(0);await expect(page.locator('button.s-brand')).toHaveCount(0);}
});
test('detail content follows performance and audience groups and has cover overlays',async({page})=>{
 await page.goto('/#videos?video=1');await expect(page.locator('.s-detail-cover .s-cover-numbers')).toContainText('3000');await expect(page.getByRole('button',{name:'留存与趋势',exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'观众留存',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'游客播放与转粉'})).toHaveCount(0);await page.getByRole('button',{name:'观众',exact:true}).click();await expect(page.getByRole('heading',{name:'游客播放与转粉'})).toBeVisible();await expect(page.getByRole('heading',{name:'观众选题偏好'})).toBeVisible();await expect(page.getByRole('heading',{name:'观众留存',exact:true})).toHaveCount(0);
});
test('saved API key is masked and never resubmitted as a replacement',async({page})=>{
 await page.route('**/api/settings/deepseek/status',r=>r.fulfill({json:{ok:true,configured:true,maskedKey:'sk-a********7890',model:'deepseek-flash'}}));let body:any;await page.route('**/api/settings/deepseek',r=>{body=r.request().postDataJSON();return r.fulfill({json:{ok:true}})});await page.goto('/#settings?tab=ai');await expect(page.locator('.s-field input')).toHaveValue('sk-a********7890');await page.getByRole('button',{name:'保存设置'}).click();expect(body.apiKey).toBeUndefined();
});

test('portrait spacing, static branding, detail metrics and search feedback match the revised layout',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await expect(page.locator('.s-overview-kpis article')).toHaveCount(4);
 if(page.viewportSize()!.width<page.viewportSize()!.height){const inset=await page.locator('.s-overview-kpis article').first().evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft));expect(inset).toBeGreaterThanOrEqual(18);}
 if(page.viewportSize()!.width>=700){const gaps=await page.locator('.s-sidebar-footer').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.s-sidebar')!.getBoundingClientRect();return [r.left-p.left,p.right-r.right,p.bottom-r.bottom]});expect(Math.max(...gaps)-Math.min(...gaps)).toBeLessThanOrEqual(1);const centered=await page.locator('.s-brand').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.s-sidebar')!.getBoundingClientRect();return Math.abs(r.left+r.width/2-p.left-p.width/2)});expect(centered).toBeLessThan(1);}
 await page.goto('/#videos');const search=page.locator('.s-library-toolbar .s-search'),before=await search.evaluate(e=>getComputedStyle(e).backgroundColor);await search.hover();await expect.poll(()=>search.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(before);await page.getByRole('textbox',{name:'搜索稿件'}).click();await expect.poll(()=>search.evaluate(e=>getComputedStyle(e).boxShadow)).not.toBe('none');
 await page.goto('/#videos?video=1');await expect(page.getByRole('button',{name:'分析这篇稿件'})).toHaveCount(0);await expect(page.locator('.s-detail-metrics')).toHaveCount(0);await expect(page.locator('.s-detail-all-metrics')).toContainText('点赞');const order=await page.locator('.s-detail-all-metrics').evaluate(e=>e.getBoundingClientRect().bottom<=e.nextElementSibling!.getBoundingClientRect().top);expect(order).toBe(true);await expect(page.locator('.s-detail-kpis .s-stat>span')).not.toContainText(['播放量']);
});

test('AI composer clears the mobile navigation and account cards have distinct active and hover states',async({page})=>{
 await page.route('**/api/account/profile',r=>r.fulfill({json:{ok:true,profile:{uid:'123',name:'当前账号'},accounts:[{uid:'123',name:'当前账号'},{uid:'456',name:'另一个账号'}]}}));
 await page.goto('/#settings');const current=page.locator('.s-account-row[data-active=true]'),other=page.locator('.s-account-row[data-active=false]');const bg=await current.evaluate(e=>getComputedStyle(e).backgroundColor);expect(await other.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(bg);const initial=await other.evaluate(e=>getComputedStyle(e).backgroundColor);await other.hover();await expect.poll(()=>other.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(initial);
 await page.route('**/api/ai/conversations',r=>r.fulfill({json:{ok:true,conversations:[]}}));await page.goto('/#analysis?tab=ai');await expect(page.getByRole('textbox',{name:'AI对话消息'})).toBeVisible();if(page.viewportSize()!.width<700){const button=await page.locator('.s-chat-send').boundingBox(),nav=await page.locator('.s-mobile-nav').boundingBox();expect(button!.y+button!.height).toBeLessThan(nav!.y);}
});

test('each status cell represents one sync and only the selected record expands',async({page})=>{
 const runs=Array.from({length:90},(_,i)=>({id:'run-'+i,status:i%8===0?'partial':'success',started_at:new Date(Date.UTC(2026,8,10,12,-10*i)).toISOString(),request_count:100+i,timings:{totalMs:2000},coverage:1,details:{warnings:[]}}));
 await page.route('**/api/acquisition/runs',r=>r.fulfill({json:{ok:true,runs}}));await page.goto('/#sources');const cells=page.locator('.s-sync-plot rect');await expect(cells.first()).toBeVisible();await expect(cells.first()).toHaveAttribute('width','5');await expect(cells.first()).toHaveAttribute('height','16');await expect(cells.first()).toHaveAttribute('rx','1');await expect(page.locator('.s-run-list')).toHaveCount(0);await expect(page.locator('.s-single-run')).toHaveCount(0);
 await cells.first().click();await expect(page.locator('.s-single-run')).toHaveCount(1);const first=await page.locator('.s-single-run').textContent();await cells.last().click();await expect(page.locator('.s-single-run')).toHaveCount(1);await expect.poll(()=>page.locator('.s-single-run').textContent()).not.toBe(first);await expect(page.locator('.s-single-run')).toContainText('100 次请求');
});
