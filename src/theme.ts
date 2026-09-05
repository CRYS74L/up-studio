export type Theme = 'light' | 'dark';
export function getInitialTheme(): Theme {
  const stored = localStorage.getItem('insights-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme; localStorage.setItem('insights-theme', theme); document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101014' : '#f2f2f7'); }
let active: { skipTransition: () => void } | undefined;
export async function transitionTheme(theme: Theme, _origin: { x: number; y: number }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; skipTransition: () => void } };
  active?.skipTransition();
  if (!doc.startViewTransition || reduce) { applyTheme(theme); return; }
  const transition = doc.startViewTransition(() => applyTheme(theme));
  active = transition;
  try { await transition.ready; } catch { /* A new user action interrupted the previous transition. */ }
}
