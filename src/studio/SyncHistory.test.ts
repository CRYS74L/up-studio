// @vitest-environment jsdom
import {createElement} from 'react';import {render,cleanup,fireEvent} from '@testing-library/react';import {it,expect,vi} from 'vitest';import {SyncHistory} from './SyncHistory';
vi.mock('./controls',()=>({Popover:()=>null}));
it('animates both date directions without stretching record cells',()=>{
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('matchMedia',()=>({matches:false}));Object.defineProperty(document,'timeline',{configurable:true,value:{currentTime:20}});
 vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockReturnValue(500);
 const animate=vi.fn(()=>({finished:new Promise(()=>{}),cancel:vi.fn(),startTime:0}));Object.defineProperty(Element.prototype,'animate',{configurable:true,value:animate});
 const props={today:'2026-09-20',firstDay:'2026-09-01',onDayChange:vi.fn()};const runs=(day:string)=>[{id:day,status:'success',started_at:day+'T02:00:00Z'}];
 const view=render(createElement(SyncHistory,{...props,day:'2026-09-20',runs:runs('2026-09-20')}));view.rerender(createElement(SyncHistory,{...props,day:'2026-09-19',runs:runs('2026-09-19')}));
 expect(animate).toHaveBeenCalledTimes(2);expect((animate.mock.calls as any)[0][0][0].transform).toBe('translateX(-500px)');expect(view.container.querySelector('rect')?.getAttribute('width')).toBe('5');
 view.rerender(createElement(SyncHistory,{...props,day:'2026-09-20',runs:runs('2026-09-20')}));expect((animate.mock.calls as any)[2][0][0].transform).toBe('translateX(500px)');const many=Array.from({length:100},(_,i)=>({id:'run-'+i,status:'success',started_at:'2026-09-20T02:00:00Z'}));
 view.rerender(createElement(SyncHistory,{...props,day:'2026-09-20',runs:many}));fireEvent.click(view.getByRole('button',{name:'第 2 页同步记录'}));expect(view.getByRole('button',{name:'第 2 页同步记录'}).getAttribute('aria-current')).toBe('page');
 view.rerender(createElement(SyncHistory,{...props,day:'2026-09-19',runs:runs('2026-09-19')}));view.rerender(createElement(SyncHistory,{...props,day:'2026-09-20',runs:many}));expect(view.getByRole('button',{name:'第 1 页同步记录'}).getAttribute('aria-current')).toBe('page');
 cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();
});
