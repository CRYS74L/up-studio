// @vitest-environment jsdom
import {createElement,useRef} from 'react';
import {render,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {useSelectionBox} from './use-selection-box';
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
it('changing selection reuses geometry without another layout read',()=>{
 let reads=0;for(const name of ['offsetLeft','offsetTop','offsetWidth','offsetHeight'] as const)vi.spyOn(HTMLElement.prototype,name,'get').mockImplementation(()=>{reads++;return 20});
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('cancelAnimationFrame',vi.fn());
 function Control({selected}:{selected:string}){const ref=useRef<HTMLDivElement>(null);useSelectionBox(ref,'[aria-pressed=true]',selected);return createElement('div',{ref},['a','b'].map(id=>createElement('button',{key:id,'aria-pressed':id===selected},id)))}
 const view=render(createElement(Control,{selected:'a'}));const measured=reads;expect(measured).toBeGreaterThan(0);view.rerender(createElement(Control,{selected:'b'}));expect(reads).toBe(measured);
});
