import {flushSync} from 'react-dom';
import {chartFont,loadFonts} from '../fonts';
let revision=0;
let active:ViewTransition|undefined;
export function cancelPageTransition(){revision++;active?.skipTransition();active=undefined;}
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export async function preparePage(){
 await wait(0);
 const start=performance.now();
 while(document.querySelector('.s-page .s-loading,.s-page [data-page-pending=true]')&&performance.now()-start<1800)await wait(20);
 await loadFonts(chartFont).catch(()=>{});
 const visible=[...document.querySelectorAll<HTMLImageElement>('.s-page img')].filter(img=>{const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.width>0});
 visible.forEach(img=>{img.loading='eager'});
 await Promise.race([Promise.all(visible.map(img=>img.decode().catch(()=>{}))),wait(1200)]);
 document.dispatchEvent(new Event('up:prepare-view'));
 await wait(20);
}
export function transitionPage(update:()=>void){
 const token=++revision;active?.skipTransition();
 if(!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){flushSync(update);return;}
 document.documentElement.dataset.transitionKind='page';
 active=document.startViewTransition(async()=>{if(token!==revision)return;flushSync(update);await preparePage()});
 active.finished.catch(()=>{}).finally(()=>{if(token===revision){if(document.documentElement.dataset.transitionKind==='page')delete document.documentElement.dataset.transitionKind;active=undefined}});
}
