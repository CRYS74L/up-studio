import {test,expect,type Page,type Locator} from '@playwright/test';

const videos=Array.from({length:17},(_,i)=>({
 id:String(i+1),bvid:'BV_TOOLTIP_'+i,title:'【独行日本】为什么京都才是我最喜欢的日本城市｜Vlog '+String(i+1).padStart(2,'0'),
 cover_url:null,duration_seconds:600,published_at:new Date(Date.UTC(2026,8,30-i)).toISOString(),captured_at:'2026-10-12T00:00:00Z',
 views:1000+i*100,cover_ctr:2.1+i*.05,avg_watch_seconds:50,avg_watch_percent:42,followers_gained:20,
 metrics:{likes:100,comments:20,danmaku:10,favorites:30,coins:20,shares:10},dimensions:{}
}));
test.beforeEach(async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce',colorScheme:'light'});
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.startsWith('/api/covers/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#a8bcca"/></svg>'});
  const body=path==='/api/videos'?{videos}:path==='/api/dashboard/summary'?{configured:true,summary:{fresh:videos[0].captured_at,account_followers:3000,views:30000,avg_views:2000,avg_interactions:100},miniTrends:{overview:[],account:[]}}:
   path==='/api/account/history'?{points:Array.from({length:30},(_,i)=>({day:new Date(Date.UTC(2026,8,11+i)).toISOString().slice(0,10),follows:i%4,unfollows:i%3}))}:
   path==='/api/account/profile'?{profile:{uid:'123',name:'测试UP主',avatar:null},accounts:[]}:
   path==='/api/acquisition/runs'?{runs:[]}:
   path==='/api/backups/status'?{profiles:[]}:
   path==='/api/local/status'?{version:'test',uptime:60,autoCollect:true,intervalMinutes:15}:{};
  return route.fulfill({json:{ok:true,...body}});
 });
});
const tooltip=(page:Page)=>page.locator('.s-chart-tooltip').filter({visible:true}).filter({hasText:/\S/}).last();
async function expectInsideScreen(page:Page){
 const tip=tooltip(page);await expect(tip).toBeVisible();
 await expect.poll(()=>tip.evaluate(e=>{
  const r=e.getBoundingClientRect(),v=visualViewport!;
  return r.left>=v.offsetLeft+11&&r.top>=v.offsetTop+11&&r.right<=v.offsetLeft+v.width-11&&r.bottom<=v.offsetTop+v.height-11;
 })).toBe(true);
}
async function ready(chart:Locator){await expect(chart.locator('svg[data-chart-renderer]')).toBeVisible();}

test('portrait chart titles remain inside the screen even when wider than the plot',async({page},info)=>{
 test.skip(!info.project.use.hasTouch,'Touchscreen coverage.');
 for(const width of [320,390,428]){
  await page.setViewportSize({width,height:844});await page.goto('/#overview');const chart=page.locator('.s-rank-chart');await chart.scrollIntoViewIfNeeded();await ready(chart);
  const r=(await chart.boundingBox())!;await page.touchscreen.tap(r.x+Math.min(160,r.width-60),r.y+40);
  await expect(tooltip(page)).toContainText('为什么京都');await expectInsideScreen(page);
 }
});

test('a fan chart tooltip stays visible when most of the chart has scrolled offscreen',async({page},info)=>{
 test.skip(!info.project.use.hasTouch,'Touchscreen coverage.');
 await page.setViewportSize({width:428,height:926});await page.goto('/#analysis');const chart=page.locator('.s-analysis-chart').first();await ready(chart);
 let r=(await chart.boundingBox())!;await page.touchscreen.tap(r.x+120,r.y+120);
 await expect(tooltip(page)).toContainText('新增关注');await expectInsideScreen(page);
 await chart.evaluate(e=>new Promise<void>(resolve=>{
  window.addEventListener('scroll',()=>requestAnimationFrame(()=>resolve()),{once:true});
  window.scrollBy(0,e.getBoundingClientRect().top+294);
 }));
 await expect.poll(()=>chart.evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBe(-294);
 r=(await chart.boundingBox())!;await page.touchscreen.tap(r.x+120,2);
 await expect(tooltip(page)).toContainText('新增关注');await expectInsideScreen(page);
});

test('a chart tooltip follows the visible area when a phone page is zoomed',async({page,browserName},info)=>{
 test.skip(!info.project.use.hasTouch||browserName!=='chromium','Mobile Chromium zoom simulation.');
 await page.setViewportSize({width:390,height:844});await page.goto('/#overview');const chart=page.locator('.s-rank-chart');await chart.scrollIntoViewIfNeeded();await ready(chart);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.5});
 const r=(await chart.boundingBox())!;await page.touchscreen.tap(r.x+150,r.y+40);
 await expect(tooltip(page)).toContainText('为什么京都');await expectInsideScreen(page);
 await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
});

test('desktop chart hover remains visible and changes to the hovered data point',async({page},info)=>{
 test.skip(!!info.project.use.hasTouch,'Mouse hover coverage.');
 await page.goto('/#overview');const chart=page.locator('.s-rank-chart');await ready(chart);const r=(await chart.boundingBox())!;
 await page.mouse.move(r.x+155,r.y+25);await expect(tooltip(page)).toContainText('Vlog 01');await expectInsideScreen(page);
 await page.mouse.move(r.x+155,r.y+105);await expect(tooltip(page)).not.toContainText('Vlog 01');await expectInsideScreen(page);
});
