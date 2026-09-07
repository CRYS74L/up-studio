import type {Video} from '../types';
import {Chart} from '../components/Chart';
import {chartBase} from './charts';
import {percent,compact} from '../format';
import {Stat} from './ui';
export const ageLabels:Record<string,string>={age_one:'＜16岁',age_two:'16–25岁',age_three:'25–40岁',age_four:'＞40岁'};
const deviceLabels:Record<string,string>={new_mobile:'移动端',new_pc:'PC',new_ott:'TV',new_h5:'H5',new_others:'其他',android:'Android',ios:'iOS',h5:'H5',pc:'PC',tv:'TV',other:'其他',out:'站外'};
const colors=['#65D9EB','#B3A0FF','#FF82B2','#EDCD9C','#A5DF94'];
function Donut({title,data,labels}:{title:string;data:Record<string,unknown>;labels:Record<string,string>}){
 const rows=Object.entries(data).filter((e):e is[string,number]=>typeof e[1]==='number'&&e[1]>0),total=rows.reduce((a,[,v])=>a+v,0),base=chartBase();
 const option={...base,tooltip:{...base.tooltip,trigger:'item',formatter:(p:any)=>`${labels[p.name]??p.name}：${percent(p.percent)}`},series:[{type:'pie',radius:['62%','80%'],center:['50%','50%'],label:{show:false},itemStyle:{borderRadius:4},data:rows.map(([name,value],i)=>({name,value,itemStyle:{color:colors[i%colors.length]}}))}]};
 return <section className="s-panel"><h3>{title}</h3>{total?<div className="s-audience-donut"><Chart className="s-device-chart" option={option}/><div>{rows.map(([key,value],i)=><div className="s-data-row" key={key}><span><i style={{background:colors[i%colors.length]}}/>{labels[key]??key}</span><strong>{percent(value/total*100)}</strong></div>)}</div></div>:<p className="s-note">本轮暂无有效数据</p>}</section>;
}
export function VideoAudience({video}:{video:Video}){
 const dims=video.dimensions??{},ages=Object.entries(dims.viewerAge??{}) as Array<[string,number]>,ageTotal=ages.reduce((a,[,v])=>a+(typeof v==='number'?v:0),0);
 const interests=(dims.viewerInterests??dims.overview?.viewer_ty??[]).slice().sort((a:any,b:any)=>b.count-a.count);
 const regions=(dims.viewerArea??[]).slice().sort((a:any,b:any)=>b.count-a.count),regionTotal=regions.reduce((a:number,r:any)=>a+(typeof r.count==='number'?r.count:0),0);
 return <div className="s-two-col"><Donut title="播放量来源" data={dims.playbackTerminalSources??dims.playProportion??{}} labels={deviceLabels}/><Donut title="性别分布" data={dims.viewerGender??{}} labels={{male:'男性',female:'女性',unknown:'未知'}}/>
 <section className="s-panel"><h3>年龄分布</h3>{ages.map(([key,value],i)=><div className="s-breakdown-row" key={key}><span>{ageLabels[key]??key}</span><div className="s-meter"><i style={{width:ageTotal?`${value/ageTotal*100}%`:'0%',background:colors[i%colors.length]}}/></div><b>{ageTotal?percent(value/ageTotal*100):'—'}</b></div>)}<p className="s-note">年龄区间与创作中心图形标签一致。</p><div className="s-inline-stats"><Stat label="粉丝观看率" value={percent(video.metrics.fanAudiencePercent)}/><Stat label="游客观看率" value={percent(video.metrics.guestAudiencePercent)}/></div></section>
 <section className="s-panel"><h3>兴趣分布</h3>{interests.length?<><div className="s-interest-cloud">{interests.slice(0,12).map((r:any,i:number)=><span key={r.tag_name} style={{fontSize:Math.max(13,22-i*.7)}}>{r.tag_name}</span>)}</div><details><summary>全部兴趣标签（{interests.length}）</summary>{interests.map((r:any)=><div className="s-data-row" key={r.tag_name}><span>{r.tag_name}</span><b>{compact(r.count)}</b></div>)}</details></>:<p className="s-note">本轮未返回兴趣分布，下一次同步后更新。</p>}<p className="s-note">数值保留创作中心的兴趣权重，不当作观众人数。</p></section>
 <section className="s-panel s-span"><h3>地域分布</h3><div className="s-regions">{regions.map((r:any,i:number)=><div className="s-region-item" key={r.location}><span>{r.location}</span><div className="s-meter"><i style={{width:regionTotal?`${r.count/regionTotal*100}%`:'0%',background:colors[i%colors.length]}}/></div><b>{regionTotal?percent(r.count/regionTotal*100):'—'}</b></div>)}</div>{!regions.length&&<p className="s-note">暂未返回地区数据。</p>}</section></div>;
}
