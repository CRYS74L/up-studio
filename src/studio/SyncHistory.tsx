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
 const active=hover??(selected?{run:runs.find(r=>r.id===selected),x:Math.max(0,slice.findIndex(r=>r.id===selected))*step}:null);
 const activeId=active?.run?.id;
 return <div className="s-sync-history s-sync-grid-history"><div className="s-sync-summary"><b><span className={`s-run-dot ${runs[0]?.status}`}/>{names[runs[0]?.status]??'暂无同步'}</b><span>{runs.length} 次同步 · {Math.round(runs.filter(r=>r.status==='success').length/runs.length*100)}% 完成</span></div>
  <div className="s-sync-range"><span>{slice.length?date(slice[0].started_at)+' — '+date(slice.at(-1).started_at):'暂无记录'}</span>{pages>1&&<div><button className="s-icon" aria-label="更早的同步记录" disabled={current+1>=pages} onClick={()=>{setPage(current+1);setHover(null)}}><ChevronLeft/></button><button className="s-icon" aria-label="更新的同步记录" disabled={current===0} onClick={()=>{setPage(current-1);setHover(null)}}><ChevronRight/></button></div>}</div>
  <div className="s-sync-plot" ref={plot} onPointerLeave={()=>setHover(null)}><svg width="100%" height="16" viewBox={`0 0 ${width} 16`} role="group" aria-label="同步状态历史">{slice.map((run,i)=><rect key={run.id} role="button" tabIndex={0} data-status={run.status} data-active={run.id===activeId} aria-label={date(run.started_at)+' · '+(names[run.status]??run.status)} aria-pressed={run.id===selected} x={i*step} y={0} width={5} height={16} rx={1} ry={1} onPointerEnter={()=>setHover({run,x:i*step})} onFocus={()=>setHover({run,x:i*step})} onBlur={()=>setHover(null)} onClick={()=>setSelected(run.id===selected?'':run.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(run.id===selected?'':run.id)}}}/>)}</svg>
   {active?.run&&<div className="s-sync-tooltip ui-popover" role="tooltip" style={{position:'absolute',left:Math.max(0,Math.min(active.x,width-240)),width:240}}><header><b>{date(active.run.started_at)}</b></header><p><i className={'s-run-dot '+active.run.status}/>{names[active.run.status]}</p><small>{active.run.request_count??'—'} 次请求 · {active.run.timings?.totalMs!=null?(active.run.timings.totalMs/1000).toFixed(1)+' s':'—'}</small>{active.run.error_code&&<p>{active.run.error_code}</p>}</div>}

  </div>
  <div className="s-sync-key"><span><i data-status="success"/>完成</span><span><i data-status="partial"/>部分完成</span><span><i data-status="failed"/>失败</span></div>

 </div>;
}
