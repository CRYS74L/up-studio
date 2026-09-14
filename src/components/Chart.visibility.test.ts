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
