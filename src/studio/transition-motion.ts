import {getLabSettings} from './lab-settings';
export type SlideDirection=1|-1;
const cleanup=new WeakMap<HTMLElement,()=>void>();
export function releaseSwap(target:HTMLElement){cleanup.get(target)?.();cleanup.delete(target)}
export function animateSwap(target:HTMLElement,old:HTMLElement|null,axis:'x'|'y',direction:SlideDirection){
 releaseSwap(target);
 const settings=getLabSettings(),rect=target.getBoundingClientRect(),vertical=axis==='y',page=target.matches('.s-main'),pane=target.matches('.s-analysis-topic-body');
 const distance=settings.motion==='shared'?36:vertical?(page?innerHeight:Math.min(innerHeight,Math.max(1,rect.height))):Math.max(1,rect.width);
 const move=(n:number)=>vertical?`translateY(${n}px)`:`translateX(${n}px)`;
 const original={backgroundColor:target.style.backgroundColor,clipPath:target.style.clipPath,willChange:target.style.willChange,boxShadow:target.style.boxShadow};
 target.style.willChange='transform,opacity';
 target.style.clipPath=page||pane?`inset(${page?-rect.top:Math.max(0,-rect.top)}px 0 calc(100% - ${innerHeight-rect.top}px) 0)`:`inset(${Math.max(0,-rect.top)}px 0 ${Math.max(0,rect.bottom-innerHeight)}px 0)`;
 const computed=getComputedStyle(target),ownBackground=computed.backgroundColor;const surface=ownBackground&&ownBackground!=='rgba(0, 0, 0, 0)'&&ownBackground!=='transparent'?ownBackground:computed.getPropertyValue(target.closest('.s-panel')?'--surface':'--bg').trim();
 if(settings.motion!=='shared'){target.style.backgroundColor=surface;if(page||pane)target.style.boxShadow="0 0 0 "+Math.max(innerWidth,innerHeight)+"px "+surface;}
 if(old){if(pane)old.style.clipPath="inset("+Math.max(0,rect.top-old.getBoundingClientRect().top)+"px 0 0 0)";old.style.backgroundColor=surface;old.style.willChange='transform,opacity';}
 const finish=()=>{Object.assign(target.style,original)};cleanup.set(target,finish);
 const timing={duration:settings.duration,easing:`cubic-bezier(${settings.curve.join(',')})`,fill:'both' as const};
 const animations=[target.animate([{transform:move(direction*distance),opacity:settings.motion==='shared'?0:1},{transform:move(0),opacity:1}],timing)];
 if(old)animations.push(old.animate([{transform:move(0),opacity:1},{transform:move(-direction*distance*(settings.motion==='parallax'?.25:1)),opacity:settings.motion==='shared'?0:1}],timing));
 const start=document.timeline.currentTime;animations.forEach(a=>{a.startTime=start});
 void Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(cleanup.get(target)===finish)releaseSwap(target)});
 return animations;
}
export function orderedDirection(previous:number,next:number):SlideDirection{return next<previous?-1:1;}
