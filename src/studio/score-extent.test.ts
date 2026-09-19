import {expect,it} from 'vitest';
import {scoreExtent} from './charts';
it('keeps the five-point rating domain for full, partial and empty data',()=>{
 for(const values of [[3,5],[5],[0],[],[null],[4.9,5]]) expect(scoreExtent(values)).toEqual({min:0,max:5,interval:1});
});
