import { useEffect, useRef } from 'react';
import { echarts } from '../charts';

// Theme only chart typography and chrome; series/item colors carry metric identity.
function themedOption(option: any, element: HTMLElement | null) {
  const style=getComputedStyle(element??document.documentElement);
  const text=style.getPropertyValue('--text').trim()||'#242937',muted=style.getPropertyValue('--muted').trim()||text;
  const line=style.getPropertyValue('--line').trim()||'#e9ecf2',surface=style.getPropertyValue('--surface').trim()||'#fff';
  const map=(value:any,fn:(item:any)=>any)=>Array.isArray(value)?value.map(fn):value?fn(value):value;
  const label=(value:any)=>({...value,color:text});
  const axis=(value:any)=>({...value,nameTextStyle:label(value.nameTextStyle),axisLabel:{...value.axisLabel,color:value.type==='category'?text:muted},axisLine:{...value.axisLine,lineStyle:{...value.axisLine?.lineStyle,color:line}},splitLine:{...value.splitLine,lineStyle:{...value.splitLine?.lineStyle,color:line}}});
  const radial=Array.isArray(option.series)&&option.series.every((s:any)=>['pie','map'].includes(s.type));
  return {...option,grid:radial?undefined:option.grid,textStyle:label(option.textStyle),xAxis:radial?undefined:map(option.xAxis,axis),yAxis:radial?undefined:map(option.yAxis,axis),
    legend:map(option.legend,(v:any)=>({...v,textStyle:label(v.textStyle),inactiveColor:muted})),
    tooltip:map(option.tooltip,(v:any)=>({...v,backgroundColor:surface,borderColor:line,textStyle:label(v.textStyle)})),
    series:map(option.series,(v:any)=>({...v,...(v.type==='pie'?{padAngle:1,minAngle:2.5,itemStyle:{...v.itemStyle,borderRadius:7},data:v.data?.map((d:any)=>({...d,itemStyle:{...d.itemStyle,borderRadius:7}}))}:{}),...(v.type==='line'?{smooth:.5,smoothMonotone:'x',connectNulls:false,areaStyle:{opacity:1,color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:(v.lineStyle?.color??v.itemStyle?.color??'#FF73AC')+'55'},{offset:1,color:(v.lineStyle?.color??v.itemStyle?.color??'#FF73AC')+'00'}]}}}:{}),label:label(v.label),endLabel:label(v.endLabel),emphasis:{...v.emphasis,label:label(v.emphasis?.label)},markLine:v.markLine?{...v.markLine,label:label(v.markLine.label)}:v.markLine}))};
}

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
    const resolved=themedOption(current.option,element.current);
    const x=resolved.xAxis;if(x?.type==='category'&&x.axisLabel?.interval===0&&x.data?.length){const width=(element.current?.clientWidth??800)-110;const tight=width/x.data.length<30;x.axisLabel={...x.axisLabel,hideOverlap:false,showMinLabel:true,showMaxLabel:true,rotate:tight?-90:x.axisLabel.rotate};}
    chart.setOption({ ...resolved, animation: !reduced && current.option.animation !== false, animationDurationUpdate: reduced ? 0 : 300 }, { notMerge: true });
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
      else { instance.current.resize(); update(); }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element.current);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    resize();
    reduced.addEventListener('change', update);
    const themeObserver=new MutationObserver(update);
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return () => { live = false; observer.disconnect(); themeObserver.disconnect(); reduced.removeEventListener('change', update); instance.current?.dispose(); instance.current = null; bound.current = {}; };
  }, []);
  useEffect(update, [option, events]);
  const category=option.xAxis?.type==='category'&&option.xAxis?.axisLabel?.interval===0;const count=category?option.xAxis.data?.length??0:0;
  return <div className={'s-chart-viewport'+(className==='s-rank-chart'?' s-chart-no-scroll':'')}><div ref={element} style={count>10?{minWidth:count*30}:undefined} className={className} role="img" aria-label={option.accessibleLabel ?? '交互数据图表，详细数值可在对应稿件中查看'} /></div>;
}
