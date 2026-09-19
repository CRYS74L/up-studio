import {expect,it} from 'vitest';
import {scoreExtent} from './charts';
it('adapts the range and interval to the observed scores',()=>{
 const narrow=scoreExtent([2.1,2.5,3]),wide=scoreExtent([0,2,4]);
 expect(narrow.min).toBeGreaterThan(0);expect(narrow.min).toBeLessThanOrEqual(2.1);expect(narrow.max).toBeGreaterThanOrEqual(3);expect(narrow.max).toBeLessThan(5);expect(narrow.interval).toBeLessThan(wide.interval!);
});
it('caps only the upper bound while retaining adaptive lower bounds',()=>{
 for(const values of [[3,5],[5],[4.9,5],[4.8]]){const extent=scoreExtent(values);expect(extent.max).toBeLessThanOrEqual(5);expect(extent.max).toBeGreaterThanOrEqual(Math.max(...values));expect(extent.min).toBeLessThan(Math.min(...values));expect(extent.min).toBeGreaterThan(0);}
});
it('retains the empty-data fallback and ignores unavailable values',()=>{
 expect(scoreExtent([])).toEqual({min:0,max:1});expect(scoreExtent([null,NaN,Infinity])).toEqual({min:0,max:1});expect(scoreExtent([2,3,null])).toEqual(scoreExtent([2,3]));
});
