import {flushSync} from 'react-dom';
import {warmCover} from './cover-loading';
import {chartFont,loadFonts} from '../fonts';
import {request,coverSrc} from '../format';
import {client} from './query-client';
import {capturePage} from './page-snapshot';
import type {StudioRoute} from './route';
import {animateSwap,releaseSwap,type SlideDirection} from './transition-motion';
let revision=0;
let cleanup:(()=>void)|undefined;
let preparing:AbortController|undefined;
function bounded(promise:Promise<unknown>,signal:AbortSignal,ms:number){
 return new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve()};const timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true});promise.then(done,done);if(signal.aborted)done()});
}
export function cancelPageTransition(){revision++;preparing?.abort();cleanup?.();cleanup=undefined;if(document.documentElement.dataset.transitionKind==='page')delete document.documentElement.dataset.transitionKind;delete document.documentElement.dataset.routePhase;flushSync(()=>document.dispatchEvent(new Event('up:route-motion')));}
const decode=warmCover;
async function prefetch(route:StudioRoute,signal:AbortSignal){
 const ensure=(key:unknown[],path:string)=>{const cached=client.getQueryData<any>(key);const options={queryKey:key,queryFn:()=>request<any>(path),staleTime:30000};if(cached!==undefined){void client.prefetchQuery(options);return Promise.resolve(cached)}return client.fetchQuery(options)};
 const work=async()=>{
  if(route.page==='settings'){await ensure(['service-settings'],'/api/local/settings');return;}
  if(route.page==='sources'){await Promise.allSettled([ensure(['bili-status'],'/api/bilibili/status'),ensure(['local-status'],'/api/local/status'),ensure(['acquisition-history',''],'/api/acquisition/runs'),ensure(['cloud-backups'],'/api/backups/status'),ensure(['account-profile'],'/api/account/profile')]);return;}
  const summary=await ensure(['summary'],'/api/dashboard/summary');if(signal.aborted)return;
  const captured=summary.summary?.fresh;
  const videos=summary.configured?(await ensure(['videos',captured??null],'/api/videos'+(captured?'?capturedAt='+encodeURIComponent(captured):''))).videos:[];
  if(signal.aborted)return;
  const jobs:Promise<unknown>[]=[],covers:Promise<unknown>[]=[];
  if(route.page==='overview'||route.page==='analysis'&&route.tab!=='ai'||route.video)jobs.push(loadFonts(chartFont));
  if(route.page==='sources')jobs.push(ensure(['bili-status'],'/api/bilibili/status'),ensure(['local-status'],'/api/local/status'),ensure(['acquisition-history',''],'/api/acquisition/runs'));
  if(route.page==='analysis'&&route.tab==='ai')jobs.push(import('./AIAnalysis'),ensure(['ai-status'],'/api/ai/status').then(status=>ensure(['ai-conversations',status.accountId??'local',false],'/api/ai/conversations')));
  else if(route.page==='analysis')jobs.push(ensure(['account-history'],'/api/account/history'));
  if(route.video){const video=videos.find((v:any)=>v.id===route.video);if(video){covers.push(decode(coverSrc(video,'card')));jobs.push(ensure(['timeseries',video.id],`/api/videos/${video.id}/timeseries`),ensure(['video-history',video.id,video.captured_at],`/api/videos/${video.id}/history`));}}
  else if(route.page==='videos'||route.page==='overview'||route.page==='analysis'&&route.tab==='videos')covers.push(...videos.slice(0,9).map((v:any)=>decode(coverSrc(v,route.page==='analysis'?'preview':'card'))));
  await Promise.allSettled(jobs);await bounded(Promise.allSettled(covers),signal,100);
 };
 await bounded(work(),signal,2000);
}
export async function transitionPage(update:()=>void,route?:StudioRoute,restore?:()=>void,axis:'x'|'y'='y',selector?:string,direction:SlideDirection=1){
 const presented=cleanup&&!selector?capturePage(null,true):null;
 cancelPageTransition();const token=revision,controller=new AbortController();preparing=controller;
 if(route)void prefetch(route,controller.signal);
 if(controller.signal.aborted||token!==revision)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){presented?.remove();flushSync(update);restore?.();preparing=undefined;return;}
 const main=document.querySelector<HTMLElement>('.studio > .s-main')!;
 const old=presented??capturePage(selector?main.querySelector<HTMLElement>(selector):null);
 document.documentElement.dataset.transitionKind='page';
 document.documentElement.dataset.routePhase='preparing';

 const animations:Animation[]=[];
 flushSync(update);restore?.();
 const target=(selector?main.querySelector<HTMLElement>(selector):main)??main;
 target.style.zIndex='21';target.style.willChange='transform,opacity';
 cleanup=()=>{for(const a of animations)a.cancel();old?.remove();releaseSwap(target);target.style.removeProperty('opacity');target.style.removeProperty('transform');target.style.removeProperty('will-change');target.style.removeProperty('z-index')};
 if(controller.signal.aborted||token!==revision)return;
 document.documentElement.dataset.routePhase='animating';
 // No network, decode timer, or extra frame is awaited on the click path.
 flushSync(()=>document.dispatchEvent(new Event('up:route-motion')));
 animations.push(...animateSwap(target,old,axis,direction));
 await Promise.allSettled(animations.map(a=>a.finished));
 if(token===revision){cleanup?.();cleanup=undefined;preparing=undefined;delete document.documentElement.dataset.transitionKind;delete document.documentElement.dataset.routePhase;document.dispatchEvent(new Event('up:route-settled'));}
}

export function warmRoute(page:string){void prefetch({page,video:null,ids:[]},new AbortController().signal)}
