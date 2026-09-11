import {Popover} from './controls';
import {useLayoutEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {AnimatePresence,motion} from 'motion/react';
import {date} from '../format';

const labels:Record<string,string>={views:'播放量',coverAttractionScore:'封标吸引力',avgWatchSeconds:'观看时长',avgWatchPercent:'观看进度',followersGained:'涨粉',likes:'点赞',comments:'评论',danmaku:'弹幕',favorites:'收藏',coins:'投币',shares:'分享',threeSecondBounceRate:'3秒跳出率',interactionRate:'互动率',playToFollowRate:'播转粉率',fanAudiencePercent:'粉丝观看率',guestAudiencePercent:'游客观看率'};
const names:Record<string,string>={success:'同步完成',partial:'部分完成',failed:'同步失败',running:'正在同步'};
export function SyncHistory({runs}:{runs:any[]}){
 const plot=useRef<HTMLDivElement>(null),[width,setWidth]=useState(668),[page,setPage]=useState(0),[selected,setSelected]=useState(''),[hover,setHover]=useState<{run:any;x:number}|null>(null);
 useLayoutEffect(()=>{const el=plot.current!;const observer=new ResizeObserver(()=>setWidth(el.clientWidth));setWidth(el.clientWidth);observer.observe(el);return()=>observer.disconnect()},[]);
 const count=Math.max(1,Math.floor((width+2.34)/7.34)),pages=Math.max(1,Math.ceil(runs.length/count)),current=Math.min(page,pages-1);
 const slice=runs.slice(current*count,(current+1)*count).reverse(),step=slice.length>1?Math.min(7.34,(width-5)/(slice.length-1)):7.34;
 const active=hover??(selected?{run:runs.find(r=>r.id===selected),x:Math.max(0,slice.findIndex(r=>r.id===selected))*step}:null);
 const activeId=active?.run?.id;
 return <div className="s-sync-history s-sync-grid-history"><div className="s-sync-summary"><b><span className={`s-run-dot ${runs[0]?.status}`}/>{names[runs[0]?.status]??'暂无同步'}</b><span>{runs.length} 次同步 · {Math.round(runs.filter(r=>r.status==='success').length/runs.length*100)}% 完成</span></div>
  <div className="s-sync-range"><span>{slice.length?date(slice[0].started_at)+' — '+date(slice.at(-1).started_at):'暂无记录'}</span>{pages>1&&<div><button className="s-icon" aria-label="更早的同步记录" disabled={current+1>=pages} onClick={()=>{setPage(current+1);setHover(null);setSelected('')}}><ChevronLeft/></button><button className="s-icon" aria-label="更新的同步记录" disabled={current===0} onClick={()=>{setPage(current-1);setHover(null);setSelected('')}}><ChevronRight/></button></div>}</div>
  <div className="s-sync-plot" ref={plot} onPointerLeave={()=>setHover(null)}><svg width="100%" height="16" viewBox={`0 0 ${width} 16`} role="group" aria-label="同步状态历史">{slice.map((run,i)=><rect key={run.id} role="button" tabIndex={0} data-status={run.status} data-active={run.id===activeId} aria-label={date(run.started_at)+' · '+(names[run.status]??run.status)} aria-pressed={run.id===selected} x={i*step} y={0} width={5} height={16} rx={1} ry={1} onPointerEnter={()=>setHover({run,x:i*step})} onFocus={()=>setHover({run,x:i*step})} onBlur={()=>setHover(null)} onClick={()=>setSelected(run.id===selected?'':run.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(run.id===selected?'':run.id)}}}/>)}</svg>
   <Popover open={!!active?.run} close={()=>{setSelected('');setHover(null)}} anchor={plot} anchorOffset={active?.x??0} role="tooltip" label="同步记录详情" width={active?.run?.status==='success'?280:360}>{active?.run&&<RunDetails run={active.run}/>}</Popover>


  </div>
  <div className="s-sync-key"><span><i data-status="success"/>完成</span><span><i data-status="partial"/>部分完成</span><span><i data-status="failed"/>失败</span></div>

 </div>;
}

const capabilityLabels:Record<string,string>={archive:'稿件列表',compare:'播放对比',overview:'稿件详情',diagnose:'单稿诊断',playTrend:'播放趋势',fanTrend:'涨粉趋势',realtime:'实时播放',archiveView:'视频元数据',retention:'留存曲线',terminalSources:'播放终端来源'};
function RunDetails({run}:{run:any}){
 const details=run.details??{},total=details.totalVideos;
 const missing=Object.entries(labels).flatMap(([key,label])=>typeof total==='number'&&total>0&&typeof details.metricCounts?.[key]==='number'&&details.metricCounts[key]<total?[{label,count:total-details.metricCounts[key]}]:[]);
 const failed=Object.entries(capabilityLabels).flatMap(([key,label])=>{const c=details.capabilityCounts?.[key];return c&&c.available<c.total?[{label,count:c.total-c.available}]:[]});
 const warnings:string[]=Array.isArray(details.warnings)?details.warnings:[];
 const error=run.error_code?({session_expired:'登录已过期，请重新连接账号',rate_limited:'请求过于频繁，本次同步未完成'} as Record<string,string>)[run.error_code]??run.error_code:null;
 const hasIssues=!!error||missing.length>0||failed.length>0||warnings.length>0;
 return <div className="s-run-quality"><header><b>{date(run.started_at)}</b></header><p><i className={'s-run-dot '+run.status}/>{names[run.status]}</p><small>{run.request_count??'—'} 次请求 · {run.timings?.totalMs!=null?(run.timings.totalMs/1000).toFixed(1)+' s':'—'}</small>{hasIssues&&<div className="s-run-issues" aria-label="同步异常"><h4>未同步完成的内容</h4>{error&&<p className="s-error">{error}</p>}{failed.map(i=><p key={'source-'+i.label}><span>{i.label}</span><b>{i.count} 篇获取失败</b></p>)}{missing.map(i=><p key={i.label}><span>{i.label}</span><b>{i.count} 篇未返回</b></p>)}{warnings.map((warning,i)=><small key={i}>{warning}</small>)}</div>}</div>;
}
