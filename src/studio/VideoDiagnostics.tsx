import {Select} from './Select';
import {useState} from 'react';
import type {Video} from '../types';
import {compact,percent,seconds} from '../format';
import {Chart} from '../components/Chart';
import {chartBase} from './charts';
import {Segments,Stat} from './ui';

export function VideoDiagnostics({video}:{video:Video}){
 const [audience,setAudience]=useState('游客'),[scope,setScope]=useState('全站');
 const d=video.dimensions?.playAnalyze??{},prefs=d.improve_idea??{},arc=d.arc_audience??{};
 const prefix=audience==='游客'?'viewer':'fans',suffix=scope==='全站'?'all':'main';
 const tags=String(prefs[`${prefix}_tags_${suffix}`]??'').split(',').filter(Boolean),weights=String(prefs[`${prefix}_tag_ratio_${suffix}`]??'').split(',');
 return <div className="s-two-col s-diagnostics"><section className="s-panel"><h3>游客播放与转粉</h3><div className="s-metric-details"><Stat label="游客播放" value={compact(video.metrics.guestAudienceCount)}/><Stat label="稿件涨粉" value={compact(video.followers_gained)}/><Stat label="播转粉率" value={percent(video.metrics.playToFollowRate)}/><Stat label="粉丝播放" value={compact(video.metrics.fanAudienceCount)}/><Stat label="粉丝观看率" value={typeof arc.play_fan_rate==='number'?percent(arc.play_fan_rate/100):'—'}/><Stat label="游客占比" value={typeof arc.play_viewer_rate==='number'?percent(arc.play_viewer_rate/100):'—'}/></div>{arc.tip&&<p className="s-source-insight">{arc.tip}</p>}</section><section className="s-panel"><div className="s-section-head"><h3>观众选题偏好</h3><Select aria-label="偏好范围" value={scope} onChange={e=>setScope(e.target.value)}><option>全站</option><option value="分区">{prefs.active_tid_name||'当前分区'}</option></Select></div><Segments label="选题偏好观众" motionTarget=".s-preference-tags" items={['游客','粉丝']} value={audience} onChange={setAudience}/><div className="s-preference-tags">{tags.map((tag,i)=><div className="s-data-row" key={tag}><span>{tag}</span><b>{Number.isFinite(Number(weights[i]))?compact(Number(weights[i])):'—'}</b></div>)}</div></section></div>;
}

export function VideoEngagement({video}:{video:Video}){
 const retention=video.dimensions?.retention??{},base=chartBase();
 const rawDm=Array.isArray(retention.dm)?retention.dm:[],rawPeer=Array.isArray(retention.peerDm)?retention.peerDm:[];
 const dm=rawDm.length?[{duration_key:0,num:0},...rawDm]:[],peer=rawPeer.length?dm.map((p:any,i:number)=>({duration_key:p.duration_key,num:i===0?0:Math.max(0,rawPeer[i-1]?.num??0)})):[],items=retention.danmuInfo?.list??[];
 const option={...base,legend:{top:0,textStyle:base.textStyle},grid:{left:50,right:25,top:50,bottom:45},xAxis:{...base.xAxis,type:'value',name:'s',min:0,max:video.duration_seconds},yAxis:{...base.yAxis,name:'弹幕数',min:0,minInterval:1,max:(v:any)=>Math.max(1,Math.ceil(v.max*1.15))},series:[{name:'你的作品',type:'line',smooth:false,showSymbol:false,data:dm.map((p:any)=>[p.duration_key,p.num]),itemStyle:{color:'#B3A0FF'}},{name:'同类作品',type:'line',smooth:false,showSymbol:false,data:peer.map((p:any)=>[p.duration_key,p.num<0?null:p.num]),itemStyle:{color:'#93CDD9'}}]};
 if(!dm.length&&!items.length)return null;
 return <div className="s-two-col s-diagnostics">{dm.length>0&&<section className="s-panel"><h3>弹幕高光时刻</h3><Chart className="s-large-chart" option={option}/></section>}<section className="s-panel"><h3>互动弹幕</h3><p className="s-source-insight">通过弹幕组件产生 {compact(retention.danmuInfo?.total)} 次互动</p>{items.map((item:any,i:number)=><div className="s-data-row" key={i}><span>{seconds(item.progress/1000)} · {item.title}</span><b>{compact(item.count)} 人{item.count>0&&typeof item.score==='number'?` · 均分 ${compact(item.score/item.count)}`:''}</b></div>)}</section></div>;
}
