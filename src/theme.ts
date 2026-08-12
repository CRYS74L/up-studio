export type Theme = 'light' | 'dark';
export function getInitialTheme(): Theme {
  const stored = localStorage.getItem('insights-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function applyTheme(theme: Theme) { document.documentElement.dataset.theme = theme; localStorage.setItem('insights-theme', theme); }
export async function transitionTheme(theme: Theme, origin: { x: number; y: number }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reduce) { applyTheme(theme); return; }
  const transition = doc.startViewTransition(() => applyTheme(theme));
  await transition.ready;
  const radius = Math.hypot(Math.max(origin.x, innerWidth-origin.x), Math.max(origin.y, innerHeight-origin.y));
  document.documentElement.animate({ clipPath:[`circle(0 at ${origin.x}px ${origin.y}px)`,`circle(${radius}px at ${origin.x}px ${origin.y}px)`] }, { duration:620, easing:'cubic-bezier(.22,1,.36,1)', pseudoElement:'::view-transition-new(root)' });
}

