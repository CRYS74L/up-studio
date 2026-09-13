// @vitest-environment jsdom
import {beforeEach,expect,it,vi} from 'vitest';
import {transitionTheme} from './theme';
vi.mock('./studio/page-transition',()=>({cancelPageTransition:vi.fn()}));
vi.mock('./studio/theme-snapshot',()=>({captureTheme:()=>{const el=document.createElement('div');el.className='s-theme-snapshot';el.inert=true;el.style.pointerEvents='none';document.body.append(el);return el}}));
let animations:Array<{finished:Promise<void>;cancel:ReturnType<typeof vi.fn>;finish:()=>void}>;
beforeEach(()=>{animations=[];vi.stubGlobal('matchMedia',()=>({matches:false}));Object.defineProperty(Element.prototype,'animate',{configurable:true,value:vi.fn(()=>{let finish!:()=>void;const finished=new Promise<void>(r=>finish=r);const animation={finished,finish,cancel:vi.fn(finish)};animations.push(animation);return animation})})});
it('applies every rapid selection immediately without a native capture or input lock',async()=>{
 const a=transitionTheme('dark');expect(document.documentElement.dataset.theme).toBe('dark');
 const b=transitionTheme('light');expect(document.documentElement.dataset.theme).toBe('light');expect(animations[0].cancel).toHaveBeenCalled();
 expect(document.querySelectorAll('.s-theme-snapshot')).toHaveLength(1);expect((document.querySelector('.s-theme-snapshot') as HTMLElement).style.pointerEvents).toBe('none');
 await a;expect(document.querySelectorAll('.s-theme-snapshot')).toHaveLength(1);animations[1].finish();await b;expect(document.querySelector('.s-theme-snapshot')).toBeNull();vi.unstubAllGlobals();
});
it('removes the theme snapshot immediately when page navigation starts',async()=>{
 const done=transitionTheme('dark');expect(document.querySelector('.s-theme-snapshot')).not.toBeNull();document.dispatchEvent(new Event('up:route-motion'));expect(document.querySelector('.s-theme-snapshot')).toBeNull();await done;expect(animations[0].cancel).toHaveBeenCalled();vi.unstubAllGlobals();
});
