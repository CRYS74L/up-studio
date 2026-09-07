import type {ReactNode} from 'react';
import {LayoutDashboard,Clapperboard,ChartNoAxesCombined,Database,Settings} from 'lucide-motion';
const icons:Record<string,any>={overview:LayoutDashboard,videos:Clapperboard,analysis:ChartNoAxesCombined,sources:Database,settings:Settings};
export function NavButton({id,label,active,onClick,children}:{id:string;label:string;active:boolean;onClick:()=>void;children?:ReactNode}){const Icon=icons[id];return <button aria-label={label} title={label} aria-current={active?'page':undefined} onClick={onClick}>{children}<span className="s-nav-icon"><Icon size={20} trigger="parent-hover" mode="draw" repeat={0} duration={.28} stagger={.01} onLeave="complete"/></span><span>{label}</span></button>}
