import {flushSync} from 'react-dom';
import {chartFont,loadFonts} from '../fonts';
import {request,coverSrc} from '../format';
import {client} from './query-client';
import type {StudioRoute} from './route';
let revision=0;
let active:ViewTransition|undefined;
let preparing:AbortController|undefined;
const images=new Map<string,Promise<void>>();
function bounded(promise:Promise<unknown>,signal:AbortSignal,ms:number){
 return new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve()};const timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true});promise.then(done,done);if(signal.aborted)done()});
}
export function cancelPageTransition(){revision++;preparing?.abort();active?.skipTransition();active=undefined;if(document.documentElement.dataset.transitionKind==='page')delete document.documentElement.dataset.transitionKind;}
function decode(src:string){
 let promise=images.get(src);if(promise)return promise;
 const image=new Image();image.decoding='async';image.src=src;promise=image.decode().catch(()=>{images.delete(src)});images.set(src,promise);if(images.size>100)images.delete(images.keys().next().value!);return promise;
}
async function prefetch(route:StudioRoute,signal:AbortSignal){
 const ensure=(key:unknown[],path:string)=>client.fetchQuery({queryKey:key,queryFn:()=>request<any>(path),staleTime:30000});
 const work=async()=>{
  const summary=await ensure(['summary'],'/api/dashboard/summary');if(signal.aborted)return;
  const captured=summary.summary?.fresh;
  const videos=summary.configured?(await ensure(['videos',captured??null],'/api/videos'+(captured?'?capturedAt='+encodeURIComponent(captured):''))).videos:[];
  if(signal.aborted)return;
  const jobs:Promise<unknown>[]=[loadFonts(chartFont)];
  if(route.page==='sources')jobs.push(ensure(['bili-status'],'/api/bilibili/status'),ensure(['local-status'],'/api/local/status'),ensure(['acquisition-history'],'/api/acquisition/runs'));
  if(route.page==='analysis'&&route.tab==='ai')jobs.push(import('./AIAnalysis'),ensure(['ai-status'],'/api/ai/status').then(status=>ensure(['ai-conversations',status.accountId??'local',false],'/api/ai/conversations')));
  else if(route.page==='analysis')jobs.push(ensure(['account-history'],'/api/account/history'));
  if(route.video){const video=videos.find((v:any)=>v.id===route.video);if(video)jobs.push(decode(coverSrc(video)),ensure(['timeseries',video.id],`/api/videos/${video.id}/timeseries`),ensure(['video-history',video.id,video.captured_at],`/api/videos/${video.id}/history`));}
  else if(route.page==='videos'||route.page==='overview'||route.page==='analysis'&&route.tab==='videos')jobs.push(...videos.slice(0,9).map((v:any)=>decode(coverSrc(v))));
  await Promise.allSettled(jobs);
 };
 await bounded(work(),signal,2000);
}
export async function preparePage(signal:AbortSignal){
 if(signal.aborted)return;
 const visible=[...document.querySelectorAll<HTMLImageElement>('.s-page img')].filter(img=>{const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.width>0});
 visible.forEach(img=>{img.loading='eager'});
 await bounded(Promise.all(visible.map(img=>img.decode().catch(()=>{}))),signal,120);
 if(signal.aborted)return;
 flushSync(()=>{});
 document.dispatchEvent(new Event('up:prepare-view'));
 await bounded(new Promise(r=>setTimeout(r,0)),signal,30);
}
export async function transitionPage(update:()=>void,route?:StudioRoute,restore?:()=>void){
 cancelPageTransition();const token=revision,controller=new AbortController();preparing=controller;
 // Fetch/decode while the existing page and sidebar remain live, before taking snapshots.
 if(route)await prefetch(route,controller.signal);
 if(controller.signal.aborted||token!==revision)return;
 if(!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){flushSync(update);restore?.();preparing=undefined;return;}
 document.documentElement.dataset.transitionKind='page';
 active=document.startViewTransition(async()=>{if(controller.signal.aborted)return;flushSync(update);restore?.();await preparePage(controller.signal)});
 active.finished.catch(()=>{}).finally(()=>{if(token===revision){if(document.documentElement.dataset.transitionKind==='page')delete document.documentElement.dataset.transitionKind;active=undefined;preparing=undefined}});
}
