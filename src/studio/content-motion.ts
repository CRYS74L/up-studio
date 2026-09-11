import {flushSync} from 'react-dom';
import {cancelPageTransition} from './page-transition';
const active=new WeakMap<HTMLElement,Animation>();
export function changeContent(update:()=>void,resolve:()=>HTMLElement|null){
 if(document.documentElement.dataset.transitionKind==='page')cancelPageTransition();
 const previous=resolve();if(previous){active.get(previous)?.cancel();previous.querySelectorAll('[data-reorder]').forEach(e=>e.getAnimations().forEach(a=>a.cancel()))}
 document.documentElement.dataset.contentSwitch='true';
 try{flushSync(update)}finally{delete document.documentElement.dataset.contentSwitch}
 const target=resolve();if(!target||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 target.dataset.contentMotion='true';
 const animation=target.animate([{opacity:.6,transform:'translateX(18px)'},{opacity:1,transform:'translateX(0)'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});
 active.set(target,animation);animation.finished.catch(()=>{}).finally(()=>{if(active.get(target)===animation){active.delete(target);delete target.dataset.contentMotion}});
}
