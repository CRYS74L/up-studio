import {useLayoutEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {AnimatePresence,motion} from 'motion/react';
import {date,percent} from '../format';

const names:Record<string,string>={success:'同步完成',partial:'部分完成',failed:'同步失败',running:'正在同步'};
export function SyncHistory({runs}:{runs:any[]}){
 const plot=useRef<HTMLDivElement>(null),[width,setWidth]=useState(668),[page,setPage]=useState(0),[selected,setSelected]=useState(''),[hover,setHover]=useState<{run:any;x:number}|null>(null);
 useLayoutEffect(()=>{const el=plot.current!;const observer=new ResizeObserver(()=>setWidth(el.clientWidth));setWidth(el.clientWidth);observer.observe(el);return()=>observer.disconnect()},[]);
 const count=Math.max(1,Math.floor((width+2.34)/7.34)),pages=Math.max(1,Math.ceil(runs.length/count)),current=Math.min(page,pages-1);
 const slice=runs.slice(current*count,(current+1)*count).reverse(),step=slice.length>1?Math.min(7.34,(width-5)/(slice.length-1)):7.34;
 const active=runs.find(r=>r.id===selected);
 return <div className="s-sync-history s-sync-grid-history"><div className="s-sync-summary"><b><span className={`s-run-dot ${runs[0]?.status}`}/>{names[runs[0]?.status]??'暂无同步'}</b><span>{runs.length} 次同步 · {Math.round(runs.filter(r=>r.status==='success').length/runs.length*100)}% 完成</span></div>
  <div className="s-sync-range"><span>{slice.length?date(slice[0].started_at)+' — '+date(slice.at(-1).started_at):'暂无记录'}</span>{pages>1&&<div><button className="s-icon" aria-label="更早的同步记录" disabled={current+1>=pages} onClick={()=>{setPage(current+1);setHover(null)}}><ChevronLeft/></button><button className="s-icon" aria-label="更新的同步记录" disabled={current===0} onClick={()=>{setPage(current-1);setHover(null)}}><ChevronRight/></button></div>}</div>
  <div className="s-sync-plot" ref={plot} onPointerLeave={()=>setHover(null)}><svg width="100%" height="16" viewBox={`0 0 ${width} 16`} role="group" aria-label="同步状态历史">{slice.map((run,i)=><rect key={run.id} role="button" tabIndex={0} data-status={run.status} aria-label={date(run.started_at)+' · '+(names[run.status]??run.status)} aria-pressed={run.id===selected} x={i*step} y={0} width={5} height={16} rx={1} ry={1} onPointerEnter={()=>setHover({run,x:i*step})} onFocus={()=>setHover({run,x:i*step})} onBlur={()=>setHover(null)} onClick={()=>setSelected(run.id===selected?'':run.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(run.id===selected?'':run.id)}}}/>)}</svg>
   {hover&&<div className="s-sync-tooltip" role="tooltip" style={{left:Math.max(0,Math.min(hover.x,width-230))}}><b>{names[hover.run.status]}</b><span>{date(hover.run.started_at)}</span></div>}
  </div>
  <div className="s-sync-key"><span><i data-status="success"/>完成</span><span><i data-status="partial"/>部分完成</span><span><i data-status="failed"/>失败</span></div>
  <AnimatePresence mode="wait">{active&&<motion.div key={active.id} className="s-run-detail s-single-run" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{type:'tween',duration:.24,ease:[.22,1,.36,1]}}><div><header><b>{names[active.status]}</b><span>{date(active.started_at)}</span></header><div className="s-single-run-stats"><span>{active.request_count??'—'} 次请求</span><span>{active.timings?.totalMs!=null?(active.timings.totalMs/1000).toFixed(1)+' s':'—'}</span><span>{typeof active.coverage==='number'?'接口覆盖 '+percent(active.coverage*100):'—'}</span></div>{active.error_code&&<p className="s-error">{active.error_code}</p>}{active.details?.warnings?.length>0&&<ul>{active.details.warnings.map((warning:string,i:number)=><li key={i}>{warning}</li>)}</ul>}</div></motion.div>}</AnimatePresence>
 </div>;
}
