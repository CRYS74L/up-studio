import { useEffect,useId,useRef,useState,type ReactNode } from 'react';
import { AnimatePresence,motion,useReducedMotion } from 'motion/react';
import { Check,ChevronRight,Search,X,ImageOff } from 'lucide-react';
import type { Video } from '../types';
import { coverSrc,compact } from '../format';
export const spring={type:'spring' as const,stiffness:420,damping:38};
export function Segments({items,value,onChange,label}:{items:string[];value:string;onChange:(v:string)=>void;label:string}){
  const id=useId();return <div className="s-segments" role="group" aria-label={label}>{items.map(item=><button key={item} aria-pressed={value===item} onClick={()=>onChange(item)}>{value===item&&<motion.span layoutId={id} className="s-segment-thumb" transition={spring}/>}<span>{item}</span></button>)}</div>;
}
export function Cover({video,className=''}:{video:Video;className?:string}){const [failed,setFailed]=useState(false);return failed?<span className={`s-cover-fallback ${className}`}><ImageOff/></span>:<img className={className} src={coverSrc(video)} alt="" loading="lazy" onError={()=>setFailed(true)}/>;}
export function Empty({title,body,action}:{title:string;body:string;action?:ReactNode}){return <div className="s-empty"><span className="s-empty-symbol"><Search/></span><h2>{title}</h2><p>{body}</p>{action}</div>;}
export function Stat({label,value,color}:{label:string;value:string;color?:string}){return <div className="s-stat"><span>{label}</span><strong style={{color}}>{value}</strong></div>;}
export function Sheet({title,subtitle,children,close,footer}:{title:string;subtitle?:string;children:ReactNode;close:()=>void;footer?:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);const reduced=useReducedMotion();
  useEffect(()=>{const previous=document.activeElement;ref.current?.showModal();return()=>{ref.current?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
  return <motion.dialog ref={ref} className="s-sheet" aria-label={title} initial={{opacity:0,y:reduced?0:24,scale:reduced?1:.985}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:reduced?0:24}} transition={spring} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target!==ref.current)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}>
    <header><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="s-icon" aria-label="关闭" onClick={close}><X/></button></header><div className="s-sheet-body">{children}</div>{footer&&<footer>{footer}</footer>}
  </motion.dialog>;
}
export function VideoPicker({videos,selected,onChange,close}:{videos:Video[];selected:string[];onChange:(ids:string[])=>void;close:()=>void}){
  const [search,setSearch]=useState('');const [draft,setDraft]=useState(selected);const shown=videos.filter(v=>`${v.title} ${v.bvid}`.toLowerCase().includes(search.toLowerCase()));
  return <Sheet title="选择稿件" subtitle="选择要放在一起分析的作品" close={close} footer={<><span>已选 {draft.length} / {videos.length} 篇</span><button className="s-primary" onClick={()=>{onChange(draft);close();}}>应用选择</button></>}><label className="s-search"><Search/><input autoFocus placeholder="搜索标题或 BV 号" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="s-picker-tools"><button onClick={()=>setDraft([...new Set([...draft,...shown.map(v=>v.id)])])}>选中搜索结果</button><button onClick={()=>setDraft([])}>清空选择</button></div><div className="s-picker-list">{shown.map(v=><label key={v.id}><input type="checkbox" checked={draft.includes(v.id)} onChange={()=>setDraft(ids=>ids.includes(v.id)?ids.filter(id=>id!==v.id):[...ids,v.id])}/><Cover video={v}/><span><b>{v.title}</b><small>{v.bvid} · {compact(v.views)} 播放</small></span></label>)}</div>{!shown.length&&<p>没有匹配的稿件</p>}</Sheet>;
}
export function Pill({children,color}:{children:ReactNode;color?:string}){return <span className="s-pill" style={{color}}>{children}</span>;}
export {AnimatePresence,motion,Check,ChevronRight};
