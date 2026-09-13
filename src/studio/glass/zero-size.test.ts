import {expect,it} from 'vitest';
import {generateShaderDisplacementMap} from './LiquidGlass';
it('does not allocate a canvas for surfaces hidden during a responsive switch',()=>{
 for(const [w,h] of [[0,640],[390,0],[NaN,20],[20,Infinity],[.5,.5]])expect(()=>generateShaderDisplacementMap(w,h)).not.toThrow();
});
