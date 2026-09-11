import {expect,it} from 'vitest';
import {navigationMotion} from './navigation-motion';
import {orderedDirection} from './transition-motion';
const route=(page:string,tab:string|null=null)=>({page,tab,video:null,ids:[]});
it.each([[false,'y'],[true,'x']] as const)('maps primary navigation to its visible axis (mobile=%s)',(mobile,axis)=>{
 expect(navigationMotion(route('overview'),route('videos'),mobile)).toEqual({axis,direction:1});
 expect(navigationMotion(route('sources'),route('analysis'),mobile)).toEqual({axis,direction:-1});
});
it('mirrors content entry when selecting an earlier analysis tab',()=>{
 expect(navigationMotion(route('analysis'),route('analysis','videos'),false)).toEqual({axis:'x',direction:1});
 expect(navigationMotion(route('analysis','ai'),route('analysis','videos'),false)).toEqual({axis:'x',direction:-1});
 expect(navigationMotion(route('analysis','videos'),route('analysis'),true)).toEqual({axis:'x',direction:-1});
});
it('uses item order for adjacent and skipped segment selections',()=>{
 expect(orderedDirection(0,1)).toBe(1);expect(orderedDirection(1,2)).toBe(1);
 expect(orderedDirection(2,1)).toBe(-1);expect(orderedDirection(1,0)).toBe(-1);
 expect(orderedDirection(2,0)).toBe(-1);
});
