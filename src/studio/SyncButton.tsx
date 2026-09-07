import {useRef} from 'react';
import {useReducedMotion} from 'motion/react';
import {RefreshCwIcon} from '@animateicons/react/lucide';
export function SyncButton({pending,onClick,iconOnly=false,label}:{pending:boolean;onClick:()=>void;iconOnly?:boolean;label?:string}){
 const ref=useRef<{startAnimation:()=>void;stopAnimation:()=>void}>(null),reduce=useReducedMotion();
 const start=()=>{if(!reduce)ref.current?.startAnimation();};
 return <button className={iconOnly?"s-icon s-sync":"s-secondary s-sync"} aria-label={label} disabled={pending} onMouseEnter={start} onMouseLeave={()=>ref.current?.stopAnimation()} onFocus={start} onBlur={()=>ref.current?.stopAnimation()} onClick={onClick}><span className={pending?'spin':''}><RefreshCwIcon ref={ref} size={20} isAnimated={!reduce} duration={.45}/></span>{!iconOnly&&(pending?'同步中':'同步')}</button>;
}
