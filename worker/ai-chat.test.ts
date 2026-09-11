import {it,expect,vi,afterEach} from 'vitest';
import {Hono} from 'hono';
import fs from 'node:fs';
import {registerChat,chatRequest} from './ai-chat';
import {aiModel,aiEffort} from './ai-analysis';
// @ts-ignore Production SQLite adapter.
import {createD1} from '../runtime/d1.mjs';
afterEach(()=>vi.unstubAllGlobals());
function setup(){
 const db=createD1(':memory:');db.database.exec(`CREATE TABLE videos(id TEXT,bvid TEXT,title TEXT,published_at TEXT,duration_seconds REAL,cover_url TEXT);CREATE TABLE video_snapshots(id INTEGER PRIMARY KEY,video_id TEXT,captured_at TEXT,views REAL,avg_watch_seconds REAL,avg_watch_percent REAL,followers_gained REAL,metrics_json TEXT,dimensions_json TEXT DEFAULT '{}');CREATE TABLE account_trends(day TEXT,followers REAL,follows REAL,unfollows REAL,views REAL);CREATE TABLE video_trend_points(video_id TEXT,type TEXT,window TEXT,date_key INTEGER,total_inc REAL);CREATE TABLE settings(key TEXT,value_json TEXT);CREATE TABLE ai_cache(snapshot_key TEXT PRIMARY KEY,model TEXT,prompt_version TEXT,response_json TEXT,cost_cny REAL,created_at TEXT);INSERT INTO videos VALUES('1','BV_TEST','测试稿件','2026-09-01',60,NULL);INSERT INTO video_snapshots VALUES(1,'1','2026-09-10',100,30,50,2,'{}','{}');`);
 db.database.exec(fs.readFileSync('migrations/0006_ai_conversations.sql','utf8'));db.database.exec(fs.readFileSync('migrations/0007_chat_archive.sql','utf8'));
 const app=new Hono();registerChat(app,async()=> 'test-key');
 const env={DB:db,DEEPSEEK_MODEL:'deepseek-v4-flash',AI_DAILY_CNY_LIMIT:'5',AI_MONTHLY_CNY_LIMIT:'10'};
 return {db,app,env};
}
const response=()=>new Response(`data: ${JSON.stringify({choices:[{delta:{reasoning_content:'not in answer'}}]})}\n\ndata: ${JSON.stringify({choices:[{delta:{content:'建议比较同长度稿件。'},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20}})}\n\ndata: [DONE]\n\n`,{headers:{'content-type':'text/event-stream'}});
it('streams, persists followups and isolates conversations by account',async()=>{
 const {db,app,env}=setup(),requests:any[]=[];
 vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{requests.push(JSON.parse(init.body));return response()}));
 const call=(body:any)=>app.request('/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)},env);
 const first=await call({message:'如何改进',ids:['1']});expect(first.status).toBe(200);const stream=await first.text();expect(stream).toContain('event: delta');expect(stream).toContain('event: done');expect(stream).not.toContain('not in answer');
 const row=db.database.prepare('SELECT * FROM ai_conversations').get();expect(JSON.parse(row.messages_json)).toHaveLength(2);expect(row.busy_until).toBe(0);
 expect(requests[0].model).toBe('deepseek-flash');expect(requests[0].reasoning_effort).toBe('high');expect(requests[0].messages[1].content).toContain('测试稿件');
 await (await call({conversationId:row.id,message:'继续，如何验证？',ids:['1'],model:'deepseek-v4-pro',effort:'max'})).text();
 expect(requests[1].model).toBe('deepseek-v4-pro');expect(requests[1].reasoning_effort).toBe('max');
 expect(requests[1].messages.slice(-3).map((m:any)=>m.role)).toEqual(['user','assistant','user']);
 const saved:any=await(await app.request('/api/ai/conversations/'+row.id,{},env)).json();expect(saved.conversation.messages).toHaveLength(4);expect(saved.conversation.messages.at(-1).status).toBe('complete');
 expect((await app.request('/api/ai/conversations/'+row.id,{}, {...env,DB:{...db,accountUid:'other'}})).status).toBe(404);
 expect((await call({message:'问题',ids:[]})).status).toBe(400);db.database.close();
});
it('retains failed questions, releases leases, enforces budgets and imports old reports once',async()=>{
 const {db,app,env}=setup();vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:401})));
 const call=(e:any)=>app.request('/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'保留这个问题',ids:['1']})},e);
 await(await call(env)).text();const row=db.database.prepare('SELECT * FROM ai_conversations').get();expect(JSON.parse(row.messages_json)[0].content).toBe('保留这个问题');expect(JSON.parse(row.messages_json)[1].status).toBe('error');expect(row.busy_until).toBe(0);
 expect((await call({...env,AI_DAILY_CNY_LIMIT:'0.00001'})).status).toBe(429);
 const report={accountId:'local',question:'旧分析',videoIds:['1'],report:{summary:'旧结论',findings:[{title:'发现',observation:'观察',evidence:[{videoId:'1',metric:'views',value:100,title:'测试稿件'}]}],experiments:[]}};
 db.database.prepare('INSERT INTO ai_cache VALUES(?,?,?,?,?,?)').run('old','old','old',JSON.stringify(report),0,'2026-09-09');
 await app.request('/api/ai/conversations',{},env);await app.request('/api/ai/conversations',{},env);expect(db.database.prepare("SELECT COUNT(*) n FROM ai_conversations WHERE id='report:old'").get().n).toBe(1);db.database.close();
});
it('maps retired models and reasoning names and only attaches covers when requested',async()=>{
 const {db,env}=setup();db.database.exec(`INSERT INTO settings VALUES('deepseek_model','"deepseek-v4-flash-vision-exp"');INSERT INTO settings VALUES('deepseek_effort','"off"');`);
 expect(await aiModel(env)).toBe('deepseek-flash');expect(await aiEffort(env)).toBe('low');
 const data={videos:[{title:'封面',coverUrl:'https://i0.hdslb.com/test.jpg'}]};
 expect(Array.isArray(chatRequest('deepseek-flash','max',data,[],true).messages[1].content)).toBe(true);
 expect(typeof chatRequest('deepseek-flash','max',data,[],false).messages[1].content).toBe('string');
 expect(typeof chatRequest('deepseek-v4-pro','high',data,[],true).messages[1].content).toBe('string');db.database.close();
});

it('stops an upstream stream and saves the partial answer without holding the conversation lock',async()=>{
 const {db,app,env}=setup();
 vi.stubGlobal('fetch',vi.fn(async(_url,init)=>new Response(new ReadableStream({start(controller){
   controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:'已经生成的部分'}}]})+'\n\n'));
   init.signal.addEventListener('abort',()=>controller.error(new Error('aborted')));
 }}),{headers:{'content-type':'text/event-stream'}})));
 const response=await app.request('/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'请分析',ids:['1']})},env);
 const reader=response.body!.getReader();let content='';while(!content.includes('event: delta')){content+=new TextDecoder().decode((await reader.read()).value)}await reader.cancel();
 await vi.waitFor(()=>{const row=db.database.prepare('SELECT * FROM ai_conversations').get();expect(row.busy_until).toBe(0);const message=JSON.parse(row.messages_json).at(-1);expect(message.status).toBe('stopped');expect(message.content).toBe('已经生成的部分');});db.database.close();
});

it('renames, archives, restores and branches conversations without losing the original',async()=>{
 const {db,app,env}=setup();vi.stubGlobal('fetch',vi.fn(async()=>response()));
 await(await app.request('/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'原始问题',ids:['1']})},env)).text();
 const row=db.database.prepare('SELECT * FROM ai_conversations').get(),messages=JSON.parse(row.messages_json);
 const patch=(body:any,e:any=env)=>app.request('/api/ai/conversations/'+row.id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)},e);
 expect((await patch({title:'重新命名',archived:true})).status).toBe(200);
 const active:any=await(await app.request('/api/ai/conversations',{},env)).json();expect(active.conversations).toHaveLength(0);
 const archived:any=await(await app.request('/api/ai/conversations?archived=1',{},env)).json();expect(archived.conversations[0].title).toBe('重新命名');
 await patch({archived:false});const fork:any=await(await app.request('/api/ai/conversations/'+row.id+'/fork',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messageId:messages[0].id})},env)).json();expect(fork.conversation.messages).toHaveLength(1);expect(fork.conversation.id).not.toBe(row.id);expect(JSON.parse(db.database.prepare('SELECT messages_json FROM ai_conversations WHERE id=?').get(row.id).messages_json)).toHaveLength(2);
 expect((await patch({title:'越权'},{...env,DB:{...db,accountUid:'other'}})).status).toBe(404);db.database.close();
});

it('attaches images only to user messages and reports usage on saved replies',async()=>{
 const {db,app,env}=setup();let body:any;vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{body=JSON.parse(init.body);return response()}));
 const attachment={name:'参考.png',dataUrl:'data:image/png;base64,aGVsbG8='};
 await(await app.request('/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'分析图片',ids:['1'],attachments:[attachment]})},env)).text();
 expect(body.messages.at(-1).role).toBe('user');expect(body.messages.at(-1).content[1].image_url.url).toBe(attachment.dataUrl);
 const messages=JSON.parse(db.database.prepare('SELECT messages_json FROM ai_conversations').get().messages_json);expect(messages[0].attachments[0].name).toBe('参考.png');expect(messages[1].usage.outputTokens).toBe(20);expect(messages[1].elapsedMs).toBeGreaterThanOrEqual(0);db.database.close();
});
