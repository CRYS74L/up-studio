import {useEffect,useState} from 'react';
import {Sun,Moon,ArrowUp} from 'lucide-react';
import {motion,AnimatePresence} from 'motion/react';
import type {Theme} from '../theme';
export function ThemeSwitch({value,onChange}:{value:Theme;onChange:(theme:Theme)=>void}){
 return <div className="s-theme-switch" role="group" aria-label="颜色模式"><motion.span className="s-theme-thumb" initial={false} animate={{x:value==='dark'?38:0}} transition={{type:'spring',stiffness:420,damping:34}}/>{(['light','dark'] as const).map(t=><button key={t} aria-label={t==='light'?'浅色模式':'深色模式'} aria-pressed={value===t} onClick={()=>onChange(t)}>{t==='light'?<Sun/>:<Moon/>}</button>)}</div>;
}
export function BackToTop(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{const update=()=>setVisible(scrollY>240);update();addEventListener('scroll',update,{passive:true});return()=>removeEventListener('scroll',update)},[]);
 return <AnimatePresence>{visible&&<motion.button className="s-icon s-back-top" aria-label="回到顶部" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{type:'tween',duration:.2}} onClick={()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}><ArrowUp/></motion.button>}</AnimatePresence>;
}
