import {Popover} from './controls';
import {useLayoutEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {AnimatePresence,motion} from 'motion/react';
import {date} from '../format';
import {syncSlots,incomingSlots} from './sync-strip';

const labels:Record<string,string>={views:'播放量',coverAttractionScore:'封标吸引力',avgWatchSeconds:'观看时长',avgWatchPercent:'观看进度',followersGained:'涨粉',likes:'点赞',comments:'评论',danmaku:'弹幕',favorites:'收藏',coins:'投币',shares:'分享',threeSecondBounceRate:'3秒跳出率',interactionRate:'互动率',playToFollowRate:'播转粉率',fanAudiencePercent:'粉丝观看率',guestAudiencePercent:'游客观看率'};
const names:Record<string,string>={success:'同步完成',partial:'部分完成',failed:'同步失败',running:'正在同步'};
export function SyncHistory({runs}:{runs:any[]}){
 const plot=useRef<HTMLDivElement>(null),[width,setWidth]=useState(668),[page,setPage]=useState(0),[selected,setSelected]=useState(''),[hover,setHover]=useState<{run:any;x:number}|null>(null);
 useLayoutEffect(()=>{const el=plot.current!;const observer=new ResizeObserver(()=>setWidth(el.clientWidth));setWidth(el.clientWidth);observer.observe(el);return()=>observer.disconnect()},[]);
 const complete=runs.filter(r=>r.status!=='running');
 const {capacity:count,pages,current,step,offset}=syncSlots(width,complete.length,page);
 const slice=complete.slice(current*count,(current+1)*count).reverse();
 const previous=useRef<{ids:string[];runs:any[];width:number;page:number;step:number;offset:number}|null>(null),stop=useRef<(()=>void)|null>(null);
 useLayoutEffect(()=>{
  stop.current?.();const before=previous.current,ids=slice.map(r=>r.id);previous.current={ids,runs:slice,width,page:current,step,offset};
  if(before&&before.page!==current&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const svg=plot.current!.querySelector('svg')!,group=svg.querySelector('g')!,ghost=document.createElementNS('http://www.w3.org/2000/svg','g');ghost.setAttribute('aria-hidden','true');ghost.style.pointerEvents='none';
   before.runs.forEach((run,i)=>{const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');Object.entries({x:String(before.offset+i*before.step),y:'0',width:'5',height:'16',rx:'1','data-status':run.status}).forEach(([key,value])=>rect.setAttribute(key,value));ghost.append(rect)});svg.append(ghost);
   const direction=current>before.page?-1:1,timing={duration:340,easing:'cubic-bezier(.3,.15,.35,1)'};const animations=[group.animate([{transform:`translateX(${direction*width}px)`,opacity:0},{transform:'translateX(0)',opacity:1}],timing),ghost.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${-direction*width}px)`,opacity:0}],timing)];const start=document.timeline.currentTime;animations.forEach(a=>a.startTime=start);const clean=()=>{animations.forEach(a=>a.cancel());ghost.remove()};stop.current=clean;void Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(stop.current===clean){clean();stop.current=null}});return;
  }
  if(!before||current!==0||before.page!==0||before.width!==width||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const added=incomingSlots(before.ids,ids),svg=plot.current?.querySelector('svg'),group=svg?.querySelector('g');if(!added||!svg||!group)return;
  const distance=added*step,timing={duration:520,easing:'cubic-bezier(.18,.85,.22,1)'};
  const animations=[group.animate([{transform:`translateX(${distance}px)`},{transform:'translateX(0)'}],timing)],ghosts:SVGRectElement[]=[];
  before.runs.filter(r=>!ids.includes(r.id)).forEach((r,i)=>{const ghost=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [name,value] of Object.entries({x:String(i*step),y:'0',width:'5',height:'16',rx:'1','pointer-events':'none','aria-hidden':'true','data-status':r.status}))ghost.setAttribute(name,value);svg.append(ghost);ghosts.push(ghost);animations.push(ghost.animate([{transform:'translateX(0)'},{transform:`translateX(${-distance}px)`}],timing));});
  [...group.querySelectorAll('rect')].slice(-added).forEach(rect=>animations.push(rect.animate([{opacity:0},{opacity:1}],{duration:440,easing:'cubic-bezier(.18,.85,.22,1)'})));
  const clean=()=>{animations.forEach(a=>a.cancel());ghosts.forEach(g=>g.remove())};stop.current=clean;
  void Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(stop.current===clean){clean();stop.current=null;}});
 },[slice.map(r=>r.id).join(','),width,current]);
 useLayoutEffect(()=>()=>stop.current?.(),[]);
 const active=hover??(selected?{run:runs.find(r=>r.id===selected),x:offset+Math.max(0,slice.findIndex(r=>r.id===selected))*step}:null);
 const activeId=active?.run?.id;
 return <div className="s-sync-history s-sync-grid-history"><header className="s-history-heading"><div><h2>同步记录</h2><span className="s-history-status"><i className={`s-run-dot ${runs[0]?.status}`}/>{names[runs[0]?.status]??'暂无同步'}</span></div><div className="s-history-totals"><span><b>{complete.length}</b> 次同步</span><span><b>{Math.round(complete.filter(r=>r.status==='success').length/Math.max(1,complete.length)*100)}%</b> 完成</span></div></header>  <div className="s-sync-plot" ref={plot} onPointerLeave={()=>setHover(null)}><svg width="100%" height="16" viewBox={`0 0 ${width} 16`} role="group" aria-label="同步状态历史"><g>{slice.map((run,i)=><rect key={run.id} role="button" tabIndex={0} data-status={run.status} data-active={run.id===activeId} aria-label={date(run.started_at)+' · '+(names[run.status]??run.status)} aria-pressed={run.id===selected} x={offset+i*step} y={0} width={5} height={16} rx={1} ry={1} onPointerEnter={()=>setHover({run,x:offset+i*step})} onFocus={()=>setHover({run,x:offset+i*step})} onBlur={()=>setHover(null)} onClick={()=>setSelected(run.id===selected?'':run.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(run.id===selected?'':run.id)}}}/>)}</g></svg>
   <Popover open={!!active?.run} close={()=>{setSelected('');setHover(null)}} anchor={plot} anchorOffset={active?.x??0} role="tooltip" label="同步记录详情" width="content">{active?.run&&<RunDetails run={active.run}/>}</Popover>


  </div>

  <footer className="s-history-footer"><time>{slice.length?date(slice[0].started_at)+' — '+date(slice.at(-1).started_at):'暂无记录'}</time>{pages>1&&<div className="s-history-pager"><button aria-label="更早的同步记录" disabled={current+1>=pages} onClick={()=>{setPage(current+1);setHover(null);setSelected('')}}><ChevronLeft/></button><span>{current+1} / {pages}</span><button aria-label="更新的同步记录" disabled={current===0} onClick={()=>{setPage(current-1);setHover(null);setSelected('')}}><ChevronRight/></button></div>}</footer>
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
 return <div className="s-run-quality"><header><b>{date(run.started_at)}</b></header><p><i className={'s-run-dot '+run.status}/>{names[run.status]}</p><small className='s-run-meta'>{typeof total==='number'?total+' 篇稿件':'稿件数未记录'} · {run.request_count??'—'} 次请求 · {run.timings?.totalMs!=null?(run.timings.totalMs/1000).toFixed(1)+' s':'—'}</small>{hasIssues&&<div className="s-run-issues" aria-label="同步异常"><h4>未同步完成的内容</h4>{error&&<p className="s-error">{error}</p>}{failed.map(i=><p key={'source-'+i.label}><span>{i.label}</span><b>{i.count} 篇获取失败</b></p>)}{missing.map(i=><p key={i.label}><span>{i.label}</span><b>{i.count} 篇未返回</b></p>)}{warnings.map((warning,i)=><small key={i}>{warning}</small>)}</div>}</div>;
}
