import {flushSync} from 'react-dom';
import {chartFont,loadFonts} from '../fonts';
import {request,coverSrc} from '../format';
import {client} from './query-client';
import {capturePage,warmSnapshotStyles} from './page-snapshot';
import type {StudioRoute} from './route';
let revision=0;
let cleanup:(()=>void)|undefined;
let preparing:AbortController|undefined;
const images=new Map<string,Promise<void>>();
function bounded(promise:Promise<unknown>,signal:AbortSignal,ms:number){
 return new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve()};const timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true});promise.then(done,done);if(signal.aborted)done()});
}
export function cancelPageTransition(){revision++;preparing?.abort();cleanup?.();cleanup=undefined;if(document.documentElement.dataset.transitionKind==='page')delete document.documentElement.dataset.transitionKind;delete document.documentElement.dataset.routePhase;flushSync(()=>document.dispatchEvent(new Event('up:route-motion')));}
function decode(src:string){
 let promise=images.get(src);if(promise)return promise;
 const image=new Image();image.decoding='async';image.src=src;promise=image.decode().catch(()=>{images.delete(src)});images.set(src,promise);if(images.size>100)images.delete(images.keys().next().value!);return promise;
}
async function prefetch(route:StudioRoute,signal:AbortSignal){
 const ensure=(key:unknown[],path:string)=>{const cached=client.getQueryData<any>(key);const options={queryKey:key,queryFn:()=>request<any>(path),staleTime:30000};if(cached!==undefined){void client.prefetchQuery(options);return Promise.resolve(cached)}return client.fetchQuery(options)};
 const work=async()=>{
  const summary=await ensure(['summary'],'/api/dashboard/summary');if(signal.aborted)return;
  const captured=summary.summary?.fresh;
  const videos=summary.configured?(await ensure(['videos',captured??null],'/api/videos'+(captured?'?capturedAt='+encodeURIComponent(captured):''))).videos:[];
  if(signal.aborted)return;
  const jobs:Promise<unknown>[]=[loadFonts(chartFont)],covers:Promise<unknown>[]=[];
  if(route.page==='sources')jobs.push(ensure(['bili-status'],'/api/bilibili/status'),ensure(['local-status'],'/api/local/status'),ensure(['acquisition-history'],'/api/acquisition/runs'));
  if(route.page==='analysis'&&route.tab==='ai')jobs.push(import('./AIAnalysis'),ensure(['ai-status'],'/api/ai/status').then(status=>ensure(['ai-conversations',status.accountId??'local',false],'/api/ai/conversations')));
  else if(route.page==='analysis')jobs.push(ensure(['account-history'],'/api/account/history'));
  if(route.video){const video=videos.find((v:any)=>v.id===route.video);if(video){covers.push(decode(coverSrc(video)));jobs.push(ensure(['timeseries',video.id],`/api/videos/${video.id}/timeseries`),ensure(['video-history',video.id,video.captured_at],`/api/videos/${video.id}/history`));}}
  else if(route.page==='videos'||route.page==='overview'||route.page==='analysis'&&route.tab==='videos')covers.push(...videos.slice(0,9).map((v:any)=>decode(coverSrc(v))));
  await Promise.allSettled(jobs);await bounded(Promise.allSettled(covers),signal,100);
 };
 await bounded(work(),signal,2000);
}
export async function preparePage(signal:AbortSignal){
 if(signal.aborted)return;
 const visible=[...document.querySelectorAll<HTMLImageElement>('.studio > .s-main .s-page img')].filter(img=>{const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.width>0});
 visible.forEach(img=>{img.loading='eager'});
 await bounded(Promise.all(visible.map(img=>img.decode().catch(()=>{}))),signal,120);
 if(signal.aborted)return;
 flushSync(()=>{});
 document.dispatchEvent(new Event('up:prepare-view'));
 await bounded(new Promise(r=>setTimeout(r,0)),signal,30);
}
export async function transitionPage(update:()=>void,route?:StudioRoute,restore?:()=>void){
 cancelPageTransition();const token=revision,controller=new AbortController();preparing=controller;
 if(route)await prefetch(route,controller.signal);
 if(controller.signal.aborted||token!==revision)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){flushSync(update);restore?.();preparing=undefined;return;}
 const old=capturePage();
 document.documentElement.dataset.transitionKind='page';
 document.documentElement.dataset.routePhase='preparing';
 const main=document.querySelector<HTMLElement>('.studio > .s-main')!;
 main.style.opacity='0.001';main.style.zIndex='21';main.style.willChange='transform,opacity';
 const animations:Animation[]=[];
 cleanup=()=>{for(const a of animations)a.cancel();old?.remove();main.style.removeProperty('opacity');main.style.removeProperty('transform');main.style.removeProperty('will-change');main.style.removeProperty('z-index')};
 flushSync(update);restore?.();
 await preparePage(controller.signal);
 await bounded(new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),controller.signal,60);
 if(controller.signal.aborted||token!==revision)return;
 document.documentElement.dataset.routePhase='animating';
 // Both navigation and content start on this frame, after layout/decode work.
 flushSync(()=>document.dispatchEvent(new Event('up:route-motion')));
 main.style.willChange='transform,opacity';main.style.removeProperty('opacity');
 animations.push(main.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'}));
 if(old)animations.push(old.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-7px)'}],{duration:280,easing:'cubic-bezier(.4,0,1,1)',fill:'both'}));
 await Promise.allSettled(animations.map(a=>a.finished));
 if(token===revision){cleanup?.();cleanup=undefined;preparing=undefined;delete document.documentElement.dataset.transitionKind;delete document.documentElement.dataset.routePhase;}
}

export function warmRoute(page:string){warmSnapshotStyles();void prefetch({page,video:null,ids:[]},new AbortController().signal)}
