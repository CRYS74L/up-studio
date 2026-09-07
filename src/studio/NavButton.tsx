import {useRef,type ReactNode} from 'react';
import {useReducedMotion} from 'motion/react';
import {LayoutDashboardIcon,VideoIcon,ChartNoAxesCombinedIcon,FolderIcon,SettingsIcon} from '@animateicons/react/lucide';
const icons:Record<string,any>={overview:LayoutDashboardIcon,videos:VideoIcon,analysis:ChartNoAxesCombinedIcon,sources:FolderIcon,settings:SettingsIcon};
export function NavButton({id,label,active,onClick,children}:{id:string;label:string;active:boolean;onClick:()=>void;children?:ReactNode}){
 const ref=useRef<{startAnimation:()=>void;stopAnimation:()=>void}>(null),reduce=useReducedMotion(),Icon=icons[id];
 const start=()=>{if(!reduce)ref.current?.startAnimation();},stop=()=>ref.current?.stopAnimation();
 return <button aria-label={label} title={label} aria-current={active?'page':undefined} onMouseEnter={start} onMouseLeave={stop} onFocus={start} onBlur={stop} onClick={()=>{start();onClick();}}>{children}<Icon ref={ref} size={20} isAnimated={!reduce} duration={.6}/><span>{label}</span></button>;
}
