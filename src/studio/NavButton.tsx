import {useRef,type ReactNode} from 'react';
import type {MotionIconHandle} from 'lucide-motion';
import {LayoutDashboard,SquarePlay,ChartNoAxesCombined,Link2,Settings} from 'lucide-motion';
const icons:Record<string,any>={overview:LayoutDashboard,videos:SquarePlay,analysis:ChartNoAxesCombined,sources:Link2,settings:Settings};
export function NavButton({id,label,active,onClick,children}:{id:string;label:string;active:boolean;onClick:()=>void;children?:ReactNode}){const Icon=icons[id],ref=useRef<MotionIconHandle>(null);return <button aria-label={label} title={label} aria-current={active?'page':undefined} onClick={()=>{ref.current?.play();onClick()}}>{children}<span className="s-nav-icon"><Icon ref={ref} size={20} trigger="manual" mode="draw" repeat={0} duration={.38} stagger={.015} onLeave="complete"/></span><span>{label}</span></button>}
