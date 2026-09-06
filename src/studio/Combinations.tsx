import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Chart} from '../components/Chart';
import type {Video} from '../types';
import {request,escapeHtml,compact} from '../format';
import {chartBase} from './charts';
import {metrics,metricById,formatMetric,valueOf,type MetricId} from './model';
import {Empty,Segments} from './ui';

export type Layer={id:MetricId;visual:'bar'|'line'};
const presets=['粉丝量变化','播放量与涨粉量','播放量与互动量','平均播放时长与完播率','自定义叠加'];
export function chronological(videos:Video[]){return videos.slice().sort((a,b)=>a.published_at.localeCompare(b.published_at));}
export function wrapTitle(title:string){return title.match(/.{1,10}/gu)?.join('\n')??title;}
export function Combinations({videos}:{videos:Video[]}){
 const [preset,setPreset]=useState('播放量与涨粉量'),[lineMetric,setLineMetric]=useState<MetricId>('avg_watch_seconds'),[layers,setLayers]=useState<Layer[]>([{id:'views',visual:'bar'},{id:'followers_gained',visual:'line'}]),[days,setDays]=useState('近30天');
 const account=useQuery({queryKey:['account-history'],queryFn:()=>request<{points:Array<{day:string;followers:number|null;follows:number|null;unfollows:number|null}>}>('/api/account/history'),enabled:preset==='粉丝量变化',refetchInterval:60000});
 const ordered=chronological(videos),watch=preset==='平均播放时长与完播率';
 const current:Layer[]=watch?[{id:'avg_watch_percent',visual:'bar'},{id:lineMetric,visual:'line'}]:preset==='播放量与涨粉量'?[{id:'views',visual:'bar'},{id:'followers_gained',visual:'line'}]:preset==='播放量与互动量'?[{id:'views',visual:'bar'},{id:'interactions',visual:'line'}]:layers;
 const base=chartBase();const labelLines=Math.max(1,...ordered.map(v=>wrapTitle(v.title).split('\n').length));const chartHeight=380+labelLines*15;
 const axes=current.map((layer,i)=>({...base.yAxis,name:metricById[layer.id].label+' ('+metricById[layer.id].unit+')',position:i%2?'right':'left',offset:Math.floor(i/2)*54,splitLine:i?{show:false}:base.yAxis.splitLine,max:layer.id==='avg_watch_percent'?100:undefined,axisLabel:{fontSize:12,formatter:compact}}));
 const option={...base,legend:{top:0,data:current.map(l=>metricById[l.id].label),textStyle:base.textStyle},grid:{left:58+Math.max(0,Math.ceil(current.length/2)-1)*54,right:current.length>1?66+Math.max(0,Math.floor(current.length/2)-1)*54:25,top:70,bottom:labelLines*15+42},tooltip:{...base.tooltip,formatter:(ps:any[])=>{const v=ordered[ps[0]?.dataIndex];return v?`${escapeHtml(v.title)}<br/>${current.map(l=>`${metricById[l.id].label}：${formatMetric(valueOf(v,l.id),l.id)}`).join('<br/>')}`:'';}},xAxis:{...base.xAxis,type:'category',data:ordered.map(v=>v.title),axisLabel:{fontSize:12,interval:0,formatter:wrapTitle,lineHeight:15}},yAxis:axes,series:current.map((layer,i)=>({name:metricById[layer.id].label,type:layer.visual,yAxisIndex:i,data:ordered.map(v=>valueOf(v,layer.id)),showSymbol:ordered.length<=8,connectNulls:false,smooth:false,barMaxWidth:26,itemStyle:{color:metricById[layer.id].color,borderRadius:[5,5,5,5]},lineStyle:{color:metricById[layer.id].color,width:2.6}}))};
 const points=account.data?.points??[],last=points.at(-1)?.day;const count=days==='近7天'?7:days==='近30天'?30:days==='近90天'?90:Infinity;const shown=points.filter(p=>!last||!Number.isFinite(count)||Date.parse(p.day)>=Date.parse(last)-(count-1)*86400000);
 const accountOption={...base,legend:{top:0,data:['新增关注','取消关注'],textStyle:base.textStyle},grid:{left:55,right:25,top:55,bottom:45},xAxis:{...base.xAxis,type:'category',data:shown.map(p=>p.day)},yAxis:base.yAxis,series:[{name:'新增关注',type:'line',data:shown.map(p=>p.follows),showSymbol:false,lineStyle:{color:'#9E92FF',width:2.7},itemStyle:{color:'#9E92FF'}},{name:'取消关注',type:'line',data:shown.map(p=>p.unfollows),showSymbol:false,lineStyle:{color:'#FFB85C',width:2.7},itemStyle:{color:'#FFB85C'}}]};
 return <section className="s-combinations"><div className="s-combo-presets">{presets.map(p=><button key={p} aria-pressed={p===preset} onClick={()=>setPreset(p)}>{p}</button>)}</div>
  <div className="s-panel"><div className="s-section-head"><div><h2>{preset==='自定义叠加'?'自定义组合图':preset}</h2><p>{preset==='粉丝量变化'?'账号级逐日数据 · 新增和取消关注分别记录':'按投稿时间从旧到新 · 每个指标保留真实单位'}</p></div>{preset==='粉丝量变化'&&<select aria-label="粉丝趋势范围" value={days} onChange={e=>setDays(e.target.value)}>{['近7天','近30天','近90天','全部历史'].map(d=><option key={d}>{d}</option>)}</select>}</div>
  {watch&&<div className="s-watch-control"><span>折线指标</span><Segments label="观看图折线" items={['平均播放时长','3秒跳出率']} value={lineMetric==='avg_watch_seconds'?'平均播放时长':'3秒跳出率'} onChange={v=>setLineMetric(v==='平均播放时长'?'avg_watch_seconds':'threeSecondBounceRate')}/></div>}
  {preset==='自定义叠加'&&<div className="s-layer-editor">{layers.map((l,i)=><div key={i}><select aria-label={`图层${i+1}指标`} value={l.id} onChange={e=>setLayers(xs=>xs.map((v,j)=>j===i?{...v,id:e.target.value as MetricId}:v))}>{metrics.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select><select aria-label={`图层${i+1}图形`} value={l.visual} onChange={e=>setLayers(xs=>xs.map((v,j)=>j===i?{...v,visual:e.target.value as 'bar'|'line'}:v))}><option value="bar">柱状图</option><option value="line">折线图</option></select><button onClick={()=>setLayers(xs=>xs.filter((_,j)=>j!==i))}>移除</button></div>)}<button className="s-secondary" disabled={layers.length>=4} onClick={()=>setLayers(xs=>[...xs,{id:metrics.find(m=>!xs.some(l=>l.id===m.id))?.id??'views',visual:'line'}])}>添加图层</button></div>}
  {preset==='粉丝量变化'?(account.isPending?<p role="status">读取粉丝历史…</p>:shown.length?<Chart className="s-analysis-chart" option={accountOption}/>:<Empty title="暂无粉丝变化历史" body="同步后会保存可获取的历史日期，之后持续积累。"/>):ordered.length&&current.length?<div className="s-chart-scroll"><div style={{minWidth:Math.max(680,ordered.length*130),height:chartHeight}}><Chart className="s-combo-chart" option={option}/></div></div>:<Empty title="请选择稿件与指标" body="所选指标将在同一张图中叠加。"/>}
  {watch&&<p className="s-note">柱状表示平均播放百分比，不等同于完整看完的观众比例。折线使用独立坐标轴。</p>}
  {preset!=='粉丝量变化'&&<p className="s-note">完整投稿名称在各柱下方换行显示；稿件多时可横向滚动图表。</p>}
  </div>
 </section>;
}
