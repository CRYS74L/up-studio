import {useEffect,useState,type ReactNode} from 'react';
import {Chart} from '../components/Chart';
import {echarts} from '../charts';
import {chartBase} from './charts';
import {compact,percent} from '../format';
export function AgeChart({ages}:{ages:Array<[string,number]>}){
 const labels:Record<string,string>={age_one:'＜16岁',age_two:'16–25岁',age_three:'25–40岁',age_four:'＞40岁'},total=ages.reduce((s,[,n])=>s+n,0),base=chartBase();
 const top=Math.max(...ages.map(([,n])=>n));
 return <Chart className="s-age-chart" option={{...base,grid:{left:45,right:15,top:30,bottom:45},xAxis:{...base.xAxis,type:'category',data:ages.map(([k])=>labels[k]??k),axisLabel:{interval:0,fontSize:12}},yAxis:{...base.yAxis,max:Math.min(100,Math.ceil(top/total*100/20)*20),axisLabel:{formatter:'{value}%'}},series:[{type:'bar',barMaxWidth:42,label:{show:true,position:'top',formatter:(p:any)=>percent(p.value)},data:ages.map(([,n])=>({value:total?n/total*100:null,itemStyle:{borderRadius:[5,5,0,0],color:n===top?{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'#FF82B2'},{offset:1,color:'#FF82B244'}]}:'#FF82B24D'}}))}]}}/>;
}
export function Distribution({title,rows,percentage=false,children}:{title:string;rows:Array<{name:string;value:number}>;percentage?:boolean;children:ReactNode}){
 const [page,setPage]=useState(0),pages=Math.ceil(rows.length/5),maximum=rows[0]?.value??1;const selected=Math.min(page,Math.max(0,pages-1));
 return <section className="s-panel s-span"><div className="s-section-head"><h3>{title}</h3><span className="s-muted">{rows[0]?.name??'暂无分布数据'}</span></div><div className="s-reference-distribution"><div>{children}</div><div><div className="s-rank-list">{rows.slice(selected*5,selected*5+5).map((r,i)=><div key={r.name}><p>{r.name} <b>{percentage?percent(r.value):compact(r.value)}</b></p><div className="s-meter"><i style={{width:`${maximum?r.value/maximum*100:0}%`,background:selected===0&&i===0?'var(--pink)':'var(--rank-muted)'}}/></div></div>)}</div>{pages>1&&<div className="s-page-dots" role="group" aria-label={title+'分页'}>{Array.from({length:pages},(_,i)=><button key={i} aria-label={`第${i+1}页`} aria-pressed={i===selected} onClick={()=>setPage(i)}/>)}</div>}</div></div></section>;
}
export function RegionMap({rows}:{rows:Array<{name:string;value:number}>}){
 const [geo,setGeo]=useState<any>(null),[failed,setFailed]=useState(false),base=chartBase();
 useEffect(()=>{let live=true;fetch('/maps/china.json').then(r=>r.json()).then(data=>{echarts.registerMap('creator-china',data);if(live)setGeo(data);}).catch(()=>{if(live)setFailed(true)});return()=>{live=false}},[]);
 if(!geo)return <p className="s-note">{failed?'地图暂时无法加载，右侧仍可查看地域数据':'加载地域地图…'}</p>;
 const norm=(s:string)=>s.replace(/省|市|特别行政区|自治区|壮族|回族|维吾尔|中国/g,'');
 return <Chart className="s-region-map" option={{...base,grid:undefined,xAxis:undefined,yAxis:undefined,tooltip:{...base.tooltip,trigger:'item',formatter:(p:any)=>`${p.name}：${Number.isFinite(p.value)?percent(p.value):'暂无数据'}`},series:[{type:'map',map:'creator-china',roam:false,label:{show:false},itemStyle:{areaColor:'#E8E9ED',borderColor:'#9397A1',borderWidth:.5},emphasis:{label:{show:false},itemStyle:{areaColor:'#FF82B2'}},data:geo.features.map((f:any)=>{const row=rows.find(r=>norm(r.name)===norm(f.properties.name));return {name:f.properties.name,value:row?.value,itemStyle:{areaColor:row?`rgba(255,130,178,${.12+.78*row.value/Math.max(1,rows[0]?.value??1)})`:undefined}}})}]}}/>;
}
export function InterestCloud({rows}:{rows:Array<{name:string;value:number}>}){
 const order=[3,2,4,0,7,5,1,6,8,9],colors=['var(--purple-text)','var(--pink-text)','var(--teal-text)','var(--text)'];
 return <div className="s-reference-cloud">{order.filter(i=>rows[i]).map((i,n)=><span key={rows[i].name} style={{fontSize:Math.max(15,Math.min(34,16+18*Math.sqrt(rows[i].value/(rows[0]?.value||1)))),fontWeight:i===0?700:450,color:colors[n%colors.length]}}>{rows[i].name}</span>)}</div>;
}
