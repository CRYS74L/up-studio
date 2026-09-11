import {useRef,useState,useLayoutEffect,type CSSProperties,type ReactNode} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {controlSpring} from './controls';
import type {MotionIconHandle} from 'lucide-motion';
import {LayoutDashboard,SquarePlay,ChartNoAxesCombined,DatabaseZap,Settings} from 'lucide-motion';
const icons:Record<string,any>={overview:LayoutDashboard,videos:SquarePlay,analysis:ChartNoAxesCombined,sources:DatabaseZap,settings:Settings};
export function NavButton({id,label,active,onClick,children}:{id:string;label:string;active:boolean;onClick:()=>void;children?:ReactNode}){const Icon=icons[id],ref=useRef<MotionIconHandle>(null);return <button aria-label={label} title={label} aria-current={active?'page':undefined} onClick={()=>{ref.current?.play();onClick()}}>{children}<span className="s-nav-icon"><Icon ref={ref} size={20} trigger="manual" mode="draw" repeat={0} duration={.38} stagger={.015} onLeave="complete"/></span><span>{label}</span></button>}
// Local offsets stay stable when the document restores a different scroll position.
export function NavSelection({page}:{page:string}){
 const ref=useRef<HTMLSpanElement>(null),reduced=useReducedMotion(),[box,setBox]=useState<{x:number;y:number;width:number;height:number}|null>(null);
 useLayoutEffect(()=>{const nav=ref.current!.closest('nav')!;const measure=()=>{const button=nav.querySelector<HTMLElement>('[aria-current=page]');if(button)setBox({x:button.offsetLeft,y:button.offsetTop,width:button.offsetWidth,height:button.offsetHeight})};measure();const observer=new ResizeObserver(measure);observer.observe(nav);nav.querySelectorAll('button').forEach(b=>observer.observe(b));return()=>observer.disconnect()},[page]);
 return <motion.span ref={ref} aria-hidden="true" className="s-nav-indicator" initial={false} animate={box?{...box,opacity:1}:{opacity:0}} style={{visibility:box?'visible':'hidden','--nav-x':(box?.x??0)+'px','--nav-y':(box?.y??0)+'px'} as CSSProperties} transition={reduced?{duration:0}:controlSpring}/>;
}
