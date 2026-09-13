import {expect,it} from 'vitest';
import {springSamples} from './spring-motion';
it('smooth settles monotonically while snappy and bouncy have bounded, increasing overshoot',()=>{
 const smooth=springSamples(1),snappy=springSamples(.84),bouncy=springSamples(.68);
 for(const values of [smooth,snappy,bouncy]){expect(values[0].progress).toBe(0);expect(values.at(-1)!.progress).toBe(1);expect(values.every(v=>Number.isFinite(v.progress))).toBe(true);expect(Math.abs(values.at(-2)!.progress-1)).toBeLessThan(.001)}
 expect(smooth.every((v,i)=>!i||v.progress>=smooth[i-1].progress)).toBe(true);
 expect(Math.max(...snappy.map(x=>x.progress))).toBeGreaterThan(1);
 expect(Math.max(...bouncy.map(x=>x.progress))).toBeGreaterThan(Math.max(...snappy.map(x=>x.progress)));
 expect(Math.max(...bouncy.map(x=>x.progress))).toBeLessThan(1.06);
});
