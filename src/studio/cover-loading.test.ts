import {expect,it,vi} from 'vitest';
import {queueCoverDecode} from './cover-loading';
it('limits background decodes and lets visible covers precede queued warmups',async()=>{
 const started:string[]=[],finish:Array<()=>void>=[];
 const work=(name:string)=>()=>{started.push(name);return new Promise<void>(r=>finish.push(r))};
 const a=queueCoverDecode(work('a')),b=queueCoverDecode(work('b')),c=queueCoverDecode(work('warm')),d=queueCoverDecode(work('visible'),true);
 expect(started).toEqual(['a','b']);finish.shift()!();await a;
 await vi.waitFor(()=>expect(started).toEqual(['a','b','visible']));
 finish.shift()!();await b;await vi.waitFor(()=>expect(started).toEqual(['a','b','visible','warm']));
 finish.splice(0).forEach(f=>f());await Promise.all([c,d]);
});
it('releases a decode slot after an image fails',async()=>{
 await expect(queueCoverDecode(async()=>{throw new Error('decode failed')})).rejects.toThrow('decode failed');
 await expect(queueCoverDecode(async()=>{})).resolves.toBeUndefined();
});
