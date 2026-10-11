import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ensureScopedQueryIndexes} from './query-indexes.mjs';
test('account snapshot lookups use their time index and retain every row',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec("CREATE TABLE up_123_video_snapshots(captured_at TEXT,source TEXT,value TEXT);INSERT INTO up_123_video_snapshots VALUES('2026-10-12','web-data-v1','retained');CREATE TABLE unrelated(value TEXT)");
  const before=db.prepare('SELECT * FROM up_123_video_snapshots').all();ensureScopedQueryIndexes(db);ensureScopedQueryIndexes(db);
  assert.deepEqual(db.prepare('SELECT * FROM up_123_video_snapshots').all(),before);
  const plan=db.prepare("EXPLAIN QUERY PLAN SELECT * FROM up_123_video_snapshots WHERE captured_at='2026-10-12'").all();assert.ok(plan.some(p=>p.detail.includes('USING INDEX')));
  assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='index' AND tbl_name='unrelated'").get().n,0);
 }finally{db.close()}
});
