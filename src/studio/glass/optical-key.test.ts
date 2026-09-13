import {expect,it} from 'vitest';
import {opticalKey} from './optical-key';
it('changes a filter graph identity whenever optical settings change',()=>{
 const base=[64,2,198,954,'standard'];expect(opticalKey(base)).toBe(opticalKey([...base]));for(const values of [[65,2,198,954,'standard'],[64,3,198,954,'standard'],[64,2,198,954,'polar'],[64,2,198,955,'standard']])expect(opticalKey(values)).not.toBe(opticalKey(base));
});
