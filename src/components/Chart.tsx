import { useEffect, useRef } from 'react';
import { echarts } from '../charts';

export function Chart({ option, className, events }: { option: any; className: string; events?: Record<string, (p: any) => void> }) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<ReturnType<typeof echarts.init> | null>(null);
  const latest = useRef({ option, events });
  latest.current = { option, events };
  const bound = useRef<Record<string, (p: any) => void>>({});
  const update = () => {
    const chart = instance.current;
    if (!chart) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const current = latest.current;
    chart.setOption({ ...current.option, animation: !reduced && current.option.animation !== false, animationDurationUpdate: reduced ? 0 : 300 }, { notMerge: true });
    for (const [name, callback] of Object.entries(bound.current)) chart.off(name, callback);
    bound.current = current.events ?? {};
    for (const [name, callback] of Object.entries(bound.current)) chart.on(name, callback);
  };
  useEffect(() => {
    if (!element.current) return;
    let live = true;
    const resize = () => {
      if (!live || !element.current?.clientWidth || !element.current.clientHeight) return;
      if (!instance.current) { instance.current = echarts.init(element.current); update(); }
      else instance.current.resize();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element.current);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    resize();
    reduced.addEventListener('change', update);
    return () => { live = false; observer.disconnect(); reduced.removeEventListener('change', update); instance.current?.dispose(); instance.current = null; bound.current = {}; };
  }, []);
  useEffect(update, [option, events]);
  return <div ref={element} className={className} role="img" aria-label={option.accessibleLabel ?? '交互数据图表，详细数值可在对应稿件中查看'} />;
}
