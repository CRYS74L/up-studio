// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {transitionPage,cancelPageTransition} from './page-transition';
import {LAB_DEFAULTS,setLabSettings} from './lab-settings';
vi.mock('../fonts',()=>({chartFont:'test',loadFonts:()=>Promise.resolve()}));
vi.mock('./query-client',()=>({client:{getQueryData:()=>undefined,fetchQuery:()=>new Promise(()=>{}),prefetchQuery:()=>Promise.resolve()}}));
vi.mock('./page-snapshot',()=>({warmSnapshotStyles:()=>{},snapshotMotionLayer:(e:HTMLElement)=>e,capturePage:()=>{const old=document.createElement('div');old.className='s-route-snapshot';document.body.append(old);return old}}));
type Recorded={frames:Keyframe[];options:KeyframeAnimationOptions;startTime:number|null;finished:Promise<void>;cancel:()=>void;finish:()=>void};
let animations:Recorded[]=[];
beforeEach(()=>{
 vi.useFakeTimers();animations=[];
 setLabSettings(LAB_DEFAULTS);
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
 expect(update).toHaveBeenCalledOnce();expect(restore).toHaveBeenCalledOnce();expect(animations).toHaveLength(2);
 expect(animations[0].options.duration).toBe(520);
 expect(animations[0].options).toEqual(animations[1].options);expect(animations[0].startTime).toBe(animations[1].startTime);
 animations.forEach(a=>a.finish());await done;expect(document.querySelector('.s-route-snapshot')).toBeNull();
});
it('switches nested content from the right and cleans only its own animation styles',async()=>{
 const done=transitionPage(()=>{document.querySelector('.pane')!.innerHTML='Nested'},undefined,undefined,'x','.pane');
 expect(animations[0].frames[0].transform).toMatch(/^translateX\([1-9]/);
 expect(animations[0].frames[0].opacity).toBe(1);expect(animations[1].frames.at(-1)!.opacity).toBe(1);
 expect(animations[1].frames.at(-1)!.transform).toMatch(/^translateX\(-/);
 animations.forEach(a=>a.finish());await done;expect((document.querySelector('.pane') as HTMLElement).style.willChange).toBe('');expect(document.documentElement.dataset.routePhase).toBeUndefined();
});
it('a cancelled transition cannot remove the replacement transition or restore stale content',async()=>{
 const first=transitionPage(()=>{document.querySelector('.pane')!.textContent='First'});
 const second=transitionPage(()=>{document.querySelector('.pane')!.textContent='Latest'});
 await first;expect(document.querySelectorAll('.s-route-snapshot')).toHaveLength(1);expect(document.querySelector('.pane')!.textContent).toBe('Latest');
 animations.slice(2).forEach(a=>a.finish());await second;expect(document.querySelector('.s-route-snapshot')).toBeNull();
});
it.each(['x','y'] as const)('applies the editable curve and duration on the %s axis',async(axis)=>{
 setLabSettings({timing:'bezier',duration:450,curve:[.2,.2,.8,.8]});
 const done=transitionPage(()=>{},undefined,undefined,axis);
 expect(animations[0].options).toMatchObject({duration:450,easing:'cubic-bezier(0.2,0.2,0.8,0.8)'});
 animations.forEach(a=>a.finish());await done;
});

it.each([1,-1] as const)('keeps incoming horizontal content inside its stationary bounds (%s)',async(direction)=>{
 const pane=document.querySelector('.pane') as HTMLElement;pane.getBoundingClientRect=()=>({left:252,top:160,width:900,height:1000,right:1152,bottom:1160,x:252,y:160,toJSON:()=>{}});
 const done=transitionPage(()=>{},undefined,undefined,'x','.pane',direction);
 for(const frame of animations[0].frames){const dx=Number(String(frame.transform).match(/\(([-\d.]+)px/)![1]);const clip=String(frame.clipPath),insets=clip.match(/^inset\([^ ]+ ([\d.]+)px [-\d.]+px ([\d.]+)px\)$/);expect(insets).not.toBeNull();expect(dx+Number(insets![2])).toBeGreaterThanOrEqual(-.001);expect(dx+900-Number(insets![1])).toBeLessThanOrEqual(900.001)}
 animations.forEach(a=>a.finish());await done;
});
it('lets a page slide behind the sidebar and clips only at the viewport edge',async()=>{
 const pane=document.querySelector('.pane') as HTMLElement;pane.getBoundingClientRect=()=>({left:252,top:160,width:900,height:1000,right:1152,bottom:1160,x:252,y:160,toJSON:()=>{}});
 Object.defineProperty(document.documentElement,'clientWidth',{configurable:true,value:1280});
 const done=transitionPage(()=>{(document.querySelector('.s-route-snapshot') as HTMLElement).dataset.viewportSlide='true'},undefined,undefined,'x','.pane',-1);
 const positions=animations[0].frames.map(frame=>({x:252+Number(String(frame.transform).match(/\(([-\d.]+)px/)![1]),left:Number(String(frame.clipPath).match(/ ([\d.]+)px\)$/)![1])}));
 expect(Math.abs(Number(String(animations[1].frames.at(-1)!.transform).match(/\(([-\d.]+)px/)![1]))).toBeGreaterThanOrEqual(1280);expect(positions.some(p=>p.x>=0&&p.x<200&&p.left===0)).toBe(true);expect(positions.every(p=>p.x+p.left>=-.001)).toBe(true);
 animations.forEach(a=>a.finish());await done;
});

it('does not crop tall page content at the initial viewport bottom during a slide',async()=>{
 const main=document.querySelector('.s-main') as HTMLElement;main.getBoundingClientRect=()=>({top:32,left:220,right:1280,bottom:2432,width:1060,height:2400,x:220,y:32,toJSON:()=>({})});
 const done=transitionPage(()=>{},undefined,undefined,'x');
 expect(String(animations[0].frames[0].clipPath)).toMatch(/^inset\(-[0-9.]+px [0-9.]+px -[0-9.]+px/);
 animations.forEach(a=>a.finish());await done;
});

it('clips the entering vertical page to its first viewport instead of exposing later rows',async()=>{
 const main=document.querySelector('.s-main') as HTMLElement;main.getBoundingClientRect=()=>({top:32,left:220,right:1280,bottom:2432,width:1060,height:2400,x:220,y:32,toJSON:()=>({})});
 const done=transitionPage(()=>{},undefined,undefined,'y',undefined,-1);
 expect(main.style.clipPath).toBe('inset(-32px 0 '+Math.max(0,2432-innerHeight)+'px 0)');
 animations.forEach(a=>a.finish());await done;expect(main.style.clipPath).toBe('');
});

it('preserves the outgoing pane crop when the destination has a taller toolbar',async()=>{
 const pane=document.querySelector('.pane') as HTMLElement;
 pane.className='s-analysis-topic-body';
 pane.getBoundingClientRect=()=>({top:140,left:250,right:1050,bottom:740,width:800,height:600,x:250,y:140,toJSON:()=>({})});
 const done=transitionPage(()=>{},undefined,undefined,'x','.s-analysis-topic-body');
 const snapshot=document.querySelector('.s-route-snapshot') as HTMLElement;
 expect(snapshot.style.clipPath).toBe('');
 animations.forEach(a=>a.finish());await done;
});
