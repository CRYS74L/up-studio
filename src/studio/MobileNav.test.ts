// @vitest-environment jsdom
import {createElement} from 'react';
import {render,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MobileNav} from './MobileNav';
vi.mock('./glass/GlassMaterial',()=>({GlassMaterial:()=>null}));
vi.mock('./NavButton',()=>({NavSelection:()=>null,NavButton:({id,label,active,preview,onClick}:any)=>createElement('button',{'data-nav-id':id,'aria-label':label,'aria-current':(preview??active)?'page':undefined,onClick},label)}));
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
function setup(){const change=vi.fn(),view=render(createElement(MobileNav,{page:'overview',onChange:change})),nav=view.getByRole('navigation');nav.setPointerCapture=vi.fn();nav.releasePointerCapture=vi.fn();nav.querySelectorAll('button').forEach((b,i)=>{b.getBoundingClientRect=()=>({left:i*80,width:80,top:800,height:54} as DOMRect)});const send=(type:string,x:number)=>{const e=new MouseEvent(type,{bubbles:true,clientX:x,clientY:600,button:0});Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true},pointerType:{value:'touch'}});fireEvent(nav,e)};return{change,view,send}}
it('previews on down and outside movement, commits only the final tab on release',()=>{const{change,view,send}=setup();send('pointerdown',120);expect(change).not.toHaveBeenCalled();expect(view.getByRole('button',{name:'稿件'}).getAttribute('aria-current')).toBe('page');send('pointermove',280);expect(change).not.toHaveBeenCalled();expect(view.getByRole('button',{name:'数据源'}).getAttribute('aria-current')).toBe('page');send('pointerup',280);expect(change).toHaveBeenCalledExactlyOnceWith('sources')});
it('cancels a gesture without changing the page and keeps keyboard click working',()=>{const{change,view,send}=setup();send('pointerdown',120);send('pointercancel',120);expect(change).not.toHaveBeenCalled();expect(view.getByRole('button',{name:'概览'}).getAttribute('aria-current')).toBe('page');fireEvent.click(view.getByRole('button',{name:'设置'}),{detail:0});expect(change).toHaveBeenCalledExactlyOnceWith('settings')});
it('removes service settings from LAN navigation while keeping available pages usable',()=>{
 vi.stubGlobal('location',{hostname:'10.77.0.44'});
 const{change,view}=setup();
 expect(view.queryByRole('button',{name:'设置'})).toBeNull();
 expect(view.getAllByRole('button').map(button=>button.textContent)).toEqual(['概览','稿件','分析','数据源']);
 fireEvent.click(view.getByRole('button',{name:'数据源'}),{detail:0});
 expect(change).toHaveBeenCalledExactlyOnceWith('sources');
});
