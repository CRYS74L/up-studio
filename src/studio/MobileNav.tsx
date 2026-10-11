import {useRef,useState,type PointerEvent} from 'react';
import {GlassMaterial} from './glass/GlassMaterial';
import {NavButton,NavSelection} from './NavButton';
import {isLocalAccess} from './access';
const tabs=[['overview','概览'],['videos','稿件'],['analysis','分析'],['sources','数据源'],['settings','设置']] as const;
/** A press previews selection; only release commits navigation. Capture keeps
 * horizontal scrubbing alive outside the bar without scrolling the document. */
export function MobileNav({page,onChange}:{page:string;onChange:(page:string)=>void}){
 const visibleTabs=isLocalAccess()?tabs:tabs.filter(([id])=>id!=='settings');
 const [preview,setPreview]=useState<string|null>(null),gesture=useRef<{id:number;page:string}|null>(null),suppressClick=useRef(false);
 const pick=(e:PointerEvent<HTMLElement>)=>{const buttons=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-nav-id]')];return buttons.reduce((best,b)=>{const r=b.getBoundingClientRect();return Math.abs(e.clientX-(r.left+r.width/2))<best.distance?{page:b.dataset.navId!,distance:Math.abs(e.clientX-(r.left+r.width/2))}:best},{page,distance:Infinity}).page};
 const cancel=()=>{gesture.current=null;setPreview(null)};
 return <div className="s-mobile-dock"><nav className="s-mobile-nav s-liquid" aria-label="移动导航" data-scrubbing={preview!==null} style={{gridTemplateColumns:`repeat(${visibleTabs.length},minmax(0,1fr))`}}
 onPointerDown={e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();const next=pick(e);gesture.current={id:e.pointerId,page:next};suppressClick.current=true;setPreview(next);e.currentTarget.setPointerCapture(e.pointerId)}}
 onPointerMove={e=>{if(gesture.current?.id!==e.pointerId)return;const next=pick(e);gesture.current.page=next;setPreview(next)}}
 onPointerUp={e=>{if(gesture.current?.id!==e.pointerId)return;const next=gesture.current.page;cancel();e.currentTarget.releasePointerCapture(e.pointerId);if(next!==page)onChange(next)}}
 onPointerCancel={cancel} onLostPointerCapture={cancel}
 onClickCapture={e=>{if(suppressClick.current&&e.detail!==0){e.preventDefault();e.stopPropagation();suppressClick.current=false}}}>
 <GlassMaterial/><NavSelection page={preview??page}/>{visibleTabs.map(([id,label])=><NavButton key={id} id={id} label={label} active={page===id} preview={preview===null?undefined:preview===id} onClick={()=>onChange(id)}/>)}</nav></div>;
}
