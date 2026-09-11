export type SlideDirection = 1 | -1;
export const exitDuration = 60;
export const enterDuration = 320;

// Both layers share one clock: the old content is gone at the exact point
// the new content starts moving. There is no overlapping text or awaited gap.
export function animateSwap(target:HTMLElement,old:HTMLElement|null,axis:'x'|'y',direction:SlideDirection){
 const duration=(old?exitDuration:0)+enterDuration,boundary=old?exitDuration/duration:0;
 const from=axis==='x'?`translateX(${18*direction}px)`:`translateY(${12*direction}px)`;
 const timing={duration,fill:'both' as const,easing:'linear'};
 const enter=target.animate([
  {opacity:0,transform:from,offset:0},
  {opacity:0,transform:from,offset:boundary,easing:'cubic-bezier(.22,1,.36,1)'},
  {opacity:1,transform:'translate(0,0)',offset:1},
 ],timing);
 const animations=[enter];
 if(old)animations.push(old.animate([
  {opacity:1,offset:0,easing:'cubic-bezier(.4,0,1,1)'},
  {opacity:0,offset:boundary},
  {opacity:0,offset:1},
 ],timing));
 const start=document.timeline.currentTime;for(const animation of animations)animation.startTime=start;
 return animations;
}

export function orderedDirection(previous:number,next:number):SlideDirection{return next<previous?-1:1;}
