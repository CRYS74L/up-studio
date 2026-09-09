import {cloudFont,loadFonts} from '../fonts';
import {useEffect,useState,useRef,cloneElement,isValidElement,type ReactNode} from 'react';
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
 const [page,setPage]=useState(0),[focus,setFocus]=useState<string|null>(null),pages=Math.ceil(rows.length/5),maximum=rows[0]?.value??1;const selected=Math.min(page,Math.max(0,pages-1));
 return <section className="s-panel s-span"><div className="s-section-head"><h3>{title}</h3><span className="s-muted">{rows[0]?.name??'暂无分布数据'}</span></div><div className="s-reference-distribution"><div>{isValidElement(children)&&children.type===RegionMap?cloneElement(children as any,{highlighted:rows.slice(selected*5,selected*5+5).map(r=>r.name),focus}):children}</div><div><div className="s-rank-list">{rows.slice(selected*5,selected*5+5).map((r,i)=><div key={r.name} onMouseEnter={()=>setFocus(r.name)} onMouseLeave={()=>setFocus(null)}><p>{r.name} <b>{percentage?percent(r.value):compact(r.value)}</b></p><div className="s-meter"><i style={{width:`${maximum?r.value/maximum*100:0}%`,background:selected===0&&i===0?'var(--pink)':'var(--rank-muted)'}}/></div></div>)}</div>{pages>1&&<div className="s-page-dots" role="group" aria-label={title+'分页'}>{Array.from({length:pages},(_,i)=><button key={i} aria-label={`第${i+1}页`} aria-pressed={i===selected} onClick={()=>setPage(i)}/>)}</div>}</div></div></section>;
}
export function RegionMap({rows,highlighted=[],focus}:{rows:Array<{name:string;value:number}>;highlighted?:string[];focus?:string|null}){
 const [geo,setGeo]=useState<any>(null),[failed,setFailed]=useState(false),base=chartBase();
 useEffect(()=>{let live=true;fetch('/maps/china.json').then(r=>r.json()).then(data=>{const clean=mainlandGeometry(data);echarts.registerMap('creator-china',clean);if(live)setGeo(clean);}).catch(()=>{if(live)setFailed(true)});return()=>{live=false}},[]);
 if(!geo)return <p role="status">{failed?'地图加载失败':'加载地图…'}</p>;
 const norm=(s:string)=>s.replace(/省|市|特别行政区|自治区|壮族|回族|维吾尔|中国/g,'');
 return <Chart className="s-region-map" option={{...base,grid:undefined,xAxis:undefined,yAxis:undefined,tooltip:{...base.tooltip,trigger:'item',formatter:(p:any)=>`${p.name}：${Number.isFinite(p.value)?percent(p.value):'暂无数据'}`},series:[{type:'map',map:'creator-china',roam:false,label:{show:false},itemStyle:{areaColor:document.documentElement.dataset.theme==='dark'?'#363638':'#EFEFF1',borderColor:'#9397A1',borderWidth:.5},emphasis:{label:{show:false},itemStyle:{areaColor:'#FF82B2'}},data:geo.features.map((f:any)=>{const row=rows.find(r=>norm(r.name)===norm(f.properties.name));return {name:f.properties.name,value:row?.value??(rows.length?0:undefined),itemStyle:{areaColor:row&&(focus?row.name===focus:highlighted.includes(row.name))?`rgba(255,130,178,${.28+.62*row.value/Math.max(1,rows[0]?.value??1)})`:undefined}}})}]}}/>;
}
export function InterestCloud({rows}:{rows:Array<{name:string;value:number}>}){
 const ref=useRef<HTMLDivElement>(null);const signature=JSON.stringify(rows.slice(0,10));
 useEffect(()=>{let live=true;const root=ref.current!;let draw:(()=>void)|undefined;
 Promise.all([import('wordcloud'),loadFonts(cloudFont)]).then(([{default:WordCloud}])=>{if(!live)return;draw=()=>{if(!live||!root.clientWidth)return;const ranked=JSON.parse(signature) as Array<{name:string;value:number}>,scale=Math.min(1,root.clientWidth/440);const dark=document.documentElement.dataset.theme==='dark';const colors=dark?['#83A1FF','#64DAB0','#FFD17B','#9AADCD','#FF9A90','#B49AFF','#85D9ED']:['#3E6EFF','#38CC94','#FFC246','#6C81B1','#FD7661','#9380EE','#67CBE3'];WordCloud(root,{list:ranked.map((r,i)=>[r.name,i===0?2.5:i<3?2:i<6?1.8:1.5]),weightFactor:18*scale,fontFamily:cloudFont,fontWeight:(word:string)=>ranked.findIndex(r=>r.name===word)<3?'bold':'normal',gridSize:Math.max(12,Math.round(27*scale)),rotateRatio:0,drawOutOfBound:false,shrinkToFit:true,backgroundColor:'transparent',color:(word:string)=>colors[ranked.findIndex(r=>r.name===word)]??(dark?'#F3F3F5':'#000000')});};draw();}).catch(()=>{if(live)root.textContent="词云字体加载失败，请刷新页面。";});
 const size=new ResizeObserver(()=>draw?.());size.observe(root);const theme=new MutationObserver(()=>draw?.());theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});return()=>{live=false;size.disconnect();theme.disconnect()};},[signature]);
 return <div ref={ref} className="s-reference-cloud" aria-label="兴趣权重词云"/>;
}

export function mainlandGeometry(data:any){
 const area=(ring:number[][])=>Math.abs(ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1]},0)/2);
 return {...data,features:data.features.filter((f:any)=>f.properties?.name&&['Polygon','MultiPolygon'].includes(f.geometry.type)).map((f:any)=>{const parts=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;const sorted=parts.slice().sort((a:any,b:any)=>area(b[0])-area(a[0]));const main=sorted.filter((p:any,i:number)=>i===0||(!['海南省','台湾省'].includes(f.properties.name)&&area(p[0])>Math.max(.08,area(sorted[0][0])*.02)));return {...f,geometry:{type:'MultiPolygon',coordinates:main}}})};
}
