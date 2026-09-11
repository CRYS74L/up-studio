import {expect,it} from 'vitest';
import {incomingSlots,syncSlots} from './sync-strip';
it('fills wide strips with real records instead of stopping at ninety cells',()=>{
 const layout=syncSlots(936,360,0);expect(layout.capacity).toBeGreaterThan(90);
 expect(layout.offset).toBe(0);expect((layout.capacity-1)*layout.step+5).toBeCloseTo(936);
 expect(syncSlots(936,361,0)).toEqual(layout);
});
it('keeps limited historical records at the latest end without inventing cells',()=>{
 const layout=syncSlots(300,3,0);expect(layout.count).toBe(3);
 expect(layout.offset+2*layout.step+5).toBeCloseTo(300);
});
it('moves one slot for one completion and ignores status-only or unrelated changes',()=>{
 expect(incomingSlots(['a','b','c'],['b','c','d'])).toBe(1);
 expect(incomingSlots(['a','b','c'],['a','b','c'])).toBe(0);
 expect(incomingSlots(['a','b','c'],['x','y','z'])).toBe(0);
});
