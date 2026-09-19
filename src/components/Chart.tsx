import {spaceNumbers} from '../typography/spacing';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { echarts } from '../charts';
import { chartFont, loadFonts } from '../fonts';
import {queueRender,cancelRender} from '../studio/render-queue';

const chartPictures=new Map<string,string>();
// Theme only chart typography and chrome; series/item colors carry metric identity.
function themedOption(option: any, element: HTMLElement | null) {
  const style=getComputedStyle(element??document.documentElement);
  const text=style.getPropertyValue('--text').trim()||'#242937',muted=style.getPropertyValue('--muted').trim()||text;
  const line=style.getPropertyValue('--line').trim()||'#e9ecf2',surface=style.getPropertyValue('--surface').trim()||'#fff';
  const map=(value:any,fn:(item:any)=>any)=>Array.isArray(value)?value.map(fn):value?fn(value):value;
  const fmt=(fn:any)=>(...args:any[])=>spaceNumbers(String(typeof fn==='function'?fn(...args):typeof fn==='string'?fn.replace('{value}',String(args[0])):args[0]));
  const label=(value:any)=>({...value,color:text,...(value?.formatter?{formatter:fmt(value.formatter)}:{})});
  const axis=(value:any)=>({...value,nameTextStyle:label(value.nameTextStyle),name:typeof value.name==='string'?spaceNumbers(value.name):value.name,axisLabel:{...value.axisLabel,formatter:fmt(value.axisLabel?.formatter),color:value.type==='category'?text:muted},axisLine:{...value.axisLine,lineStyle:{...value.axisLine?.lineStyle,color:line}},splitLine:{...value.splitLine,lineStyle:{...value.splitLine?.lineStyle,color:line}}});
  const radial=Array.isArray(option.series)&&option.series.every((s:any)=>['pie','map'].includes(s.type));
  return {...option,grid:radial?undefined:option.grid,textStyle:label(option.textStyle),xAxis:radial?undefined:map(option.xAxis,axis),yAxis:radial?undefined:map(option.yAxis,axis),
    legend:map(option.legend,(v:any)=>({...v,textStyle:label(v.textStyle),inactiveColor:muted,formatter:fmt(v.formatter)})),
    tooltip:map(option.tooltip,(v:any)=>({...v,backgroundColor:surface,borderColor:line,textStyle:label(v.textStyle),...(v.formatter?{formatter:fmt(v.formatter)}:{})})),
    series:map(option.series,(v:any)=>({...v,...(v.type==='pie'?{padAngle:1,minAngle:2.5,itemStyle:{...v.itemStyle,borderRadius:7},data:v.data?.map((d:any)=>({...d,itemStyle:{...d.itemStyle,borderRadius:7}}))}:{}),...(v.type==='line'?{symbol:'circle',lineStyle:{...v.lineStyle,color:v.lineStyle?.color??v.itemStyle?.color,width:v.lineStyle?.width??2.2},itemStyle:{...v.itemStyle,color:surface,borderColor:v.lineStyle?.color??v.itemStyle?.color,borderWidth:2},smooth:.5,smoothMonotone:'x',connectNulls:false,areaStyle:v.areaStyle??{opacity:.5,color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:(v.lineStyle?.color??v.itemStyle?.color??'#FF73AC')+'28'},{offset:1,color:(v.lineStyle?.color??v.itemStyle?.color??'#FF73AC')+'00'}]}}}:{}),label:label(v.label),endLabel:label(v.endLabel),emphasis:{...v.emphasis,label:label(v.emphasis?.label)},markLine:v.markLine?{...v.markLine,label:label(v.markLine.label)}:v.markLine}))};
}

export function Chart({ option, className, events, animateChanges=false }: { option: any; className: string; animateChanges?:boolean; events?: Record<string, (p: any) => void> }) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<ReturnType<typeof echarts.init> | null>(null);
  const latest = useRef({ option, events });
  latest.current = { option, events };
  const bound = useRef<Record<string, (p: any) => void>>({});
  const dirty = useRef(true);
  const signature=useRef('');
  const schedule = useRef<() => void>(() => {});
  const update = () => {
    const chart = instance.current;
    if (!chart) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const current = latest.current;
    const resolved=themedOption(current.option,element.current);
    const available=element.current?.clientWidth??800;
    if(className==='s-combo-chart'&&available<500){
      const axes=resolved.yAxis as any[];
      const extra=Math.max(0,Math.ceil(axes.length/2)-1)*32;
      resolved.grid={...resolved.grid,left:40+extra,right:42+extra};
      resolved.yAxis=axes.map(a=>({...a,offset:Math.floor((a.offset??0)/54)*32,nameTextStyle:{...a.nameTextStyle,fontSize:10},axisLabel:{...a.axisLabel,fontSize:10}}));
    }
    const x=resolved.xAxis;if(x?.type==='category'&&x.axisLabel?.interval===0&&x.data?.length){const width=available-(Number(resolved.grid?.left)||50)-(Number(resolved.grid?.right)||25);const tight=width/x.data.length<30;const size=Math.max(8,Math.min(10,Math.floor(width/x.data.length)));x.axisLabel={...x.axisLabel,hideOverlap:false,showMinLabel:true,showMaxLabel:true,rotate:tight?-90:x.axisLabel.rotate,...(tight?{fontSize:size,lineHeight:size}:{})};}
    if(animateChanges){
      resolved.series=resolved.series?.map((series:any,index:number)=>({...series,id:series.id??'series-'+index}));
      for(const key of ['xAxis','yAxis'] as const){const axes=resolved[key];const normalize=(axis:any,index:number)=>({min:null,max:null,...axis,id:axis.id??key+'-'+index});resolved[key]=Array.isArray(axes)?axes.map(normalize):axes?normalize(axes,0):axes;}
    }
    const nextSignature=JSON.stringify({...resolved,tooltip:undefined});
    if(nextSignature!==signature.current){chart.setOption({...resolved,animation:!reduced&&document.documentElement.dataset.transitionKind!=='theme'&&current.option.animation!==false,animationDuration:650,animationDurationUpdate:450,animationEasingUpdate:'cubicInOut'},{notMerge:!animateChanges, ...(animateChanges?{replaceMerge:['series','xAxis','yAxis','dataZoom']}: {})});signature.current=nextSignature;}
    else chart.setOption({tooltip:resolved.tooltip});
    dirty.current=false;
    for (const [name, callback] of Object.entries(bound.current)) chart.off(name, callback);
    bound.current = current.events ?? {};
    for (const [name, callback] of Object.entries(bound.current)) chart.on(name, callback);
  };
  useLayoutEffect(() => {
    if (!element.current) return;
    const pictureKey=className+':'+(document.documentElement.dataset.theme??'light')+':'+JSON.stringify({...latest.current.option,tooltip:undefined});
    const picture=chartPictures.get(pictureKey);if(picture){element.current.innerHTML='<div style="position:relative;width:100%;height:100%;overflow:hidden">'+picture+'</div>';element.current.dataset.chartPreview="true";}
    let live = true;
    let fontsReady = false;
    let visible = false;
    let width = 0, height = 0;
    const resize = () => {
      const bounds=element.current?.getBoundingClientRect();visible=!!bounds&&bounds.bottom>0&&bounds.top<innerHeight+120;
      if (!live || !fontsReady || !visible || !element.current?.clientWidth || !element.current.clientHeight) return;
      if(picture&&!instance.current&&document.documentElement.dataset.transitionKind==='page')return;
      if (!instance.current) { element.current.innerHTML='';delete element.current.dataset.chartPreview;instance.current = echarts.init(element.current,undefined,{renderer:'svg'});instance.current.on('finished',()=>document.dispatchEvent(new Event('up:chart-painted')));element.current.querySelector('svg')?.setAttribute('data-chart-renderer','svg'); update(); }
      else if(width!==element.current.clientWidth||height!==element.current.clientHeight) { instance.current.resize(); update(); }
      else if(dirty.current)update();
      width=element.current.clientWidth;height=element.current.clientHeight;
    };
    schedule.current=()=>{dirty.current=true;queueRender(element,()=>{if(!live)return;resize();});};
    const observer = new ResizeObserver(()=>queueRender(element,resize));
    observer.observe(element.current);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)queueRender(element,resize);},{rootMargin:'120px'});
    intersection.observe(element.current);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    loadFonts(chartFont).then(() => { fontsReady = true; queueRender(element,resize); }).catch(() => {
      if (live && element.current) element.current.textContent = '图表字体加载失败，请刷新页面。';
    });
    const prepare=()=>{const r=element.current?.getBoundingClientRect();if(r&&r.bottom>0&&r.top<innerHeight){visible=true;dirty.current=true;cancelRender(element);resize();}};document.addEventListener('up:prepare-view',prepare);
    const settled=()=>queueRender(element,resize);document.addEventListener('up:route-settled',settled);window.addEventListener('scroll',settled,{passive:true});
    const refresh=()=>schedule.current();
    reduced.addEventListener('change', refresh);
    const themeObserver=new MutationObserver(refresh);
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return () => { const svg=element.current?.querySelector('svg[data-chart-renderer]');if(svg){chartPictures.set(className+':'+(document.documentElement.dataset.theme??'light')+':'+JSON.stringify({...latest.current.option,tooltip:undefined}),svg.outerHTML);if(chartPictures.size>24)chartPictures.delete(chartPictures.keys().next().value!);}document.removeEventListener('up:route-settled',settled);window.removeEventListener('scroll',settled);live = false; document.removeEventListener('up:prepare-view',prepare);cancelRender(element);intersection.disconnect();observer.disconnect(); themeObserver.disconnect(); reduced.removeEventListener('change', refresh); instance.current?.dispose(); instance.current = null; signature.current=""; bound.current = {}; };
  }, []);
  useEffect(()=>schedule.current(), [option, events]);
  const category=option.xAxis?.type==='category'&&option.xAxis?.axisLabel?.interval===0;const count=category?option.xAxis.data?.length??0:0;const minimum=count*9+(Number(option.grid?.left)||50)+(Number(option.grid?.right)||25);
  return <div className={'s-chart-viewport'+(className==='s-rank-chart'?' s-chart-no-scroll':'')}><div ref={element} style={count>10&&className!=='s-combo-chart'?{minWidth:minimum}:undefined} className={className} role="img" aria-label={option.accessibleLabel ?? '交互数据图表，详细数值可在对应稿件中查看'} /></div>;
}
