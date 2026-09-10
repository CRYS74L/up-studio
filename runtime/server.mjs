import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { backup } from 'node:sqlite';
import { createD1 } from './d1.mjs';

const root = path.resolve(process.argv[2]);
const current = JSON.parse(fs.readFileSync(path.join(root, 'current.json'), 'utf8'));
const release = path.join(root, 'releases', current.id);
const worker = (await import(pathToFileURL(path.join(release, 'worker.mjs')))).default;
const db = createD1(path.join(root, 'data.sqlite'));
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
  return new Response(fs.readFileSync(file), {headers:{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':/^\/fonts\/[a-z-]+-[a-f0-9]{12}\.woff2$/.test(pathname)?'public, max-age=31536000, immutable':'no-cache'}});
}}};
let intervalMinutes=[0,5,10,15,30,60,180].includes(config.COLLECT_INTERVAL_MINUTES)?config.COLLECT_INTERVAL_MINUTES:15;let timer;
let collecting=false, lastCollection=null, stopping=false, retryCount=0, retryTimer;
async function collect() {
  if(collecting||stopping||intervalMinutes===0)return; collecting=true;
  try {const jobs=[]; await worker.scheduled({cron:'*/15 * * * *'},env,{waitUntil(promise){jobs.push(promise);}}); await Promise.all(jobs); lastCollection=new Date().toISOString();
    const latest=await db.prepare('SELECT status,error_code FROM acquisition_runs ORDER BY started_at DESC LIMIT 1').first();
    log({event:'collection_finished',status:latest?.status,errorCode:latest?.error_code});
    if(latest?.status==='failed'&&latest.error_code==='network'&&retryCount<2){retryCount++;retryTimer=setTimeout(collect,retryCount*60_000);}else retryCount=0;
  }
  catch {log({event:'collection_failed'});} finally {collecting=false;}
}
const server=http.createServer(async(req,res)=>{
  try {
    const allowedHosts=new Set(['localhost:5173','127.0.0.1:5173']);
    if(!allowedHosts.has(req.headers.host) || (req.headers.origin && !['http://localhost:5173','http://127.0.0.1:5173'].includes(req.headers.origin))) {res.writeHead(403);res.end('Local origin required');return;}
    const url=new URL(req.url,'http://localhost:5173');
    if(url.pathname==='/api/local/status') {res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,pid:process.pid,supervisorPid:Number(process.env.BILIBILI_SUPERVISOR_PID)||null,version:current.version,uptime:Math.floor((Date.now()-started)/1000),autoCollect:intervalMinutes>0,intervalMinutes,collecting,lastCollection,runtime:'standalone-node',release:current.id}));return;}
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>5_000_000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    if(url.pathname==='/api/local/schedule'&&req.method==='PUT'){
      const value=JSON.parse(Buffer.concat(chunks).toString('utf8')).intervalMinutes;
      if(![0,5,10,15,30,60,180].includes(value)){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error:{message:'不支持的更新频率'}}));return;}
      intervalMinutes=value;config.COLLECT_INTERVAL_MINUTES=value;const next=path.join(root,'config.next.json');fs.writeFileSync(next,JSON.stringify(config));fs.renameSync(next,path.join(root,'config.json'));clearInterval(timer);clearTimeout(initial);clearTimeout(retryTimer);if(value>0)timer=setInterval(collect,value*60000);
      res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,intervalMinutes:value}));return;
    }
    const controller=new AbortController();res.on('close',()=>controller.abort());
    const request=new Request(url,{method:req.method,headers:req.headers,signal:controller.signal,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const response=await worker.fetch(request,env,{waitUntil(p){p.catch(()=>log({event:'background_failed'}));},passThroughOnException(){}});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    if(response.body){const reader=response.body.getReader();const cancel=()=>{void reader.cancel().catch(()=>{})};res.on('close',cancel);try{while(!res.destroyed){const {value,done}=await reader.read();if(done)break;if(!res.write(Buffer.from(value)))await new Promise(resolve=>{const done=()=>{res.off('drain',done);res.off('close',done);resolve()};res.once('drain',done);res.once('close',done)});}}finally{res.off('close',cancel);reader.releaseLock();}}
    res.end();
  } catch {log({event:'request_failed'});if(!res.headersSent)res.writeHead(500);res.end();}
});
server.on('error',error=>{log({event:'listen_failed',code:error.code});db.database.close();process.exit(1);});
server.listen(5173,'127.0.0.1',()=>{fs.writeFileSync(path.join(root,'service.json'),JSON.stringify({pid:process.pid,started,release:current.id}));log({event:'started',pid:process.pid,version:current.version});});
if(intervalMinutes>0)timer=setInterval(collect,intervalMinutes*60_000);
const initial=setTimeout(collect,60_000);
const backups=setInterval(async()=>{try{
  const indexFile=path.join(root,'backups','owned.json');
  const owned=fs.existsSync(indexFile)?JSON.parse(fs.readFileSync(indexFile,'utf8')):[];
  const name=`data-${new Date().toISOString().slice(0,10)}.sqlite`,target=path.join(root,'backups',name);
  if(!fs.existsSync(target)){await backup(db.database,target);owned.push(name);}
  owned.sort();
  for(const file of owned.slice(0,-7)){if(/^data-\d{4}-\d{2}-\d{2}\.sqlite$/.test(file)){const ownedPath=path.join(root,'backups',file);if(fs.existsSync(ownedPath))fs.unlinkSync(ownedPath);}}
  fs.writeFileSync(indexFile,JSON.stringify(owned.slice(-7)));
}catch{log({event:'backup_failed'});}},60*60_000);
function stop(){if(stopping)return;stopping=true;clearInterval(timer);clearTimeout(initial);clearTimeout(retryTimer);clearInterval(backups);server.close(()=>{const drain=setInterval(()=>{if(collecting)return;clearInterval(drain);db.database.close();log({event:'stopped'});process.exit(0);},100);});setTimeout(()=>{log({event:'stop_timeout'});process.exit(0);},120_000).unref();}
setInterval(()=>{if(fs.existsSync(path.join(root,'stop.request')))stop();},1000).unref();
process.on('SIGTERM',stop);process.on('SIGINT',stop);
