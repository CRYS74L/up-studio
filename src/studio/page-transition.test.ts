// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {transitionPage,cancelPageTransition} from './page-transition';
vi.mock('../fonts',()=>({chartFont:'test',loadFonts:()=>Promise.resolve()}));
vi.mock('./query-client',()=>({client:{getQueryData:()=>undefined,fetchQuery:()=>new Promise(()=>{}),prefetchQuery:()=>Promise.resolve()}}));
vi.mock('./page-snapshot',()=>({warmSnapshotStyles:()=>{},capturePage:()=>{const old=document.createElement('div');old.className='s-route-snapshot';document.body.append(old);return old}}));
type Recorded={frames:Keyframe[];options:KeyframeAnimationOptions;startTime:number|null;finished:Promise<void>;cancel:()=>void;finish:()=>void};
let animations:Recorded[]=[];
beforeEach(()=>{
 vi.useFakeTimers();animations=[];
 document.body.innerHTML='<div class="studio"><main class="s-main"><section class="pane">Old</section></main></div>';
 vi.stubGlobal('matchMedia',()=>({matches:false}));
 Object.defineProperty(document,'timeline',{configurable:true,value:{currentTime:20}});
 vi.stubGlobal('requestAnimationFrame',vi.fn());
 Object.defineProperty(Element.prototype,'animate',{configurable:true,value:vi.fn((frames:Keyframe[],options:KeyframeAnimationOptions)=>{let finish!:()=>void;const finished=new Promise<void>(r=>{finish=r});const a={frames,options,finished,startTime:null,cancel:finish,finish};animations.push(a);return a})});
});
afterEach(()=>{cancelPageTransition();vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals()});
it('commits and starts motion in the click task even when every data request is pending',async()=>{
 const update=vi.fn(()=>{document.querySelector('.pane')!.textContent='New'}),restore=vi.fn();
 const done=transitionPage(update,{page:'videos',video:null,ids:[]},restore);
 expect(update).toHaveBeenCalledOnce();expect(restore).toHaveBeenCalledOnce();expect(animations).toHaveLength(3);
 expect(animations[2].options.duration).toBe(100);expect(animations[2].frames[1].transform).toBe('translateY(-8px)');
 expect(animations[0].options).toEqual(animations[1].options);expect(animations[0].startTime).toBe(animations[1].startTime);
 animations.forEach(a=>a.finish());await done;expect(document.querySelector('.s-route-snapshot')).toBeNull();
});
it('switches nested content from the right and cleans only its own animation styles',async()=>{
 const done=transitionPage(()=>{document.querySelector('.pane')!.innerHTML='Nested'},undefined,undefined,'x','.pane');
 expect(animations[0].frames[0].transform).toMatch(/^translateX\([1-9]/);
 expect(animations[0].frames[1].offset).toBe(animations[1].frames[1].offset);
 expect(animations[0].frames[1].opacity).toBe(1);expect(animations[1].frames[1].opacity).toBe(0);
 expect(animations[0].frames[0].easing).toBe('steps(1,end)');expect(animations[1].frames[0].easing).toBe('steps(1,end)');
 expect(animations[0].frames[2].opacity).toBe(1);
 animations.forEach(a=>a.finish());await done;expect((document.querySelector('.pane') as HTMLElement).style.willChange).toBe('');expect(document.documentElement.dataset.routePhase).toBeUndefined();
});
it('a cancelled transition cannot remove the replacement transition or restore stale content',async()=>{
 const first=transitionPage(()=>{document.querySelector('.pane')!.textContent='First'});
 const second=transitionPage(()=>{document.querySelector('.pane')!.textContent='Latest'});
 await first;expect(document.querySelectorAll('.s-route-snapshot')).toHaveLength(1);expect(document.querySelector('.pane')!.textContent).toBe('Latest');
 animations.slice(3).forEach(a=>a.finish());await second;expect(document.querySelector('.s-route-snapshot')).toBeNull();
});
