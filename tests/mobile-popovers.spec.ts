import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce',colorScheme:'light'});
 const day=new Date(Date.now()+8*3600_000).toISOString().slice(0,10);
 await page.route('**/api/**',route=>{const p=new URL(route.request().url()).pathname,body=p==='/api/dashboard/summary'?{configured:false,summary:{}}:p==='/api/acquisition/runs'?{day,today:day,firstDay:day,runs:[{id:'run',status:'partial',started_at:new Date(Date.now()-60000).toISOString(),request_count:100,details:{totalVideos:17,metricCounts:{views:10,likes:15},warnings:['同步遇到了一个需要显示完整详细内容的错误说明。'.repeat(12)]}}]}:p==='/api/backups/status'?{profiles:[]}:p==='/api/bilibili/status'?{connected:true,lastRun:null}:p==='/api/local/status'?{version:'test',uptime:10,autoCollect:true,intervalMinutes:15}:p==='/api/account/profile'?{profile:{uid:'123',name:'测试UP主',avatar:null},accounts:[]}:{};return route.fulfill({json:{ok:true,...body}})});
});
async function bounds(page:any){return page.getByRole('tooltip').evaluate((e:HTMLElement)=>{const r=e.getBoundingClientRect(),v=visualViewport!;return {left:r.left-v.offsetLeft,top:r.top-v.offsetTop,right:r.right-v.offsetLeft,bottom:r.bottom-v.offsetTop,width:v.width,height:v.height,scrollable:e.scrollHeight>e.clientHeight}})}
test('long history details stay inside narrow portrait screens after scrolling',async({page})=>{
 for(const width of [320,390,428]){await page.setViewportSize({width,height:844});await page.goto('/#sources');const cell=page.locator('.s-sync-plot rect[data-status]').last();await cell.scrollIntoViewIfNeeded();await cell.click();const tip=page.getByRole('tooltip');await expect(tip).toContainText('完整详细内容');const b=await bounds(page);expect(b.left).toBeGreaterThanOrEqual(11);expect(b.top).toBeGreaterThanOrEqual(11);expect(b.right).toBeLessThanOrEqual(b.width-11);expect(b.bottom).toBeLessThanOrEqual(b.height-11);await page.keyboard.press('Escape');}
});
test('an open detail popover follows a smaller visual viewport after mobile zoom',async({page,browserName})=>{
 test.skip(browserName!=='chromium','The zoom simulation uses Chromium CDP.');
 await page.setViewportSize({width:390,height:844});await page.goto('/#sources');const cell=page.locator('.s-sync-plot rect[data-status]').last();await cell.scrollIntoViewIfNeeded();await cell.click();await expect(page.getByRole('tooltip')).toBeVisible();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.5});
 await expect.poll(async()=>{const b=await bounds(page);return b.left>=11&&b.top>=11&&b.right<=b.width-11&&b.bottom<=b.height-11}).toBe(true);
 await page.keyboard.press('Escape');await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
});
