import {useQuery} from '@tanstack/react-query';
import {request} from '../format';
import {useSyncExternalStore} from 'react';
import {ageLabel} from '../format';
let clock=Date.now(),timer:ReturnType<typeof setInterval>|undefined;const listeners=new Set<()=>void>();
const tick=()=>{clock=Date.now();listeners.forEach(fn=>fn())};
const visibility=()=>{if(document.hidden){clearInterval(timer);timer=undefined}else{tick();if(listeners.size&&!timer)timer=setInterval(tick,1000)}};
function subscribe(listener:()=>void){listeners.add(listener);if(!timer){clock=Date.now();if(!document.hidden)timer=setInterval(tick,1000);document.addEventListener('visibilitychange',visibility)}return()=>{listeners.delete(listener);if(!listeners.size){clearInterval(timer);timer=undefined;document.removeEventListener('visibilitychange',visibility)}}}
export function FreshnessAge({capturedAt,fallback}:{capturedAt?:string|null;fallback?:number|null}){const time=capturedAt?Date.parse(capturedAt):NaN;const snapshot=()=>ageLabel(Number.isFinite(time)?Math.max(0,Math.floor((clock-time)/60000)):fallback);const label=useSyncExternalStore(subscribe,snapshot,snapshot);return <>{label}</>}

export function SyncFreshness(props:{capturedAt?:string|null;fallback?:number|null}){const q=useQuery({queryKey:['acquisition-history',''],queryFn:()=>request<{runs:any[]}>('/api/acquisition/runs'),refetchInterval:5000});const run=q.data?.runs.find(r=>r.status==='success'||r.status==='partial');if(q.isPending&&!props.capturedAt&&props.fallback==null)return <>正在读取</>;return <FreshnessAge {...props} capturedAt={run?.finished_at??run?.completed_at??run?.started_at??props.capturedAt}/>;}
