// @vitest-environment jsdom
import {createElement} from 'react';
import {act,render,cleanup} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {FreshnessAge} from './FreshnessAge';
it('updates a minute boundary without refetching or rerendering the page',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-14T00:00:58Z'));let renders=0;
 function Page(){renders++;return createElement('span',null,createElement(FreshnessAge,{capturedAt:'2026-09-13T23:59:00Z'}))}
 const view=render(createElement(Page));expect(view.container.textContent?.replace(/\s/g,'')).toBe('1分钟前');act(()=>vi.advanceTimersByTime(2000));expect(view.container.textContent?.replace(/\s/g,'')).toBe('2分钟前');expect(renders).toBe(1);cleanup();vi.useRealTimers();
});
