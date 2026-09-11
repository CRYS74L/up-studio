import {flushSync} from 'react-dom';
import {cancelPageTransition} from './page-transition';
import {capturePage} from './page-snapshot';
import {animateSwap,type SlideDirection} from './transition-motion';
let cleanup:(()=>void)|undefined;
export function cancelContentMotion(){cleanup?.();cleanup=undefined;}
export function changeContent(update:()=>void,resolve:()=>HTMLElement|null,direction:SlideDirection=1){
 if(document.documentElement.dataset.transitionKind==='page')cancelPageTransition();
 cancelContentMotion();
 const previous=resolve(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // A main-page snapshot cannot represent content inside the native dialog layer.
 const old=previous&&!reduced&&!previous.closest('dialog')?capturePage(previous):null;
 if(previous)previous.querySelectorAll('[data-reorder]').forEach(e=>e.getAnimations().forEach(a=>a.cancel()));
 document.documentElement.dataset.contentSwitch='true';
 try{flushSync(update)}finally{delete document.documentElement.dataset.contentSwitch}
 const target=resolve();if(!target||reduced){old?.remove();return;}
 target.dataset.contentMotion='true';
 const animations=animateSwap(target,old,'x',direction);
 const finish=()=>{animations.forEach(a=>a.cancel());old?.remove();delete target.dataset.contentMotion};cleanup=finish;
 void Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(cleanup===finish){finish();cleanup=undefined;}});
}
