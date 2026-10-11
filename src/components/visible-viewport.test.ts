import {expect,it} from 'vitest';
import {popoverPosition} from './visible-viewport';
it('places edge popovers inside a panned or keyboard-reduced visible viewport',()=>{
 for(const v of [{left:0,top:0,width:260,height:562},{left:80,top:160,width:220,height:280}])for(const anchor of [{left:370,top:400,bottom:416},{left:0,top:0,bottom:16}]){
  const size={width:Math.min(200,v.width-24),height:Math.min(140,v.height-112)},p=popoverPosition(anchor,size,v,88);
  expect(p.left).toBeGreaterThanOrEqual(v.left+12);expect(p.left+size.width).toBeLessThanOrEqual(v.left+v.width-12);
  expect(p.top).toBeGreaterThanOrEqual(v.top+12);expect(p.top+size.height).toBeLessThanOrEqual(v.top+v.height-100);
 }
});
