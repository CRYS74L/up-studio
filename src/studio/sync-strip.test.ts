import {expect,it} from 'vitest';
import {incomingSlots,syncSlots,currentHistoryRuns} from './sync-strip';
it('fills wide strips with real records instead of stopping at ninety cells',()=>{
 const layout=syncSlots(936,360,0);expect(layout.capacity).toBeGreaterThan(90);
 expect(layout.offset).toBe(0);expect((layout.capacity-1)*layout.step+5).toBeCloseTo(936);
 expect(syncSlots(936,361,0)).toEqual(layout);
});
it('reserves empty leading slots without stretching sparse records',()=>{
 const layout=syncSlots(300,3,0);expect(layout.count).toBe(3);
 expect(layout.offset+2*layout.step+5).toBeCloseTo(300);expect(layout.step).toBeLessThan(8);
});
it('moves one slot for one completion and ignores status-only or unrelated changes',()=>{
 expect(incomingSlots(['a','b','c'],['b','c','d'])).toBe(1);
 expect(incomingSlots(['a','b','c'],['a','b','c'])).toBe(0);
 expect(incomingSlots(['a','b','c'],['x','y','z'])).toBe(0);
});

it('never maps old response records onto a newly selected day',()=>{expect(currentHistoryRuns({day:'2026-09-19',runs:[{id:1}]},'2026-09-20')).toEqual([]);expect(currentHistoryRuns({day:'2026-09-19',runs:[{id:1}]},'2026-09-19')).toEqual([{id:1}]);});
it('covers empty, sparse, exact and multiple pages without overlap or lost records',()=>{for(const width of [120,300,668,936])for(const total of [0,1,3,40,91,144,360,1000]){const seen=[];const base=syncSlots(width,total,0);for(let page=0;page<base.pages;page++){const l=syncSlots(width,total,page);expect(l.count).toBeGreaterThanOrEqual(0);expect(l.count).toBeLessThanOrEqual(l.capacity);expect(l.offset).toBeCloseTo((l.capacity-l.count)*l.step);for(let i=0;i<l.count;i++)seen.push(page*l.capacity+i);if(l.count)expect(l.offset+(l.count-1)*l.step+5).toBeCloseTo(width);}expect(seen).toEqual(Array.from({length:total},(_,i)=>i));expect(syncSlots(width,total,9999).current).toBe(base.pages-1);expect(syncSlots(width,total,-1).current).toBe(0);}});
