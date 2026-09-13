import {snapshotMotionLayer} from './page-snapshot';
import {getLabSettings} from './lab-settings';
import {springSamples} from './spring-motion';
export type SlideDirection=1|-1;
const cleanup=new WeakMap<HTMLElement,()=>void>();
export function releaseSwap(target:HTMLElement){cleanup.get(target)?.();cleanup.delete(target)}
export function animateSwap(target:HTMLElement,old:HTMLElement|null,axis:'x'|'y',direction:SlideDirection){
 releaseSwap(target);
 const settings=getLabSettings(),rect=target.getBoundingClientRect(),vertical=axis==='y',page=target.matches('.s-main'),pane=target.matches('.s-analysis-topic-body');
 const distance=settings.motion==='shared'?36:vertical?(page?innerHeight:Math.min(innerHeight,Math.max(1,rect.height))):Math.max(1,rect.width);
 const move=(n:number)=>vertical?`translateY(${n}px)`:`translateX(${n}px)`;
 const original={backgroundColor:target.style.backgroundColor,clipPath:target.style.clipPath,willChange:target.style.willChange,boxShadow:target.style.boxShadow,zIndex:target.style.zIndex};
 target.style.willChange='transform,opacity';
 target.style.clipPath=page||pane?`inset(${page?-rect.top:Math.max(0,-rect.top)}px 0 calc(100% - ${innerHeight-rect.top}px) 0)`:`inset(${Math.max(0,-rect.top)}px 0 ${Math.max(0,rect.bottom-innerHeight)}px 0)`;
 const computed=getComputedStyle(target),ownBackground=computed.backgroundColor;const surface=ownBackground&&ownBackground!=='rgba(0, 0, 0, 0)'&&ownBackground!=='transparent'?ownBackground:computed.getPropertyValue(target.closest('.s-panel')?'--surface':'--bg').trim();
 if(settings.motion!=='shared'){target.style.backgroundColor=surface;if(page||pane)target.style.boxShadow='0 0 0 '+Math.max(innerWidth,innerHeight)+'px '+surface;}
 const outgoingLayer=old?snapshotMotionLayer(old):null;
 if(old){if(pane)old.style.clipPath='inset('+Math.max(0,rect.top-old.getBoundingClientRect().top)+ 'px 0 0 0)';old.style.backgroundColor='transparent';outgoingLayer!.style.setProperty('background-color',surface,'important');outgoingLayer!.style.willChange='transform,opacity';if(settings.motion==='reveal'){old.style.zIndex='22';target.style.zIndex='21';}}
 const finish=()=>{Object.assign(target.style,original)};cleanup.set(target,finish);
 const timing={duration:settings.duration,easing:settings.timing==='spring'?'linear':`cubic-bezier(${settings.curve.join(',')})`,fill:'both' as const};
 const samples=settings.timing==='spring'?springSamples(settings.damping):[{offset:0,progress:0},{offset:1,progress:1}];
  const incoming=samples.map(({offset,progress:p})=>{const displacement=settings.motion==='reveal'?0:direction*distance*(1-p);return {offset,transform:move(displacement),...(!vertical?{clipPath:`inset(${page?-rect.top:Math.max(0,-rect.top)}px ${Math.max(0,displacement)}px calc(100% - ${innerHeight-rect.top}px) ${Math.max(0,-displacement)}px)`}:{}),opacity:settings.motion==='shared'?Math.max(0,Math.min(1,p)):1}});
 const outgoing=samples.map(({offset,progress:p})=>({offset,transform:settings.motion==='stack'?`${move(-direction*distance*.12*p)} scale(${1-.035*p})`:move(-direction*distance*p*(settings.motion==='cover'?0:settings.motion==='parallax'?.25:1)),opacity:settings.motion==='shared'?Math.max(0,1-p):1}));
 const animations=[target.animate(incoming,timing)];if(outgoingLayer)animations.push(outgoingLayer.animate(outgoing,timing));
 const start=document.timeline.currentTime;animations.forEach(a=>{a.startTime=start});
 void Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(cleanup.get(target)===finish)releaseSwap(target)});
 return animations;
}
export function orderedDirection(previous:number,next:number):SlideDirection{return next<previous?-1:1;}
