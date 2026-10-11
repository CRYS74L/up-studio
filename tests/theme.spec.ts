import {expect,test} from '@playwright/test';

let pageErrors:string[];
test.beforeEach(async({page})=>{
 pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('insights-theme','light'));
 await page.route('**/api/**',route=>route.fulfill({json:{ok:true,configured:false,summary:{},profile:null,accounts:[],videos:[]}}));
});
test.afterEach(()=>expect(pageErrors).toEqual([]));

test('portrait hides the theme control on every device and only phones follow system changes',async({page},testInfo)=>{
 const phone=testInfo.project.name==='iphone';
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#videos');
 await expect(page.locator('.s-main h1')).toHaveText('我的稿件');
 await expect(page.locator('.s-theme-anchor')).toBeHidden();
 await expect(page.locator('html')).toHaveAttribute('data-theme',phone?'dark':'light');
 await page.emulateMedia({colorScheme:'light'});
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(page.locator('html')).toHaveAttribute('data-theme',phone?'dark':'light');
 expect(await page.evaluate(()=>localStorage.getItem('insights-theme'))).toBe('light');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-theme',phone?'dark':'light');
 await expect(page.locator('.s-theme-anchor')).toBeHidden();
});

test('landscape restores manual control and rotation preserves the last manual preference',async({page},testInfo)=>{
 const phone=testInfo.project.name==='iphone';
 await page.setViewportSize({width:844,height:390});
 await page.goto('/#videos');
 await expect(page.locator('.s-theme-anchor')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.getByRole('button',{name:'深色模式',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.emulateMedia({colorScheme:'light'});
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.setViewportSize({width:390,height:844});
 await expect(page.locator('.s-theme-anchor')).toBeHidden();
 await expect(page.locator('html')).toHaveAttribute('data-theme',phone?'light':'dark');
 expect(await page.evaluate(()=>localStorage.getItem('insights-theme'))).toBe('dark');
 await page.setViewportSize({width:844,height:390});
 await expect(page.locator('.s-theme-anchor')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('control visibility follows page orientation rather than a width threshold',async({page})=>{
 await page.setViewportSize({width:1000,height:1200});
 await page.goto('/#videos');
 await expect(page.locator('.s-main h1')).toHaveText('我的稿件');
 await expect(page.locator('.s-theme-anchor')).toBeHidden();
 await page.setViewportSize({width:480,height:320});
 await expect(page.locator('.s-theme-anchor')).toBeVisible();
});
