import type {StudioRoute} from './route';
import {orderedDirection} from './transition-motion';
const pages=['overview','videos','analysis','sources'];
const page=(r:StudioRoute)=>r.page==='matrix'?'analysis':r.page;
const topic=(r:StudioRoute)=>r.tab==='ai'?2:r.tab==='videos'||r.page==='matrix'||r.ids.length?1:0;
export function navigationMotion(previous:StudioRoute,next:StudioRoute,mobile:boolean){
 const samePage=page(previous)===page(next);
 const direction=samePage&&page(next)==='analysis'?orderedDirection(topic(previous),topic(next)):
  samePage?next.video?1 as const:-1 as const:orderedDirection(pages.indexOf(page(previous)),pages.indexOf(page(next)));
 return {axis:samePage||mobile?'x' as const:'y' as const,direction};
}
