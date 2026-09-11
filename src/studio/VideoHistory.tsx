import {Select} from './Select';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Chart} from '../components/Chart';
import type {Video} from '../types';
import {request,compact} from '../format';
import {chartBase} from './charts';
import {Segments,Empty} from './ui';
type Point={date_key:number;total_inc:number|null;sub_total_inc?:number|null};
export function VideoHistory({video}:{video:Video}){
 const [metric,setMetric]=useState<'play'|'fan'>('play'),[window,setWindow]=useState('近30天');
 const history=useQuery({queryKey:['video-history',video.id,video.captured_at],queryFn:()=>request<{series:Record<string,Record<string,Point[]>>}>(`/api/videos/${video.id}/history`)});
 const sourceKey=window==='发稿后48小时'?'first48h':window==='发稿后30天'?'first30d':window==='全部已记录'?'lifetime':'recent30';
 const fallback=video.dimensions?.trend?.[metric];
 const rows=history.data?.series?.[metric]?.[sourceKey]??(sourceKey==='first48h'?fallback?.hour_tendency:sourceKey==='first30d'?fallback?.tendency:sourceKey==='recent30'?fallback?.last_30_day_tendency:[])??[];
 const sorted=rows.slice().sort((a:Point,b:Point)=>a.date_key-b.date_key),base=chartBase();
 const plotted:Point[]=sorted.flatMap((p:Point,i:number)=>i>0&&p.date_key-sorted[i-1].date_key>(sourceKey==='first48h'?3600:86400)*1.5?[{date_key:sorted[i-1].date_key+(sourceKey==='first48h'?3600:86400),total_inc:null},p]:[p]);
 const labels=plotted.map((p:Point)=>{const d=new Date(p.date_key*1000+28800000);return d.toISOString().slice(0,sourceKey==='first48h'?16:10).replace('T',' ');});
 const option={...base,legend:{top:0,textStyle:base.textStyle},grid:{left:55,right:25,top:50,bottom:70},xAxis:{...base.xAxis,type:'category',data:labels,axisLabel:{fontSize:12,formatter:(s:string)=>s.slice(5,10)+(sourceKey==='first48h'?' '+s.slice(11):'')}},yAxis:base.yAxis,dataZoom:sorted.length>40?[{type:'inside'},{type:'slider',bottom:0,height:18,start:Math.max(0,100-30/sorted.length*100),end:100}]:[],series:[{name:metric==='play'?'新增播放':'新增关注',type:'line',data:plotted.map((p:Point)=>p.total_inc),showSymbol:sorted.length<10,connectNulls:false,smooth:false,itemStyle:{color:'#FF82B2'},lineStyle:{width:2.5,color:'#FF82B2'},areaStyle:{color:'#FF82B218'}}]};
 return <section className="s-panel s-video-history"><div className="s-section-head"><div><h3>{window}{metric==='play'?'播放趋势':'涨粉趋势'}</h3></div><Select aria-label="趋势数据" value={metric} onChange={e=>setMetric(e.target.value as 'play'|'fan')}><option value="play">播放量</option><option value="fan">涨粉量</option></Select></div><Segments label="稿件趋势窗口" motionTarget=".s-chart-viewport,.s-empty" items={['发稿后48小时','发稿后30天','近30天','全部已记录']} value={window} onChange={setWindow}/>{history.isPending&&!sorted.length?<p role="status">读取历史中…</p>:sorted.length?<Chart className="s-video-history-chart" option={option}/>:<Empty title="该窗口暂无已记录数据" body="会保留从创作中心获取过的有效日期；采集前已缺失的时段不能凭空恢复。"/>}</section>;
}
