import {useEffect,useRef,useState} from 'react';
import {animate} from 'motion/react';
import {useQuery} from '@tanstack/react-query';
import {request} from '../format';
import type {Video} from '../types';
export function RealtimePlays({video}:{video:Video}){
 const q=useQuery({queryKey:['video-realtime',video.id],queryFn:()=>request<{available:boolean;value:number;at:string}>(`/api/videos/${video.id}/realtime`),refetchInterval:10000});
 const value=q.data?.available?q.data.value:video.metrics.realtimePlay,previous=useRef(0),[shown,setShown]=useState(0);
 useEffect(()=>{if(typeof value!=='number')return;const a=animate(previous.current,value,{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.65,ease:[.25,.65,.3,1],onUpdate:v=>{previous.current=v;setShown(Math.round(v))}});return()=>a.stop()},[value]);
 return <section className="s-realtime-plays"><div><span>实时播放量</span><strong>{typeof value==='number'?shown.toLocaleString('zh-CN'):'—'}</strong></div></section>;
}
