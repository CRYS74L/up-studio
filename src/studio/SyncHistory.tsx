import {ChevronLeft,ChevronRight,History} from 'lucide-react';
import {shiftSyncDay} from '../../shared/sync-days';
import {Popover} from './controls';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';

import {AnimatePresence,motion} from 'motion/react';
import {date} from '../format';
import {syncSlots,incomingSlots} from './sync-strip';

const labels:Record<string,string>={views:'播放量',coverAttractionScore:'封标吸引力',avgWatchSeconds:'观看时长',avgWatchPercent:'观看进度',followersGained:'涨粉',likes:'点赞',comments:'评论',danmaku:'弹幕',favorites:'收藏',coins:'投币',shares:'分享',threeSecondBounceRate:'3秒跳出率',interactionRate:'互动率',playToFollowRate:'播转粉率',fanAudiencePercent:'粉丝观看率',guestAudiencePercent:'游客观看率'};
const names:Record<string,string>={success:'同步完成',partial:'部分完成',failed:'同步失败',running:'正在同步'};
export function SyncHistory({runs,day,today,firstDay,onDayChange,loading=false,error=false}:{runs:any[];day:string;today:string;firstDay:string|null;onDayChange:(day:string)=>void;loading?:boolean;error?:boolean}){
 const plot=useRef<HTMLDivElement>(null),[width,setWidth]=useState(668),[pagination,setPagination]=useState({day,page:0}),[selected,setSelected]=useState(''),[hover,setHover]=useState<{run:any;x:number}|null>(null);
 useLayoutEffect(()=>{const el=plot.current!;const observer=new ResizeObserver(()=>setWidth(el.clientWidth));setWidth(el.clientWidth);observer.observe(el);return()=>observer.disconnect()},[]);
 useLayoutEffect(()=>{setPagination({day,page:0});setSelected('');setHover(null)},[day]);
 const page=pagination.day===day?pagination.page:0,setPage=(page:number)=>setPagination({day,page});
 const complete=runs;
 const {capacity:count,pages,current,step,offset}=syncSlots(width,complete.length,page);
 const slice=complete.slice(current*count,(current+1)*count).reverse();
 const previous=useRef<{ids:string[];runs:any[];width:number;day:string;page:number;step:number;offset:number}|null>(null),stop=useRef<(()=>void)|null>(null);
 useLayoutEffect(()=>{
  stop.current?.();const before=previous.current,ids=slice.map(r=>r.id);previous.current={ids,runs:slice,width,day,page:current,step,offset};
  if(before&&(before.page!==current||before.day!==day)&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const svg=plot.current!.querySelector('svg')!,group=svg.querySelector('g')!,ghost=document.createElementNS('http://www.w3.org/2000/svg','g');ghost.setAttribute('aria-hidden','true');ghost.style.pointerEvents='none';
   before.runs.forEach((run,i)=>{const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');Object.entries({x:String(before.offset+i*before.step),y:'0',width:'5',height:'16',rx:'1','data-status':run.status}).forEach(([key,value])=>rect.setAttribute(key,value));ghost.append(rect)});svg.append(ghost);
   const direction=before.day!==day?(day<before.day?-1:1):(current>before.page?-1:1),timing={duration:340,easing:'cubic-bezier(.3,.15,.35,1)'};const animations=[group.animate([{transform:`translateX(${direction*width}px)`,opacity:0},{transform:'translateX(0)',opacity:1}],timing),ghost.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${-direction*width}px)`,opacity:0}],timing)];const start=document.timeline.currentTime;animations.forEach(a=>a.startTime=start);const clean=()=>{animations.forEach(a=>a.cancel());ghost.remove()};stop.current=clean;void Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(stop.current===clean){clean();stop.current=null}});return;
  }
  if(!before||current!==0||before.page!==0||before.width!==width||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const added=incomingSlots(before.ids,ids),svg=plot.current?.querySelector('svg'),group=svg?.querySelector('g');if(!added||!svg||!group)return;
  const oldLast=before.ids.length-1,newLast=ids.indexOf(before.ids[oldLast]);
  const distance=before.offset+oldLast*before.step-(offset+newLast*step),timing={duration:520,easing:'cubic-bezier(.18,.85,.22,1)'};
  const animations=[group.animate([{transform:`translateX(${distance}px)`},{transform:'translateX(0)'}],timing)],ghosts:SVGRectElement[]=[];
  before.runs.filter(r=>!ids.includes(r.id)).forEach((r,i)=>{const ghost=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [name,value] of Object.entries({x:String(before.offset+i*before.step),y:'0',width:'5',height:'16',rx:'1','pointer-events':'none','aria-hidden':'true','data-status':r.status}))ghost.setAttribute(name,value);svg.append(ghost);ghosts.push(ghost);animations.push(ghost.animate([{transform:'translateX(0)'},{transform:`translateX(${-distance}px)`}],timing));});
  [...group.querySelectorAll('rect')].slice(-added).forEach(rect=>animations.push(rect.animate([{opacity:0},{opacity:1}],{duration:440,easing:'cubic-bezier(.18,.85,.22,1)'})));
  const clean=()=>{animations.forEach(a=>a.cancel());ghosts.forEach(g=>g.remove())};stop.current=clean;
  void Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(stop.current===clean){clean();stop.current=null;}});
 },[slice.map(r=>r.id).join(','),width,current,day]);
 useLayoutEffect(()=>()=>stop.current?.(),[]);
 const held=useRef<ReturnType<typeof setTimeout>|null>(null),repeat=useRef(false),cursor=useRef(day),latest=useRef({today,firstDay,onDayChange});latest.current={today,firstDay,onDayChange};
 useEffect(()=>{if(!held.current)cursor.current=day},[day]);
 const stopHold=()=>{if(held.current)clearTimeout(held.current);held.current=null};
 useEffect(()=>{window.addEventListener('pointerup',stopHold);window.addEventListener('blur',stopHold);return()=>{stopHold();window.removeEventListener('pointerup',stopHold);window.removeEventListener('blur',stopHold)}},[]);
 const moveDay=(direction:number)=>{const next=shiftSyncDay(cursor.current,direction),v=latest.current;if(next>v.today||(v.firstDay&&next<v.firstDay))return false;cursor.current=next;v.onDayChange(next);return true};
 const hold=(direction:number)=>{stopHold();repeat.current=false;cursor.current=day;held.current=setTimeout(function tick(){repeat.current=true;if(moveDay(direction))held.current=setTimeout(tick,160);else stopHold()},400)};
 const clickDay=(direction:number)=>{if(!repeat.current){cursor.current=day;moveDay(direction)}repeat.current=false};
 const active=hover??(selected?{run:runs.find(r=>r.id===selected),x:offset+Math.max(0,slice.findIndex(r=>r.id===selected))*step}:null);
 const activeId=active?.run?.id;
 return <div className="s-sync-history s-sync-grid-history"><header className="s-history-heading"><div><div className="s-history-title"><span className="s-service-symbol teal" aria-hidden="true"><History/></span><h2>同步记录</h2></div><nav className="s-history-day" aria-label="同步记录日期"><button aria-label="前一天同步记录" disabled={!firstDay||day<=firstDay} onPointerDown={e=>{if(e.button===0){e.currentTarget.setPointerCapture(e.pointerId);hold(-1)}}} onPointerUp={stopHold} onPointerCancel={stopHold} onClick={()=>clickDay(-1)}><ChevronLeft/></button><time dateTime={day}>{day.replaceAll('-','/')}</time><button aria-label="后一天同步记录" disabled={day>=today} onPointerDown={e=>{if(e.button===0){e.currentTarget.setPointerCapture(e.pointerId);hold(1)}}} onPointerUp={stopHold} onPointerCancel={stopHold} onClick={()=>clickDay(1)}><ChevronRight/></button></nav></div></header>  {(error||!complete.length)&&<p className="s-history-empty" role="status">{loading?'读取记录中…':error?'暂时无法读取同步记录':'当天暂无同步记录'}</p>}<div className="s-sync-plot" ref={plot} onPointerLeave={()=>setHover(null)}><svg width="100%" height="16" viewBox={`0 0 ${width} 16`} role="group" aria-label="同步状态历史"><g>{slice.map((run,i)=><rect key={run.id} role="button" tabIndex={0} data-status={run.status} data-active={run.id===activeId} aria-label={date(run.started_at)+' · '+(names[run.status]??run.status)} aria-pressed={run.id===selected} x={offset+i*step} y={0} width={5} height={16} rx={1} ry={1} onPointerEnter={()=>setHover({run,x:offset+i*step})} onFocus={()=>setHover({run,x:offset+i*step})} onBlur={()=>setHover(null)} onClick={()=>setSelected(run.id===selected?'':run.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(run.id===selected?'':run.id)}}}/>)}</g></svg>
   <Popover open={!!active?.run} close={()=>{setSelected('');setHover(null)}} anchor={plot} anchorOffset={active?.x??0} role="tooltip" label="同步记录详情" width="content">{active?.run&&<RunDetails run={active.run}/>}</Popover>


  </div>

{pages>1&&<nav className="s-history-dots" aria-label="同步记录分页">{Array.from({length:pages},(_,n)=>pages-1-n).map(i=><button key={i} aria-label={'第 '+(i+1)+' 页同步记录'} aria-current={current===i?'page':undefined} onClick={()=>{setPage(i);setHover(null);setSelected('')}}><span/></button>)}</nav>}
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
