import {useSyncExternalStore} from 'react';
export type LabSettings={motion:'push'|'parallax'|'shared'|'cover'|'reveal'|'stack';duration:number;curve:[number,number,number,number];timing:'spring'|'bezier';damping:number;glass:'reading'|'clear'|'open-source';chat:'open'|'reading'|'top';themeGap:number};
export const LAB_DEFAULTS:LabSettings={motion:'push',duration:480,curve:[.32,.12,.4,1],timing:'spring',damping:1,glass:'reading',chat:'open',themeGap:6};
export const MOTION_PRESETS=[
 {value:'push',label:'连续推移',description:'新旧页面沿同一条轴线移动，保持空间连续。'},
 {value:'parallax',label:'导航视差',description:'前景页面滑入，背景页面以四分之一速度退后。'},
 {value:'cover',label:'前景覆盖',description:'新页面从边缘滑入，原页面留在背景。'},
 {value:'reveal',label:'滑出揭示',description:'原页面滑出，露出已经就位的新页面。'},
 {value:'stack',label:'层叠推进',description:'原页面轻微退远，新页面滑到前景。'},
 {value:'shared',label:'轻移过渡',description:'短距离位移与淡化，适合图表等密集内容。'},
] as const;
// Apple documents these spring families, not universal UIKit timing constants.
// Damping ratios below are our web adaptation, separately editable from duration.
export const TIMING_PRESETS=[
 {label:'Smooth · 平稳',timing:'spring',damping:1,duration:480,curve:[.32,.12,.4,1]},
 {label:'Snappy · 轻弹',timing:'spring',damping:.84,duration:440,curve:[.32,.12,.4,1]},
 {label:'Bouncy · 弹性',timing:'spring',damping:.68,duration:540,curve:[.32,.12,.4,1]},
 {label:'舒缓弹簧',timing:'spring',damping:1,duration:620,curve:[.32,.12,.4,1]},
 {label:'均衡滑动',timing:'bezier',damping:1,duration:460,curve:[.36,.08,.36,1]},
 {label:'柔和起停',timing:'bezier',damping:1,duration:520,curve:[.42,0,.58,1]},
 {label:'迅速响应',timing:'bezier',damping:1,duration:400,curve:[.2,.2,.4,1]},
 {label:'匀速对照',timing:'bezier',damping:1,duration:480,curve:[0,0,1,1]},
] as const;
const key='up-studio-design-lab-v1';
export function normalizeLab(value:any):LabSettings{
 const clamp=(v:any,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
 return {motion:MOTION_PRESETS.some(p=>p.value===value?.motion)?value.motion:LAB_DEFAULTS.motion,duration:clamp(value?.duration,180,1000,480),timing:value?.timing==='bezier'?'bezier':'spring',damping:clamp(value?.damping,.6,1,1),curve:Array.isArray(value?.curve)&&value.curve.length===4?value.curve.map((v:any,i:number)=>clamp(v,0,1,LAB_DEFAULTS.curve[i])) as LabSettings['curve']:[...LAB_DEFAULTS.curve],glass:['reading','clear','open-source'].includes(value?.glass)?value.glass:LAB_DEFAULTS.glass,chat:['open','reading','top'].includes(value?.chat)?value.chat:LAB_DEFAULTS.chat,themeGap:clamp(value?.themeGap,0,20,6)};
}
let current:LabSettings;try{current=normalizeLab(JSON.parse(localStorage.getItem(key)||'null'))}catch{current=normalizeLab(null)}
const listeners=new Set<()=>void>();
export const getLabSettings=()=>current;
export function setLabSettings(change:Partial<LabSettings>){current=normalizeLab({...current,...change});try{localStorage.setItem(key,JSON.stringify(current))}catch{}listeners.forEach(fn=>fn());}
export function useLabSettings(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn)}},getLabSettings,()=>LAB_DEFAULTS)}
export function applyLabSettings(settings:LabSettings){const el=document.documentElement;el.dataset.labGlass=settings.glass;el.dataset.labChat=settings.chat;el.style.setProperty('--theme-option-gap',settings.themeGap+'px');}
