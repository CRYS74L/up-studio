import {useRef,type ReactNode} from 'react';
import {useReducedMotion} from 'motion/react';
import {LayoutDashboardIcon,VideoIcon,ChartNoAxesCombinedIcon,ServerIcon,SettingsIcon} from '@animateicons/react/lucide';
const icons:Record<string,any>={overview:LayoutDashboardIcon,videos:VideoIcon,analysis:ChartNoAxesCombinedIcon,sources:ServerIcon,settings:SettingsIcon};
export function NavButton({id,label,active,onClick,children}:{id:string;label:string;active:boolean;onClick:()=>void;children?:ReactNode}){
 const ref=useRef<{startAnimation:()=>void;stopAnimation:()=>void}>(null),reduce=useReducedMotion(),Icon=icons[id];
 const start=()=>{if(!reduce)ref.current?.startAnimation();},stop=()=>ref.current?.stopAnimation();
 return <button aria-label={label} title={label} aria-current={active?'page':undefined} onClick={onClick}>{children}<span className="s-nav-icon"><Icon ref={ref} size={20} isAnimated={false} duration={.6}/></span><span>{label}</span></button>;
}
