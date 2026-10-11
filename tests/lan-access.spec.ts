import {expect,test,type Page} from '@playwright/test';

const conversation={id:'qa-chat',title:'功能显示验证',messages:[{id:'q',role:'user',content:'测试问题'},{id:'a',role:'assistant',content:'测试回复',status:'complete'}],videoIds:['1'],busy:false};
const videos=[{id:'1',bvid:'BV_QA_1',title:'测试稿件',cover_url:null,duration_seconds:60,published_at:'2026-10-01T08:00:00Z',views:100,impressions:null,cover_ctr:null,avg_watch_seconds:30,avg_watch_percent:50,followers_gained:0,captured_at:'2026-10-11T08:00:00Z',metrics:{likes:1,comments:0,danmaku:0,favorites:0,coins:0,shares:0},dimensions:{}}];
const summary={configured:true,freshnessMinutes:0,summary:{account_followers:1,avg_views:100,avg_interactions:1,views:100,followers:0,cover_ctr:null,avg_watch_percent:50,avg_watch_seconds:30,interaction_rate:1,fresh:videos[0].captured_at},comparison:{},acquisition:{status:'success',coverage:1,details:{totalVideos:1,completeVideos:1,metricCounts:{views:1},missingByVideo:[],warnings:[],plannedNotIntegrated:[],capabilityCounts:{}}}};
let pageErrors:string[];
test.beforeEach(async({page})=>{pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'})});
test.afterEach(()=>expect(pageErrors).toEqual([]));

async function app(page:Page,baseURL:string,lan:boolean,busy=false){
 const origin=lan?'http://10.77.0.44:'+new URL(baseURL).port:baseURL;
 await page.addInitScript(()=>{localStorage.setItem('up-ai-active:123','qa-chat');localStorage.setItem('insights-theme','light')});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  if(path.startsWith('/api/')){
   if(path.startsWith('/api/covers/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#eee"/></svg>'});
   const body=path==='/api/local/settings'?{canEdit:!lan,startup:{available:true,enabled:true},lan:{enabled:true,addresses:['http://10.77.0.44:5173']},busy:false}
    :path==='/api/local/status'?{version:'qa',uptime:1,intervalMinutes:10,runtime:'standalone-node'}
    :path==='/api/account/profile'?{profile:{uid:'123',name:'测试UP主',avatar:null},accounts:[]}
    :path==='/api/dashboard/summary'?summary
    :path==='/api/acquisition/runs'?{runs:[]}
    :path==='/api/dashboard/history'||path==='/api/account/history'?{points:[]}
    :path==='/api/ai/status'?{configured:true,accountId:'123',model:'deepseek-flash',effort:'high'}
    :path==='/api/ai/conversations'?{conversations:[{...conversation,busy}]}
    :path==='/api/ai/conversations/qa-chat'?{conversation:{...conversation,busy}}
    :path==='/api/videos'?{videos}:{};
   return route.fulfill({json:{ok:true,...body}});
  }
  if(lan&&url.origin===origin)return route.fulfill({response:await route.fetch({url:new URL(url.pathname+url.search,baseURL).href})});
  return route.continue();
 });
 return origin;
}

for(const lan of [false,true]){
 test((lan?'LAN':'local')+' navigation and direct settings links respect available service controls',async({page,baseURL})=>{
  const origin=await app(page,baseURL!,lan);
  await page.goto(origin+'/#settings');
  await expect(page.locator('.s-main h1')).toHaveText(lan?'概览':'设置');
  await expect(page.locator('[data-nav-id="settings"]')).toHaveCount(lan?0:2);
  await expect(page.locator('.s-service-settings')).toHaveCount(lan?0:1);
  if(lan){
   await expect(page).toHaveURL(/#overview$/);
   await expect(page.locator('.s-sidebar [data-nav-id]')).toHaveCount(4);
   await expect(page.locator('.s-mobile-nav [data-nav-id]')).toHaveCount(4);
   await page.goto(origin+'/#videos');
   await expect(page.locator('.s-main h1')).toHaveText('稿件');
   await page.evaluate(()=>{location.hash='#settings'});
   await expect(page.locator('.s-main h1')).toHaveText('概览');
   await expect(page).toHaveURL(/#overview$/);
  }else{
   await expect(page.getByRole('switch',{name:'开机自启动'})).toBeEnabled();
   await expect(page.getByRole('button',{name:/^复制地址 /})).toHaveCount(1);
  }
 });

 test((lan?'LAN':'local')+' message actions reflect clipboard and generation ownership',async({page,baseURL})=>{
  const origin=await app(page,baseURL!,lan,true);
  await page.goto(origin+'/#analysis?tab=ai');
  await expect(page.locator('.s-chat-message')).toHaveCount(2);
  await expect(page.getByRole('button',{name:'复制消息',exact:true})).toHaveCount(lan?0:2);
  for(const label of ['从消息创建分支','编辑消息','重新回答'])await expect(page.getByRole('button',{name:label,exact:true})).toHaveCount(0);
  if(lan)await expect(page.getByRole('button',{name:'停止生成',exact:true})).toHaveCount(0);
  else await expect(page.getByRole('button',{name:'停止生成',exact:true})).toBeDisabled();
 });

 test((lan?'LAN':'local')+' keeps stop available for generation started in this page',async({page,baseURL})=>{
  const origin=await app(page,baseURL!,lan);
  await page.addInitScript(()=>{
   const originalFetch=window.fetch;
   window.fetch=(input,init)=>{
    if(input==='/api/ai/chat'){
     const stream=new ReadableStream<Uint8Array>({start(controller){
      const payload={id:'qa-chat',title:'功能显示验证',messages:[{id:'q',role:'user',content:'测试问题'},{id:'a',role:'assistant',content:'',status:'pending'}],videoIds:['1']};
      controller.enqueue(new TextEncoder().encode('event: conversation\ndata: '+JSON.stringify(payload)+'\n\n'));
      init?.signal?.addEventListener('abort',()=>controller.close(),{once:true});
     }});
     return Promise.resolve(new Response(stream,{headers:{'content-type':'text/event-stream'}}));
    }
    return originalFetch.call(window,input,init);
   };
  });
  await page.goto(origin+'/#analysis?tab=ai');
  await expect(page.locator('.s-chat-message')).toHaveCount(2);
  for(const label of ['从消息创建分支','编辑消息','重新回答'])await expect(page.getByRole('button',{name:label,exact:true})).toHaveCount(0);
  await page.getByRole('textbox',{name:'AI对话消息',exact:true}).fill('测试停止按钮');
  await page.getByRole('button',{name:'发送消息',exact:true}).click();
  await expect(page.getByRole('button',{name:'停止生成',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'停止生成',exact:true}).click();
  await expect(page.getByRole('button',{name:'停止生成',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'发送消息',exact:true})).toBeVisible();
 });
}
