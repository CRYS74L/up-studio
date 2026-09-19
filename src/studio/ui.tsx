import {createPortal} from 'react-dom';
import {SegmentedControl} from './controls';
import { Children,useEffect,useLayoutEffect,useRef,useState,type ReactNode } from 'react';
import { AnimatePresence,motion,useReducedMotion,useIsPresent,useMotionValue } from 'motion/react';
import { Check,ChevronRight,Search,X,ImageOff } from 'lucide-react';
import type { Video } from '../types';
import { coverSrc,compact } from '../format';
import {queueCoverDecode,isCoverReady} from './cover-loading';
export const spring={type:'spring' as const,stiffness:420,damping:38};
export function Segments({items,value,onChange,label,motionTarget}:{items:string[];value:string;onChange:(v:string)=>void;label:string;motionTarget?:string}){return <SegmentedControl items={items.map(v=>({value:v,label:v}))} value={value} onChange={onChange} label={label} contentTarget={motionTarget}/>;}
export function Cover({video,className='',variant='card'}:{video:Video;className?:string;variant?:'card'|'preview'}){
  const src=coverSrc(video,variant),ref=useRef<HTMLImageElement>(null);
  const [readySrc,setReadySrc]=useState<string|null>(()=>isCoverReady(src)?src:null),[failed,setFailed]=useState(false);
  useLayoutEffect(()=>{setFailed(false);let live=true,queued=false;const img=ref.current;if(!img)return;const decode=()=>{if(queued)return;queued=true;void queueCoverDecode(async()=>{if(live)await img.decode()},true).then(()=>{if(live&&img.naturalWidth)setReadySrc(src)}).catch(()=>{if(live)setFailed(true)});};if(img.complete&&img.naturalWidth)decode();img.addEventListener('load',decode);return()=>{live=false;img.removeEventListener('load',decode)};},[src]);
  return failed?<span className={`s-cover-fallback ${className}`}><ImageOff/></span>:<img ref={ref} className={'s-decoded-cover '+className} data-decoded={readySrc===src||isCoverReady(src)} src={src} alt="" loading="eager" decoding="async" onError={()=>setFailed(true)}/>;
}
export function Empty({title,body,action}:{title:string;body:string;action?:ReactNode}){return <div className="s-empty"><span className="s-empty-symbol"><Search/></span><h2>{title}</h2><p>{body}</p>{action}</div>;}
export function Stat({label,value,color}:{label:string;value:string;color?:string}){return <div className="s-stat"><span>{label}</span><strong style={{color}}>{value}</strong></div>;}
export function Sheet({title,subtitle,children,close,footer,wide=false,compact=false}:{title:string;subtitle?:string;children:ReactNode;close:()=>void;footer?:ReactNode;wide?:boolean;compact?:boolean}){
  const hasBody=Children.toArray(children).some(child=>typeof child!=='string'||child.trim().length>0);const ref=useRef<HTMLDialogElement>(null);const reduced=useReducedMotion(),present=useIsPresent(),opacity=useMotionValue(0);
  useEffect(()=>{const previous=document.activeElement;ref.current?.showModal();return()=>{ref.current?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};},[]);
  return createPortal(<motion.dialog ref={ref} style={{opacity,...{'--sheet-opacity':opacity}}} data-compact={compact} data-empty={!hasBody} data-closing={!present} className={wide?"s-sheet s-sheet-wide":"s-sheet"} aria-label={title} initial={{opacity:0,y:reduced?0:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:12,transition:{type:'tween',duration:reduced?0:.18,ease:[.4,0,1,1]}}} transition={{type:'tween',duration:reduced?0:.22,ease:[.23,1,.32,1]}} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target!==ref.current)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}>
    <header><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{!compact&&<button className="s-icon" aria-label="关闭" onClick={close}><X/></button>}</header>{hasBody&&<div className="s-sheet-body">{children}</div>}{footer&&<footer>{footer}</footer>}
  </motion.dialog>,document.querySelector('.studio')??document.body);
}
export function VideoPicker({videos,selected,onChange,close}:{videos:Video[];selected:string[];onChange:(ids:string[])=>void;close:()=>void}){
  const [search,setSearch]=useState('');const [draft,setDraft]=useState(selected);const shown=videos.filter(v=>`${v.title} ${v.bvid}`.toLowerCase().includes(search.toLowerCase()));
  return <Sheet title="选择稿件" subtitle="选择要放在一起分析的作品" close={close} footer={<><span>已选 {draft.length} / {videos.length} 篇</span><button className="s-primary" onClick={()=>{onChange(draft);close();}}>应用选择</button></>}><label className="s-search"><Search/><input autoFocus placeholder="搜索标题或 BV 号" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="s-picker-tools"><button onClick={()=>setDraft([...new Set([...draft,...shown.map(v=>v.id)])])}>选中搜索结果</button><button onClick={()=>setDraft([])}>清空选择</button></div><div className="s-picker-list">{shown.map(v=><label key={v.id}><input type="checkbox" checked={draft.includes(v.id)} onChange={()=>setDraft(ids=>ids.includes(v.id)?ids.filter(id=>id!==v.id):[...ids,v.id])}/><Cover video={v}/><span><b>{v.title}</b><small>{v.bvid} · {compact(v.views)} 播放</small></span></label>)}</div>{!shown.length&&<p>没有匹配的稿件</p>}</Sheet>;
}
export function Pill({children,color}:{children:ReactNode;color?:string}){return <span className="s-pill" style={{color}}>{children}</span>;}
export {AnimatePresence,motion,Check,ChevronRight};
