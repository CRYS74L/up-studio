import {useRef} from 'react';
import {useReducedMotion} from 'motion/react';
import {RefreshCwIcon} from '@animateicons/react/lucide';
export function SyncButton({pending,onClick}:{pending:boolean;onClick:()=>void}){
 const ref=useRef<{startAnimation:()=>void;stopAnimation:()=>void}>(null),reduce=useReducedMotion();
 const start=()=>{if(!reduce)ref.current?.startAnimation();};
 return <button className="s-secondary s-sync" disabled={pending} onMouseEnter={start} onMouseLeave={()=>ref.current?.stopAnimation()} onFocus={start} onBlur={()=>ref.current?.stopAnimation()} onClick={()=>{start();onClick();}}><span className={pending?'spin':''}><RefreshCwIcon ref={ref} size={20} isAnimated={!reduce} duration={.6}/></span>{pending?'同步中':'同步'}</button>;
}
