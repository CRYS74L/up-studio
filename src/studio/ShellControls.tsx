import {SegmentedControl} from './controls';
import {useEffect,useState} from 'react';
import {Sun,Moon,ArrowUp} from 'lucide-react';
import {motion,AnimatePresence} from 'motion/react';
import type {Theme} from '../theme';
export function ThemeSwitch({value,onChange}:{value:Theme;onChange:(theme:Theme,origin:{x:number;y:number})=>void}){
 return <div className="s-theme-anchor" onPointerDown={e=>{e.currentTarget.dataset.x=String(e.clientX);e.currentTarget.dataset.y=String(e.clientY)}}><SegmentedControl className="s-theme-switch" size="compact" label="颜色模式" value={value} items={[{value:'light',label:'浅色模式',content:<Sun/>},{value:'dark',label:'深色模式',content:<Moon/>}]} onChange={v=>{const el=document.querySelector('.s-theme-anchor')!,r=el.getBoundingClientRect();onChange(v as Theme,{x:r.left+r.width/2,y:r.top+r.height/2})}}/></div>;
}
export function BackToTop(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{const update=()=>setVisible(scrollY>240);update();addEventListener('scroll',update,{passive:true});return()=>removeEventListener('scroll',update)},[]);
 return <AnimatePresence>{visible&&<motion.button className="s-icon s-back-top" aria-label="回到顶部" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{type:'tween',duration:.2}} onClick={()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}><ArrowUp/></motion.button>}</AnimatePresence>;
}
