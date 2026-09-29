import {capturePage} from './page-snapshot';
import {cancelPageTransition} from './page-transition';
import {restoreScroll} from './scroll-position';
import type {StudioRoute} from './route';
export function backGestureCompletes(distance:number,width:number,velocity:number){return distance>width*.3||distance>36&&velocity>.45}
/** Own only an edge-origin gesture. The Dock stays outside both moving planes. */
export function installBackGesture(options:{read:()=>StudioRoute;preview:(route:StudioRoute)=>void;parentScroll:(route:StudioRoute)=>number;commit:(route:StudioRoute)=>void}){
 let touch:{x:number;y:number;lastX:number;time:number;velocity:number;distance:number;route:StudioRoute;scroll:number;vertical:boolean}|null=null;
 let scene:{old:HTMLElement;main:HTMLElement;parent:StudioRoute;style:string|null}|null=null,animations:Animation[]=[],revision=0;
 const clear=()=>{revision++;animations.forEach(a=>a.cancel());animations=[];if(scene){scene.old.remove();if(scene.style===null)scene.main.removeAttribute('style');else scene.main.setAttribute('style',scene.style);scene=null}delete document.documentElement.dataset.backGesture;document.dispatchEvent(new Event('up:route-settled'))};
 const cancel=()=>{if(scene&&touch){options.preview(touch.route);restoreScroll(touch.scroll)}clear();touch=null};
 const start=(e:TouchEvent)=>{
  if(e.touches.length!==1){cancel();return}if(!matchMedia('(pointer:coarse)').matches||!matchMedia('(max-width:699px), (orientation:portrait)').matches)return;
  const t=e.touches[0];if(t.clientX>24&&t.clientX<innerWidth-24)return;
  if((e.target as Element)?.closest('.s-mobile-dock')){if(e.cancelable)e.preventDefault();return}if((e.target as Element)?.closest('dialog,.ui-popover,input,textarea,select'))return;
  if(e.cancelable)e.preventDefault();cancel();cancelPageTransition();
  const route=options.read();touch={x:t.clientX,y:t.clientY,lastX:t.clientX,time:performance.now(),velocity:0,distance:0,route,scroll:scrollY,vertical:false};
 };
 const move=(e:TouchEvent)=>{
  if(!touch||e.touches.length!==1)return;if(e.cancelable)e.preventDefault();const t=e.touches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y,now=performance.now();
  touch.velocity=(t.clientX-touch.lastX)/Math.max(1,now-touch.time);touch.lastX=t.clientX;touch.time=now;
  if(!scene&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8)touch.vertical=true;
  if(touch.vertical){restoreScroll(Math.max(0,touch.scroll-dy));return}
  if(!touch.route.video||touch.x>24||dx<8&&!scene)return;
  if(!scene){const old=capturePage();if(!old)return;const parent={page:touch.route.page,video:null,ids:[]};document.documentElement.dataset.backGesture='true';options.preview(parent);restoreScroll(options.parentScroll(parent));const main=document.querySelector<HTMLElement>('.studio>.s-main')!;scene={old,main,parent,style:main.getAttribute('style')};old.style.zIndex='23';old.style.backgroundColor=getComputedStyle(document.documentElement).getPropertyValue('--bg');main.style.willChange='transform';document.documentElement.dataset.backGesture='true';document.dispatchEvent(new Event('up:route-motion'));}
  touch.distance=Math.max(0,Math.min(innerWidth,dx));scene.old.style.transform=`translateX(${touch.distance}px)`;scene.main.style.transform=`translateX(${(touch.distance-innerWidth)*.22}px)`;
 };
 const end=async()=>{
  if(!touch||!scene){touch=null;return}const current=touch,active=scene,complete=backGestureCompletes(current.distance,innerWidth,performance.now()-current.time<100?current.velocity:0),token=revision;
  const duration=matchMedia('(prefers-reduced-motion:reduce)').matches?0:220;
  animations=[active.old.animate({transform:[active.old.style.transform,`translateX(${complete?innerWidth:0}px)`]},{duration,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'}),active.main.animate({transform:[active.main.style.transform,`translateX(${complete?0:-innerWidth*.22}px)`]},{duration,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'})];
  await Promise.allSettled(animations.map(a=>a.finished));if(token!==revision)return;
  if(complete)options.commit(active.parent);else{options.preview(current.route);restoreScroll(current.scroll)}clear();touch=null;
 };
 document.addEventListener('touchstart',start,{passive:false});document.addEventListener('touchmove',move,{passive:false});document.addEventListener('touchend',end);document.addEventListener('touchcancel',cancel);window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);
 return {cancel,dispose:()=>{cancel();document.removeEventListener('touchstart',start);document.removeEventListener('touchmove',move);document.removeEventListener('touchend',end);document.removeEventListener('touchcancel',cancel);window.removeEventListener('resize',cancel);window.removeEventListener('pagehide',cancel)}};
}
