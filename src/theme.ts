import {cancelPageTransition} from './studio/page-transition';
import {captureTheme} from './studio/theme-snapshot';
import {flushSync} from 'react-dom';
export type Theme = 'light' | 'dark';
export function getInitialTheme(): Theme {
 const stored=localStorage.getItem('insights-theme');return stored==='light'||stored==='dark'?stored:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}
export function applyTheme(theme:Theme){document.documentElement.dataset.theme=theme;localStorage.setItem('insights-theme',theme);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#19191b':'#f5f5f7');}
let stop:(()=>void)|undefined;
export async function transitionTheme(theme:Theme,origin?:{x:number;y:number},commit?:()=>void){
 cancelPageTransition();stop?.();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,old=reduced?null:captureTheme();
 if(commit)flushSync(commit);applyTheme(theme);document.dispatchEvent(new Event('up:prepare-view'));
 if(!old)return;
 const center=origin??{x:innerWidth/2,y:30},feather=Math.max(40,Math.min(96,Math.min(innerWidth,innerHeight)*.08)),radius=Math.hypot(Math.max(center.x,innerWidth-center.x),Math.max(center.y,innerHeight-center.y))+feather;
 old.style.setProperty('--reveal-x',center.x+'px');old.style.setProperty('--reveal-y',center.y+'px');old.style.setProperty('--reveal-feather',feather+'px');old.style.setProperty('--reveal-radius','0px');
 old.style.maskImage='radial-gradient(circle at var(--reveal-x) var(--reveal-y),transparent max(0px,calc(var(--reveal-radius) - var(--reveal-feather))),#000 var(--reveal-radius))';
 const animation=old.animate({'--reveal-radius':['0px',radius+'px']},{duration:480,easing:'cubic-bezier(.3,.12,.4,1)',fill:'both'});
 const clean=()=>{document.removeEventListener('up:route-motion',clean);animation.cancel();old.remove()};stop=clean;document.addEventListener('up:route-motion',clean,{once:true});
 try{await animation.finished}catch{}finally{clean();if(stop===clean)stop=undefined}
}
