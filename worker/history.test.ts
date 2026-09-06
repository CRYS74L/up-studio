/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { historyStatements, trendWindows, recentWindow } from './history';

describe('permanent history', () => {
 it('backfills every old snapshot idempotently and keeps older dates after the rolling window moves', () => {
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE video_snapshots(video_id TEXT,captured_at TEXT,dimensions_json TEXT)');
  const insert=db.prepare('INSERT INTO video_snapshots VALUES(?,?,?)');
  insert.run('1','2026-08-01',JSON.stringify({trend:{play:{tendency:[{date_key:1,total_inc:4}],last_30_day_tendency:[{date_key:2,total_inc:5}],period:0}}}));
  insert.run('1','2026-09-01',JSON.stringify({trend:{play:{last_30_day_tendency:[{date_key:2,total_inc:6},{date_key:3,total_inc:7}],hour_tendency:[{date_key:4,total_inc:8}]}}}));
  const migration=readFileSync(new URL('../migrations/0005_long_term_history.sql',import.meta.url),'utf8');
  db.exec(migration); db.exec(migration);
  expect(db.prepare('SELECT count(*) n FROM video_trend_points').get()?.n).toBe(4);
  expect(db.prepare('SELECT total_inc n FROM video_trend_points WHERE date_key=2').get()?.n).toBe(6);
  expect(trendWindows.first30d).toBe('tendency');
  const adapter={prepare:(sql:string)=>({bind:(...values:unknown[])=>({sql,values})})};
  const result:any={snapshots:[{videoId:'1',capturedAt:'2026-09-02',dimensions:{trend:{play:{last_30_day_tendency:[{date_key:3,total_inc:9}]}}}}],account:{capturedAt:'2026-09-02',stat:{total_num:3382},graphs:{total:{list:[{date:1788278400,fans_total_inc:3382}]},follow:{list:[{date:1788278400,fans_total_inc:4}]},unfollow:{list:[{date:1788278400,fans_total_inc:2}]}}}};
  for(const statement of historyStatements(adapter as any,result) as any[]) db.prepare(statement.sql).run(...statement.values);
  expect(db.prepare('SELECT count(*) n FROM video_trend_points').get()?.n).toBe(4);
  expect(db.prepare('SELECT followers,follows,unfollows FROM account_trends').get()).toMatchObject({followers:3382,follows:4,unfollows:2});
  db.close();
 });
});


it('keeps the recent window at 30 days while the stored history remains complete',()=>{const points=Array.from({length:54},(_,i)=>({date_key:1700000000+i*86400}));expect(recentWindow(points)).toHaveLength(30);expect(points).toHaveLength(54);expect(recentWindow(points)[0]).toEqual(points[24]);});
