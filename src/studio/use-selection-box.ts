import {useLayoutEffect,useRef,useState,type RefObject} from 'react';
type Box={x:number;y:number;width:number;height:number};
/** Read geometry on resize; selecting another item only consults cached boxes. */
export function useSelectionBox(ref:RefObject<HTMLElement|null>,selector:string,key:string,parent?:string){
 const [box,setBox]=useState<Box|null>(null),cache=useRef(new Map<Element,Box>()),apply=useRef(()=>{});
 useLayoutEffect(()=>{const root=parent?ref.current?.closest<HTMLElement>(parent):ref.current;if(!root)return;let frame=0;
 const commit=(next:Box|undefined)=>{if(next)setBox(old=>old&&old.x===next.x&&old.y===next.y&&old.width===next.width&&old.height===next.height?old:next)};
 apply.current=()=>{const selected=root.querySelector(selector);if(selected)commit(cache.current.get(selected))};
 const measure=()=>{frame=0;const next=new Map<Element,Box>();root.querySelectorAll<HTMLElement>('button').forEach(b=>next.set(b,{x:b.offsetLeft,y:b.offsetTop,width:b.offsetWidth,height:b.offsetHeight}));cache.current=next;apply.current()};
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure)};const observer=new ResizeObserver(schedule);const observe=()=>{observer.observe(root);root.querySelectorAll('button').forEach(b=>observer.observe(b))};observe();measure();
 const mutation=new MutationObserver(()=>{observe();schedule()});mutation.observe(root,{childList:true});const sync=()=>apply.current();document.addEventListener('up:route-motion',sync);
 return()=>{observer.disconnect();mutation.disconnect();cancelAnimationFrame(frame);document.removeEventListener('up:route-motion',sync);apply.current=()=>{}};
 },[ref,selector,parent]);
 useLayoutEffect(()=>apply.current(),[key]);return box;
}
