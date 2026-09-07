export type Theme = 'light' | 'dark';
export function getInitialTheme(): Theme {
  const stored = localStorage.getItem('insights-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme; localStorage.setItem('insights-theme', theme); document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#19191b' : '#f5f5f7'); }
let active: { skipTransition: () => void } | undefined;
let revision=0;
export async function transitionTheme(theme: Theme, _origin?: { x: number; y: number }) {
  const current=++revision;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void>; skipTransition: () => void } };
  active?.skipTransition();
  if (!doc.startViewTransition || reduce) { applyTheme(theme); return; }
  const transition = doc.startViewTransition(() => {if(current===revision)applyTheme(theme);});
  active = transition;
  try { await transition.ready; await transition.finished; } catch { /* A new user action interrupted the previous transition. */ }
  finally {if(active===transition)active=undefined;}
}
