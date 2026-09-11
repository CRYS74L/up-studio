import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {Video} from '../types';
import {request,percent,watchTime,seconds,escapeHtml} from '../format';
import {spaceNumbers} from '../typography/spacing';
import {frameAt,type FrameIndex} from '../../shared/video-frames';
import {retentionSeries,lossSeries} from './retention-model';
import {Chart} from '../components/Chart';
import {chartBase} from './charts';
import {Segments,Stat,Empty} from './ui';
export function VideoRetention({video}:{video:Video}){
 const [mode,setMode]=useState('流失趋势'),raw=video.dimensions?.retention,series=retentionSeries(raw);
 const frames=useQuery({queryKey:['video-frames',video.id],queryFn:()=>request<FrameIndex&{available:boolean}>(`/api/videos/${video.id}/frames`),staleTime:3600000});
 const own=mode==='流失趋势'?lossSeries(series.own):series.own,peer=mode==='流失趋势'?lossSeries(series.peer):series.peer;
 const base=chartBase(),colors=['#F67FAB','#9DA4B5'];
 const tooltip=(items:any[])=>{const i=items[0]?.dataIndex??0,t=own[i]?.duration_key??0,frame=frames.data?.available?frameAt(frames.data,t):null;
  const lines=items.map(item=>`${escapeHtml(item.seriesName)}：${percent(item.value)}`).join('<br/>');
  const scale=frame?192/frame.width:1;
  const image=frame?`<div class="s-retention-frame" style="width:192px;height:${frame.height*scale}px;background-image:url('${frame.image}');background-size:${frame.width*frame.columns*scale}px ${frame.height*frame.rows*scale}px;background-position:${-frame.x*scale}px ${-frame.y*scale}px"></div><small>画面 ${seconds(frame.time)}</small>`:`<small>${frames.isPending?'正在读取视频画面…':'本稿件暂未提供预览画面'}</small>`;
  return spaceNumbers(`<b>${seconds(t)}</b><br/>${lines}${image}`);
 };
 const option={...base,animationDuration:650,legend:{top:0,data:['你的作品','同类作品']},grid:{left:55,right:24,top:48,bottom:42},tooltip:{...base.tooltip,triggerOn:'mousemove|click',formatter:tooltip,confine:true},xAxis:{...base.xAxis,type:'category',data:own.map(p=>p.duration_key),axisLabel:{formatter:(t:number)=>seconds(Number(t)),fontSize:11}},yAxis:{...base.yAxis,min:0,...(mode==='留存分布'?{max:100}:{}),axisLabel:{formatter:(n:number)=>n+'%'}},series:[{name:'你的作品',type:mode==='流失趋势'?'bar':'line',data:own.map(p=>p.num/100),showSymbol:false,barMaxWidth:26,smooth:false,itemStyle:{color:colors[0],borderRadius:[4,4,0,0]},lineStyle:{color:colors[0],width:2.5}},{name:'同类作品',type:'line',data:peer.map(p=>p.num/100),showSymbol:false,smooth:false,lineStyle:{color:colors[1],type:'dashed',width:1.6},itemStyle:{color:colors[1]},areaStyle:{opacity:0}}]};
 return <section className="s-panel s-retention-panel"><div className="s-section-head"><h3>观众留存</h3><Segments label="留存展示" items={['流失趋势','留存分布']} value={mode} onChange={setMode} motionTarget=".s-chart-viewport"/></div><div className="s-retention-stats"><Stat label="平均播放百分比" value={percent(video.avg_watch_percent)}/><Stat label="平均播放时长" value={watchTime(raw?.durationInfo?.avg_play_time_int??video.avg_watch_seconds)}/></div>{own.length?<Chart className="s-retention-chart" option={option}/>:<Empty title="暂无留存数据" body="本稿件尚未返回有效的观众留存数据。"/>}</section>;
}
