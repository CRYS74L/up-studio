import {snapshotMotionLayer} from './page-snapshot';
import {getLabSettings} from './lab-settings';
import {springSamples} from './spring-motion';
export type SlideDirection=1|-1;
const cleanup=new WeakMap<HTMLElement,()=>void>();
export function releaseSwap(target:HTMLElement){cleanup.get(target)?.();cleanup.delete(target)}
export function animateSwap(target:HTMLElement,old:HTMLElement|null,axis:'x'|'y',direction:SlideDirection){
 releaseSwap(target);
 const settings=getLabSettings(),rect=target.getBoundingClientRect(),vertical=axis==='y',page=target.matches('.s-main'),pane=target.matches('.s-analysis-topic-body');
 const viewportSlide=page||old?.dataset.viewportSlide==='true';
 const mobilePage=page&&!vertical&&matchMedia('(max-width:699px), (orientation:portrait)').matches;
 const distance=settings.motion==='shared'?36:vertical?(page?innerHeight:Math.min(innerHeight,Math.max(1,rect.height))):Math.max(1,rect.width);
 const verticalBleed=Math.max(innerHeight,rect.height)+distance;
 const move=(n:number)=>vertical?`translateY(${n}px)`:`translateX(${n}px)`;
 const original={backgroundColor:target.style.backgroundColor,clipPath:target.style.clipPath,willChange:target.style.willChange,boxShadow:target.style.boxShadow,zIndex:target.style.zIndex};
 target.style.willChange='transform,opacity';
 target.style.clipPath=mobilePage?'none':page&&vertical?`inset(${-rect.top}px 0 ${Math.max(0,rect.bottom-innerHeight)}px 0)` :page||pane?`inset(${-verticalBleed}px 0 ${-verticalBleed}px 0)`:`inset(${Math.max(0,-rect.top)}px 0 ${Math.max(0,rect.bottom-innerHeight)}px 0)`;
 const computed=getComputedStyle(target),ownBackground=computed.backgroundColor;const surface=ownBackground&&ownBackground!=='rgba(0, 0, 0, 0)'&&ownBackground!=='transparent'?ownBackground:computed.getPropertyValue(target.closest('.s-panel')?'--surface':'--bg').trim();
 if(settings.motion!=='shared'){target.style.backgroundColor=surface;}
 // The snapshot already owns the outgoing pane bounds; a taller destination
 // toolbar must not crop the old pane again.
 const outgoingLayer=old?(mobilePage?old:snapshotMotionLayer(old)):null;
 if(old){if(viewportSlide){outgoingLayer!.style.overflow='clip';outgoingLayer!.style.height=old.getBoundingClientRect().height+'px';}old.style.backgroundColor='transparent';outgoingLayer!.style.setProperty('background-color',surface,'important');outgoingLayer!.style.willChange='transform,opacity';if(settings.motion==='reveal'){old.style.zIndex='22';target.style.zIndex='21';}}
 const finish=()=>{Object.assign(target.style,original)};cleanup.set(target,finish);
 const timing={duration:mobilePage?400:settings.duration,easing:mobilePage?'cubic-bezier(.32,.08,.22,1)':settings.timing==='spring'?'linear':`cubic-bezier(${settings.curve.join(',')})`,fill:'both' as const};
 const samples=!mobilePage&&settings.timing==='spring'?springSamples(settings.damping):[{offset:0,progress:0},{offset:1,progress:1}];
  const incoming=samples.map(({offset,progress:p})=>{const displacement=settings.motion==='reveal'?0:direction*distance*(1-p);return {offset,transform:move(displacement),...(!vertical&&!mobilePage?{clipPath:`inset(${page||pane?-verticalBleed:Math.max(0,-rect.top)}px ${Math.max(0,displacement+(viewportSlide?rect.right-document.documentElement.clientWidth:0))}px ${page||pane?-verticalBleed:Math.max(0,rect.bottom-innerHeight)}px ${Math.max(0,-displacement-(viewportSlide?rect.left:0))}px)`}:{}),opacity:settings.motion==='shared'?Math.max(0,Math.min(1,p)):1}});
 const exitDistance=!vertical&&viewportSlide?Math.max(distance,old?.getBoundingClientRect().right??rect.right,document.documentElement.clientWidth):distance;
 const outgoing=samples.map(({offset,progress:p})=>({offset,transform:settings.motion==='stack'?`${move(-direction*distance*.12*p)} scale(${1-.035*p})`:move(-direction*exitDistance*p*(settings.motion==='cover'?0:settings.motion==='parallax'?.25:1)),opacity:settings.motion==='shared'?Math.max(0,1-p):1}));
 const animations=[target.animate(incoming,timing)];if(outgoingLayer)animations.push(outgoingLayer.animate(outgoing,timing));
 const start=document.timeline.currentTime;animations.forEach(a=>{a.startTime=start});
 void Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(cleanup.get(target)===finish){old?.remove();releaseSwap(target)}});
 return animations;
}
export function orderedDirection(previous:number,next:number):SlideDirection{return next<previous?-1:1;}
