export type SlideDirection = 1 | -1;
export const exitDuration = 80;
export const enterDuration = 500;

// Keep the outgoing content opaque until an atomic handoff. Fading both
// layers to zero at that boundary exposes an empty page for a visible frame.
export function animateSwap(target:HTMLElement,old:HTMLElement|null,axis:'x'|'y',direction:SlideDirection){
 const duration=(old?exitDuration:0)+enterDuration,boundary=old?exitDuration/duration:0;
 const from=axis==='x'?`translateX(${18*direction}px)`:`translateY(${12*direction}px)`;
 const to=axis==='x'?`translateX(${-10*direction}px)`:`translateY(${-8*direction}px)`;
 const timing={duration,fill:'both' as const,easing:'linear'};
 const enter=target.animate([
  {opacity:old?0:1,transform:from,offset:0,easing:'steps(1,end)'},
  {opacity:1,transform:from,offset:boundary,easing:'cubic-bezier(.22,1,.36,1)'},
  {opacity:1,transform:'translate(0,0)',offset:1},
 ],timing);
 const animations=[enter];
 if(old)animations.push(old.animate([
  {opacity:1,offset:0,easing:'steps(1,end)'},
  {opacity:0,offset:boundary},
  {opacity:0,offset:1},
 ],timing));
 if(old)animations.push(old.animate([{transform:'translate(0,0)'},{transform:to}],{duration:exitDuration,fill:'forwards',easing:'cubic-bezier(.4,0,.7,1)'}));
 const start=document.timeline.currentTime;for(const animation of animations)animation.startTime=start;
 return animations;
}

export function orderedDirection(previous:number,next:number):SlideDirection{return next<previous?-1:1;}
