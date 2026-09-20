import {it,expect} from 'vitest';
import {acquisitionHistory} from './acquisition-history';
import {syncDayBounds,shiftSyncDay} from '../shared/sync-days';
// @ts-ignore Local SQLite adapter matches production D1 semantics.
import {createD1} from '../runtime/d1.mjs';
it('returns every run in the selected day, including records beyond the former 360 limit',async()=>{
 const db=createD1(':memory:');await db.exec('CREATE TABLE acquisition_runs(id TEXT PRIMARY KEY,status TEXT,started_at TEXT,finished_at TEXT,coverage REAL,coverage_json TEXT,error_code TEXT,timings_json TEXT,request_count INTEGER)');
 const start=Date.parse('2026-09-19T16:00:00Z');
 await db.batch(Array.from({length:501},(_,i)=>db.prepare("INSERT INTO acquisition_runs(id,status,started_at) VALUES(?,'success',?)").bind(String(i),new Date(start+i*60000).toISOString())));
 await db.prepare("INSERT INTO acquisition_runs(id,status,started_at) VALUES('old','success','2026-08-31T16:00:00.000Z'),('before','failed','2026-09-19T15:59:59.999Z'),('after','success','2026-09-20T16:00:00.000Z')").run();
 const history=await acquisitionHistory(db,'2026-09-20',new Date('2026-09-20T05:00:00Z'));expect(history.runs).toHaveLength(501);expect(history.runs.at(-1)?.id).toBe('0');expect(history.firstDay).toBe('2026-09-01');
 expect((await acquisitionHistory(db,'2026-09-01')).runs.map(r=>r.id)).toEqual(['old']);expect((await acquisitionHistory(db,'2026-09-02')).runs).toEqual([]);expect(await db.prepare('SELECT COUNT(*) AS n FROM acquisition_runs').first('n')).toBe(504);db.database.close();
});
it('uses calendar days at UTC+8 and rejects impossible dates',()=>{
 expect(syncDayBounds('2026-09-20')).toEqual({start:'2026-09-19T16:00:00.000Z',end:'2026-09-20T16:00:00.000Z'});expect(syncDayBounds('2026-02-30')).toBeNull();expect(syncDayBounds('bad')).toBeNull();expect(shiftSyncDay('2026-03-01',-1)).toBe('2026-02-28');expect(shiftSyncDay('2026-12-31',1)).toBe('2027-01-01');
});
