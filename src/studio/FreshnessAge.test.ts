import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {SyncFreshness} from './FreshnessAge';
// @vitest-environment jsdom
import {createElement,Profiler} from 'react';
import {act,render,cleanup} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {FreshnessAge} from './FreshnessAge';
it('updates a minute boundary without refetching or rerendering the page',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-14T00:00:58Z'));let renders=0;
 function Page(){renders++;return createElement('span',null,createElement(FreshnessAge,{capturedAt:'2026-09-13T23:59:00Z'}))}
 const view=render(createElement(Page));expect(view.container.textContent?.replace(/\s/g,'')).toBe('1分钟前');act(()=>vi.advanceTimersByTime(2000));expect(view.container.textContent?.replace(/\s/g,'')).toBe('2分钟前');expect(renders).toBe(1);cleanup();vi.useRealTimers();
});

it('refreshes both displayed timestamps when the shared completed run changes',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{staleTime:Infinity,retry:false}}});
 client.setQueryData(['acquisition-history',''],{runs:[{status:'success',finished_at:new Date(Date.now()-600000).toISOString()}]});
 const view=render(createElement(QueryClientProvider,{client},createElement('div',null,createElement(SyncFreshness),createElement(SyncFreshness))));
 expect(view.container.textContent).toContain('10');
 await act(async()=>{client.setQueryData(['acquisition-history',''],{runs:[{status:'success',finished_at:new Date().toISOString()}]});await new Promise(r=>setTimeout(r,20))});
 expect(view.container.textContent).not.toContain('10');cleanup();client.clear();
});

it('only rerenders when the displayed age changes',()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-28T00:00:00Z'));Object.defineProperty(document,'hidden',{configurable:true,value:false});let renders=0;const view=render(createElement(Profiler,{id:'age',onRender:()=>{renders++}},createElement(FreshnessAge,{capturedAt:'2026-09-28T00:00:00Z'})));const initial=renders;act(()=>vi.advanceTimersByTime(30000));expect(renders).toBe(initial);expect(view.container.textContent).toBe('刚刚');act(()=>vi.advanceTimersByTime(30000));expect(view.container.textContent).toContain('1');expect(renders).toBe(initial+1);cleanup();vi.useRealTimers()});
