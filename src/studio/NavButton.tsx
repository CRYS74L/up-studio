import {useSelectionBox} from './use-selection-box';
import {useRef,useState,useLayoutEffect,type CSSProperties,type ReactNode} from 'react';
import {warmRoute} from './page-transition';
import {motion,useReducedMotion} from 'motion/react';
import {controlSpring} from './controls';
import type {MotionIconHandle} from 'lucide-motion';
import {LayoutDashboard,SquarePlay,ChartNoAxesCombined,DatabaseZap,Settings} from 'lucide-motion';
const icons:Record<string,any>={overview:LayoutDashboard,videos:SquarePlay,analysis:ChartNoAxesCombined,sources:DatabaseZap,settings:Settings};
export function NavButton({id,label,active,preview,onClick,children}:{id:string;label:string;active:boolean;preview?:boolean;onClick:()=>void;children?:ReactNode}){
 const Icon=icons[id],ref=useRef<MotionIconHandle>(null),[shown,setShown]=useState(active);
 useLayoutEffect(()=>{if(active===shown)return;const apply=()=>{setShown(active);if(active)ref.current?.play()};if(document.documentElement.dataset.routePhase==='preparing'){document.addEventListener('up:route-motion',apply,{once:true});return()=>document.removeEventListener('up:route-motion',apply)}apply()},[active,shown]);
 return <button aria-label={label} data-nav-id={id} data-nav-target={preview??active} data-preview={preview} aria-current={(preview??active)?'page':undefined} onPointerEnter={()=>{if(!active)warmRoute(id)}} onFocus={()=>{if(!active)warmRoute(id)}} onClick={onClick}>{children}<span className="s-nav-icon"><Icon ref={ref} size={20} trigger="manual" mode="draw" repeat={0} duration={.38} stagger={.015} onLeave="complete"/></span><span>{label}</span></button>;
}
// Local offsets stay stable when the document restores a different scroll position.
export function NavSelection({page}:{page:string}){
 const ref=useRef<HTMLSpanElement>(null),reduced=useReducedMotion(),box=useSelectionBox(ref,'[data-nav-target=true]',page,'nav');
 return <motion.span ref={ref} aria-hidden="true" className="s-nav-indicator" initial={false} animate={box?{...box,opacity:1}:{opacity:0}} style={{visibility:box?'visible':'hidden','--nav-x':(box?.x??0)+'px','--nav-y':(box?.y??0)+'px'} as CSSProperties} transition={reduced?{duration:0}:controlSpring}/>;
}
