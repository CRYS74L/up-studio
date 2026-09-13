import {useQuery} from '@tanstack/react-query';
import {request} from '../format';
import {useSyncExternalStore} from 'react';
import {ageLabel} from '../format';
let clock=Date.now(),timer:ReturnType<typeof setInterval>|undefined;const listeners=new Set<()=>void>();
const tick=()=>{clock=Date.now();listeners.forEach(fn=>fn())};
function subscribe(listener:()=>void){listeners.add(listener);if(!timer){clock=Date.now();timer=setInterval(tick,1000);document.addEventListener('visibilitychange',tick)}return()=>{listeners.delete(listener);if(!listeners.size){clearInterval(timer);timer=undefined;document.removeEventListener('visibilitychange',tick)}}}
export function FreshnessAge({capturedAt,fallback}:{capturedAt?:string|null;fallback?:number|null}){const now=useSyncExternalStore(subscribe,()=>clock,()=>clock),time=capturedAt?Date.parse(capturedAt):NaN;return <>{ageLabel(Number.isFinite(time)?Math.max(0,Math.floor((now-time)/60000)):fallback)}</>}

export function SyncFreshness(props:{capturedAt?:string|null;fallback?:number|null}){const q=useQuery({queryKey:['acquisition-history'],queryFn:()=>request<{runs:any[]}>('/api/acquisition/runs'),refetchInterval:5000});const run=q.data?.runs.find(r=>r.status==='success'||r.status==='partial');return <FreshnessAge {...props} capturedAt={run?.finished_at??run?.completed_at??run?.started_at??props.capturedAt}/>;}
