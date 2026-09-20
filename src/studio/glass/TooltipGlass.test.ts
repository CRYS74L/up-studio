// @vitest-environment jsdom
import {createElement} from 'react';
import {render,act,cleanup} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {TooltipGlass} from './TooltipGlass';
vi.mock('./GlassMaterial',()=>({GlassMaterial:()=>createElement('span',{'data-material-test':true})}));
it('tracks tooltip geometry and removes the material when the tooltip hides',async()=>{
 let frame:(()=>void)|undefined;vi.stubGlobal('requestAnimationFrame',(fn:()=>void)=>{frame=fn;return 1});vi.stubGlobal('cancelAnimationFrame',()=>{frame=undefined});
 const tip=document.createElement('div');tip.className='s-chart-tooltip';tip.textContent='value';tip.style.opacity='1';tip.style.zIndex='999';tip.style.borderRadius='14px';let left=20;
 tip.getBoundingClientRect=()=>({left,top:30,right:left+120,bottom:110,width:120,height:80,x:left,y:30,toJSON:()=>({})});document.body.append(tip);
 const positions:string[]=[];const record=()=>positions.push(document.querySelector<HTMLElement>('.s-tooltip-glass')?.style.left??'');document.addEventListener('up:tooltip-position',record);
 render(createElement(TooltipGlass));await act(async()=>{frame?.()});const material=()=>document.querySelector<HTMLElement>('.s-tooltip-glass');expect(material()?.style.left).toBe('20px');expect(material()?.style.zIndex).toBe('998');
 left=70;await act(async()=>{frame?.()});expect(material()?.style.left).toBe('70px');expect(document.querySelectorAll('.s-tooltip-glass')).toHaveLength(1);expect(positions).toEqual(['20px','70px']);
 tip.style.visibility='hidden';await act(async()=>{frame?.()});expect(material()).toBeNull();document.removeEventListener('up:tooltip-position',record);cleanup();tip.remove();vi.unstubAllGlobals();
});
