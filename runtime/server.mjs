import {acceptsGzip,compressedJson} from './http-compression.mjs';
import {ServiceSettings,loopback} from './service-settings.mjs';
import {CloudBackups} from './cloud-backups.mjs';
import {captureBackup,installRestoredDatabase,recoverRestore} from './cloud-backup-data.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { backup } from 'node:sqlite';
import { createD1 } from './d1.mjs';

const root = path.resolve(process.argv[2]);
const port=Number(process.env.UP_STUDIO_PORT??5173);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');
const current = JSON.parse(fs.readFileSync(path.join(root, 'current.json'), 'utf8'));
const release = path.join(root, 'releases', current.id);
const worker = (await import(pathToFileURL(path.join(release, 'worker.mjs')))).default;
recoverRestore(root);
let db=null;try{db=createD1(path.join(root,'data.sqlite'));if(Object.values(db.database.prepare('PRAGMA quick_check').get())[0]!=='ok'||!db.database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='video_snapshots'").get())throw Error('Database unavailable');}catch{try{db?.database.close()}catch{}db=null;}
let maintenance=false,activeRequests=0,backgroundWrites=0,localBacking=false;
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const started = Date.now();
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const log = event => {
  const file = path.join(root, 'logs', 'service.log');
  if (fs.existsSync(file) && fs.statSync(file).size > 2_000_000) { for (let i=3;i>0;i--) {const from=i===1?file:`${file}.${i-1}`;if(fs.existsSync(from))fs.renameSync(from,`${file}.${i}`);} }
  fs.appendFileSync(file, JSON.stringify({time:new Date().toISOString(),...event})+'\n');
};
const env = {...config, DB:db, ASSETS:{ async fetch(request) {
  let pathname; try { pathname = decodeURIComponent(new URL(request.url).pathname); } catch { return new Response('Invalid URL',{status:400}); }
  const client = path.join(release,'client'); let file = path.resolve(client,'.'+pathname);
  if (!file.startsWith(client+path.sep)) file=path.join(client,'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file=path.join(client,'index.html');
  const zipped=acceptsGzip(request.headers.get('accept-encoding'))&&fs.existsSync(file+'.gz');return new Response(fs.readFileSync(zipped?file+'.gz':file), {headers:{...(zipped?{'Content-Encoding':'gzip','Vary':'Accept-Encoding'}:{}),... {'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':/^\/(?:fonts\/[a-z-]+-[a-f0-9]{12}\.woff2|assets\/[^/]+)$/.test(pathname)?'public, max-age=31536000, immutable':'no-cache'}}});
}}};
let intervalMinutes=[0,5,10,15,30,60,180].includes(config.COLLECT_INTERVAL_MINUTES)?config.COLLECT_INTERVAL_MINUTES:15;let timer;
let collecting=false, lastCollection=null, stopping=false, retryCount=0, retryTimer;
const cloudBackups=new CloudBackups({root,version:current.version,healthy:()=>!!db&&!maintenance,
 capture:file=>{if(!db)throw Error('数据库不可用，请先恢复');return captureBackup(db.database,file,config,current.version)},
 install:async(file,recoveryConfig)=>{maintenance=true;try{const deadline=Date.now()+90000;while(collecting||activeRequests||backgroundWrites||localBacking){if(Date.now()>deadline)throw Error('仍有数据请求正在执行，请稍后重试恢复');await new Promise(resolve=>setTimeout(resolve,100));}
  if(db){const checkpoint=db.database.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();if(checkpoint.busy)throw Error('数据库仍被占用');db.database.close();db=null;env.DB=null;}
  try{const installed=installRestoredDatabase(root,file,recoveryConfig);Object.assign(config,installed.nextConfig);db=createD1(path.join(root,'data.sqlite'));env.DB=db;Object.assign(env,config);intervalMinutes=[0,5,10,15,30,60].includes(config.COLLECT_INTERVAL_MINUTES)?config.COLLECT_INTERVAL_MINUTES:10;clearInterval(timer);if(intervalMinutes>0)timer=setInterval(collect,intervalMinutes*60000);return installed;}catch(error){try{db=createD1(path.join(root,'data.sqlite'));env.DB=db;}catch{}throw error;}
 }finally{maintenance=false}}
});
const cloudTimer=setInterval(()=>{void cloudBackups.tick().catch(()=>log({event:'cloud_backup_failed'}))},60000);
async function collect() {
  if(collecting||stopping||maintenance||!db||intervalMinutes===0)return; collecting=true;
  try {const jobs=[]; await worker.scheduled({cron:'*/15 * * * *'},env,{waitUntil(promise){jobs.push(promise);}}); const results=await Promise.all(jobs); lastCollection=new Date().toISOString();
    const result=results.find(r=>r?.status);const latest=result?{status:result.status,error_code:result.errorCode}:null;
    log({event:'collection_finished',status:latest?.status,errorCode:latest?.error_code});
    if(latest?.status==='failed'&&latest.error_code==='network'&&retryCount<2){retryCount++;retryTimer=setTimeout(collect,retryCount*60_000);}else retryCount=0;
  }
  catch {log({event:'collection_failed'});} finally {collecting=false;}
}
const handler=async(req,res)=>{
  let counted=false;try {
    if(!serviceSettings.allowed(req)){res.writeHead(403);res.end('Access origin denied');return;}
    const url=new URL(req.url,'http://'+req.headers.host);if(url.origin!=='http://'+req.headers.host){res.writeHead(403);res.end();return;}
    if(url.pathname==='/api/local/status') {res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,pid:process.pid,supervisorPid:Number(process.env.BILIBILI_SUPERVISOR_PID)||null,version:current.version,uptime:Math.floor((Date.now()-started)/1000),autoCollect:intervalMinutes>0,intervalMinutes,collecting,lastCollection,recoveryOnly:!db,backupBusy:cloudBackups.job?.status==='running',runtime:'standalone-node',release:current.id}));return;}
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>5_000_000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    if(url.pathname==='/api/local/settings'){const localClient=loopback(req.socket.remoteAddress);try{if(req.method!=='GET'&&!(req.method==='PUT'&&localClient)){res.writeHead(403);res.end();return;}const result=req.method==='GET'?await serviceSettings.status():await serviceSettings.update(JSON.parse(Buffer.concat(chunks).toString('utf8')));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({...result,canEdit:localClient}));}catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:error.message}}));}return;}
    if(url.pathname.startsWith('/api/backups/')){try{const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};const result=await cloudBackups.handle(url,req.method,body);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(result));}catch(error){res.writeHead(400,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:false,error:{message:error.message||'备份操作失败'}}));}return;}
    if(url.pathname.startsWith('/api/')&&(!db||maintenance)){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:{message:maintenance?'正在恢复数据，请稍候':'数据库不可用，请在数据源的数据备份板块恢复'}}));return;}
    if(url.pathname==='/api/local/schedule'&&req.method==='PUT'){
      const value=JSON.parse(Buffer.concat(chunks).toString('utf8')).intervalMinutes;
      if(![0,5,10,15,30,60,180].includes(value)){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:{message:'不支持的更新频率'}}));return;}
      intervalMinutes=value;config.COLLECT_INTERVAL_MINUTES=value;const next=path.join(root,'config.next.json');fs.writeFileSync(next,JSON.stringify(config));fs.renameSync(next,path.join(root,'config.json'));clearInterval(timer);clearTimeout(initial);clearTimeout(retryTimer);if(value>0)timer=setInterval(collect,value*60000);
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,intervalMinutes:value}));return;
    }
    const controller=new AbortController();res.on('close',()=>controller.abort());
    const request=new Request(url,{method:req.method,headers:req.headers,signal:controller.signal,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    activeRequests++;counted=true;
    const rawResponse=!db?await env.ASSETS.fetch(request):await worker.fetch(request,{...env,APP_ORIGIN:url.origin},{waitUntil(p){backgroundWrites++;Promise.resolve(p).catch(()=>log({event:'background_failed'})).finally(()=>backgroundWrites--);},passThroughOnException(){}});
    const response=await compressedJson(rawResponse,req.headers['accept-encoding']);
    res.writeHead(response.status,Object.fromEntries(response.headers));
    if(response.body){const reader=response.body.getReader();const cancel=()=>{void reader.cancel().catch(()=>{})};res.on('close',cancel);try{while(!res.destroyed){const {value,done}=await reader.read();if(done)break;if(!res.write(Buffer.from(value)))await new Promise(resolve=>{const done=()=>{res.off('drain',done);res.off('close',done);resolve()};res.once('drain',done);res.once('close',done)});}}finally{res.off('close',cancel);reader.releaseLock();}}
    res.end();
  } catch {log({event:'request_failed'});if(!res.headersSent)res.writeHead(500);res.end();}finally{if(counted)activeRequests--;}
};
const serviceSettings=new ServiceSettings({root,port,handler});
const server=http.createServer(handler);
server.on('error',error=>{log({event:'listen_failed',code:error.code});db?.database.close();process.exit(1);});
server.listen(port,'127.0.0.1',()=>{fs.writeFileSync(path.join(root,'service.json'),JSON.stringify({pid:process.pid,started,release:current.id}));log({event:'started',pid:process.pid,version:current.version});});
if(intervalMinutes>0)timer=setInterval(collect,intervalMinutes*60_000);
const initial=setTimeout(collect,60_000);
const backups=setInterval(async()=>{if(!db||maintenance||stopping||localBacking)return;localBacking=true;try{
  const indexFile=path.join(root,'backups','owned.json');
  const owned=fs.existsSync(indexFile)?JSON.parse(fs.readFileSync(indexFile,'utf8')):[];
  const name=`data-${new Date().toISOString().slice(0,10)}.sqlite`,target=path.join(root,'backups',name);
  if(!fs.existsSync(target)){await backup(db.database,target);owned.push(name);}
  owned.sort();
  for(const file of owned.slice(0,-7)){if(/^data-\d{4}-\d{2}-\d{2}\.sqlite$/.test(file)){const ownedPath=path.join(root,'backups',file);if(fs.existsSync(ownedPath))fs.unlinkSync(ownedPath);}}
  fs.writeFileSync(indexFile,JSON.stringify(owned.slice(-7)));
}catch{log({event:'backup_failed'});}finally{localBacking=false;}},60*60_000);
let delayedStop;function stop(){if(stopping)return;if(cloudBackups.job?.status==='running'){if(!delayedStop)delayedStop=setTimeout(()=>{delayedStop=null;stop()},1000);return;}stopping=true;serviceSettings.close();clearInterval(cloudTimer);cloudBackups.close();clearInterval(timer);clearTimeout(initial);clearTimeout(retryTimer);clearInterval(backups);server.close(()=>{const drain=setInterval(()=>{if(collecting||activeRequests||backgroundWrites||localBacking)return;clearInterval(drain);db?.database.close();log({event:'stopped'});process.exit(0);},100);});setTimeout(()=>{log({event:'stop_timeout'});process.exit(0);},120_000).unref();}
setInterval(()=>{if(fs.existsSync(path.join(root,'stop.request')))stop();},1000).unref();
process.on('SIGTERM',stop);process.on('SIGINT',stop);
