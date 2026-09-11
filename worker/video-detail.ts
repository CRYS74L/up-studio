import {decodeFrameTimes,type FrameIndex} from '../shared/video-frames';
import {decryptJson} from './crypto';
import {rootDatabase} from './accounts';
const headers={'user-agent':'Mozilla/5.0',referer:'https://www.bilibili.com/'};
const safeImage=(raw:string)=>{const url=new URL(raw.startsWith('//')?'https:'+raw:raw);if(url.protocol!=='https:'||!/(^|\.)hdslb\.com$/.test(url.hostname))throw Error('Invalid frame host');return url.href;};
const cache=new Map<string,{expires:number;value:Promise<FrameIndex>}>();
async function frameIndex(bvid:string):Promise<FrameIndex>{
 const existing=cache.get(bvid);if(existing&&existing.expires>Date.now())return existing.value;
 const value=(async()=>{const view:any=await(await fetch('https://api.bilibili.com/x/web-interface/view?bvid='+encodeURIComponent(bvid),{headers,signal:AbortSignal.timeout(10000)})).json();if(view.code!==0||!view.data?.cid)throw Error('Frame metadata unavailable');
 const response:any=await(await fetch('https://api.bilibili.com/x/player/videoshot?bvid='+encodeURIComponent(bvid)+'&cid='+view.data.cid,{headers,signal:AbortSignal.timeout(10000)})).json(),data=response.data;
 if(response.code!==0||!data?.pvdata||!data.image?.length)throw Error('Frames unavailable');
 const columns=Number(data.img_x_len),rows=Number(data.img_y_len),width=Number(data.img_x_size),height=Number(data.img_y_size);
 if(![columns,rows,width,height].every(n=>Number.isInteger(n)&&n>0)||columns>100||rows>100||width>2048||height>2048||!Array.isArray(data.image)||data.image.length>100)throw Error('Invalid frame dimensions');
 const bin=await fetch(safeImage(data.pvdata),{headers,signal:AbortSignal.timeout(10000)});if(!bin.ok)throw Error('Frame index unavailable');
 return {times:decodeFrameTimes(await bin.arrayBuffer()),columns,rows,width,height,images:data.image.map(safeImage)};
 })();cache.set(bvid,{value,expires:Date.now()+3600000});if(cache.size>50)cache.delete(cache.keys().next().value!);value.catch(()=>cache.delete(bvid));return value;
}
export function registerVideoDetail(app:any){
 const video=(c:any)=>c.env.DB.prepare('SELECT bvid FROM videos WHERE id=?').bind(c.req.param('id')).first();
 app.get('/api/videos/:id/frames',async(c:any)=>{const v=await video(c);if(!v)return c.json({ok:false},404);try{const frames=await frameIndex(v.bvid);return c.json({ok:true,available:true,...frames,images:frames.images.map((_,i)=>'/api/videos/'+encodeURIComponent(c.req.param('id'))+'/frames/'+i)})}catch{return c.json({ok:true,available:false})}});
 app.get('/api/videos/:id/frames/:sheet',async(c:any)=>{const v=await video(c),sheet=Number(c.req.param('sheet'));if(!v||!Number.isInteger(sheet)||sheet<0)return new Response(null,{status:404});try{const frames=await frameIndex(v.bvid);if(!frames.images[sheet])return new Response(null,{status:404});const r=await fetch(frames.images[sheet],{headers,signal:AbortSignal.timeout(10000)});if(!r.ok)return new Response(null,{status:502});return new Response(r.body,{headers:{'content-type':r.headers.get('content-type')||'image/jpeg','cache-control':'public,max-age=3600','cross-origin-resource-policy':'same-origin'}})}catch{return new Response(null,{status:502})}});
 app.get('/api/videos/:id/realtime',async(c:any)=>{const v=await video(c);if(!v)return c.json({ok:false},404);const db=rootDatabase(c.env.DB),secret:any=await db.prepare("SELECT ciphertext,iv FROM encrypted_secrets WHERE id='bilibili_session'").first();if(!secret)return c.json({ok:true,available:false});try{const {session}=await decryptJson<{session:string}>(secret.ciphertext,secret.iv,c.env.MASTER_ENCRYPTION_KEY_BASE64);const response:any=await(await fetch('https://member.bilibili.com/x/web/data/real_time_play_num?bvid='+encodeURIComponent(v.bvid),{headers:{...headers,referer:'https://member.bilibili.com/',cookie:session},signal:AbortSignal.timeout(10000)})).json();const data=response.data,value=data?.play??data?.real_time_play??data?.num;return c.json({ok:true,available:response.code===0&&typeof value==='number',value:response.code===0&&typeof value==='number'?value:null,at:new Date().toISOString()})}catch{return c.json({ok:true,available:false})}});
}
