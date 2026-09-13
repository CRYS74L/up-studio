import {useSyncExternalStore} from 'react';
export type LabSettings={motion:'push'|'parallax'|'shared';duration:number;curve:[number,number,number,number];glass:'reading'|'clear'|'open-source';chat:'open'|'reading'|'top';themeGap:number};
export const LAB_DEFAULTS:LabSettings={motion:'push',duration:380,curve:[.33,0,.67,1],glass:'reading',chat:'open',themeGap:6};
export const MOTION_PRESETS=[
 {value:'push',label:'连续推入',description:'新旧页面同速移动，像左右或上下翻页。',curve:[.33,0,.67,1],duration:380},
 {value:'parallax',label:'视差推入',description:'新页面滑入，旧页面较慢地退后。',curve:[.25,.1,.25,1],duration:360},
 {value:'shared',label:'共享轴',description:'参考 Material 共享轴，短距离移动并交叉淡化。',curve:[.4,0,.2,1],duration:320},
] as const;
const key='up-studio-design-lab-v1';
export function normalizeLab(value:any):LabSettings{
 const clamp=(v:any,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
 return {motion:['push','parallax','shared'].includes(value?.motion)?value.motion:LAB_DEFAULTS.motion,duration:clamp(value?.duration,180,1000,380),curve:Array.isArray(value?.curve)&&value.curve.length===4?value.curve.map((v:any,i:number)=>clamp(v,0,1,LAB_DEFAULTS.curve[i])) as LabSettings['curve']:[...LAB_DEFAULTS.curve],glass:['reading','clear','open-source'].includes(value?.glass)?value.glass:LAB_DEFAULTS.glass,chat:['open','reading','top'].includes(value?.chat)?value.chat:LAB_DEFAULTS.chat,themeGap:clamp(value?.themeGap,0,20,6)};
}
let current:LabSettings;try{current=normalizeLab(JSON.parse(localStorage.getItem(key)||'null'))}catch{current=normalizeLab(null)}
const listeners=new Set<()=>void>();
export const getLabSettings=()=>current;
export function setLabSettings(change:Partial<LabSettings>){current=normalizeLab({...current,...change});try{localStorage.setItem(key,JSON.stringify(current))}catch{}listeners.forEach(fn=>fn());}
export function useLabSettings(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn)}},getLabSettings,()=>LAB_DEFAULTS)}
export function applyLabSettings(settings:LabSettings){const el=document.documentElement;el.dataset.labGlass=settings.glass;el.dataset.labChat=settings.chat;el.style.setProperty('--theme-option-gap',settings.themeGap+'px');}
