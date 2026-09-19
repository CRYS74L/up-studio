// @vitest-environment jsdom
import {createElement} from 'react';
import {it,expect,vi} from 'vitest';
import {render,act,cleanup} from '@testing-library/react';
import {Chart} from './Chart';
const mocks=vi.hoisted(()=>({init:vi.fn(()=>({setOption:vi.fn(),on:vi.fn(),off:vi.fn(),resize:vi.fn(),dispose:vi.fn()}))}));
vi.mock('../charts',()=>({echarts:{init:mocks.init}}));
vi.mock('../fonts',()=>({chartFont:'sans-serif',loadFonts:()=>Promise.resolve()}));
vi.mock('../studio/render-queue',()=>({queueRender:(_key:any,job:()=>void)=>job(),cancelRender:()=>{}}));
it('rechecks geometry after a transition even if intersection visibility stayed false',async()=>{
 let top=2000;
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(()=>({top,bottom:top+300,left:0,right:600,width:600,height:300,x:0,y:top,toJSON:()=>({})}));
 vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockReturnValue(600);vi.spyOn(HTMLElement.prototype,'clientHeight','get').mockReturnValue(300);
 render(createElement(Chart,{option:{series:[],xAxis:{},yAxis:{}},className:'test-chart'}));await act(async()=>{});expect(mocks.init).not.toHaveBeenCalled();
 top=100;await act(async()=>{document.dispatchEvent(new Event('up:route-settled'))});expect(mocks.init).toHaveBeenCalledOnce();cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();
});

it('animates changed series in the same chart instead of clearing its state',async()=>{
 mocks.init.mockClear();vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({top:0,bottom:300,left:0,right:600,width:600,height:300,x:0,y:0,toJSON:()=>({})});
 vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockReturnValue(600);vi.spyOn(HTMLElement.prototype,'clientHeight','get').mockReturnValue(300);
 const option={xAxis:{type:'category',data:['a','b']},yAxis:{},series:[{name:'fixed',type:'bar',data:[20,30]},{name:'seconds',type:'line',data:[40,50]}]};
 const view=render(createElement(Chart,{option,className:'animated-chart',animateChanges:true}));await act(async()=>{});
 view.rerender(createElement(Chart,{option:{...option,series:[option.series[0],{name:'bounce',type:'line',data:[5,8]}]},className:'animated-chart',animateChanges:true}));await act(async()=>{});
 expect(mocks.init).toHaveBeenCalledOnce();const calls=mocks.init.mock.results[0].value.setOption.mock.calls as any[];const updates=calls.filter(c=>c[0].series);const last=updates.at(-1);
 expect(last[1].notMerge).toBe(false);expect(last[0].animationDurationUpdate).toBe(450);expect(last[0].series[1].id).toBe(updates[0][0].series[1].id);expect(last[0].series[0].data).toEqual([20,30]);expect(last[0].series[1].data).toEqual([5,8]);cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();
});
