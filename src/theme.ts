import {cancelPageTransition} from './studio/page-transition';
import {flushSync} from 'react-dom';
export type Theme = 'light' | 'dark';
export function getInitialTheme(): Theme {
  const stored = localStorage.getItem('insights-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme; localStorage.setItem('insights-theme', theme); document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#19191b' : '#f5f5f7'); }
let active: { skipTransition: () => void } | undefined;
let revision=0;
export async function transitionTheme(theme: Theme, origin?: { x: number; y: number }, commit?:()=>void) {
  cancelPageTransition();
  const current=++revision;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void>; skipTransition: () => void } };
  active?.skipTransition();
  if (!doc.startViewTransition || reduce) { if(commit)flushSync(commit);applyTheme(theme); return; }
  const center=origin??{x:innerWidth/2,y:30};
  const feather=Math.max(40,Math.min(96,Math.min(innerWidth,innerHeight)*.08));
  document.documentElement.style.setProperty('--reveal-x',center.x+'px');document.documentElement.style.setProperty('--reveal-y',center.y+'px');document.documentElement.style.setProperty('--reveal-feather',feather+'px');
  const radius=Math.hypot(Math.max(center.x,innerWidth-center.x),Math.max(center.y,innerHeight-center.y));
  document.documentElement.dataset.transitionKind='theme';
  const transition = doc.startViewTransition(() => {if(current===revision){if(commit)flushSync(commit);applyTheme(theme);document.dispatchEvent(new Event('up:prepare-view'));}});
  active = transition;
  try { await transition.ready;document.documentElement.animate({'--reveal-radius':['0px',`${radius+feather}px`]},{duration:520,easing:'cubic-bezier(.23,1,.32,1)',pseudoElement:'::view-transition-new(root)',fill:'both'});await transition.finished; } catch { /* A new user action interrupted the previous transition. */ }
  finally {if(active===transition){active=undefined;if(document.documentElement.dataset.transitionKind==='theme')delete document.documentElement.dataset.transitionKind;}}
}
