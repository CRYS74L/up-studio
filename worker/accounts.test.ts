import {it,expect} from 'vitest';
import {scopeSql,prepareAccount,accountDatabase} from './accounts';
// @ts-ignore Local runtime adapter uses the same SQLite engine as production.
import {createD1} from '../runtime/d1.mjs';
it('isolates account tables while preserving query aliases and the original dataset',async()=>{
 const db=createD1(':memory:');
 await db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value_json TEXT,updated_at TEXT);');
 for(const table of ['videos','video_snapshots','video_trend_points','account_snapshots','account_trends','acquisition_runs'])await db.exec(`CREATE TABLE ${table}(id TEXT PRIMARY KEY)`);
 await prepareAccount(db,{uid:'1',name:'First',avatar:''});await db.prepare('INSERT INTO videos VALUES(?)').bind('original').run();
 await prepareAccount(db,{uid:'2',name:'Second',avatar:''});await db.prepare("INSERT INTO settings VALUES('active_account',?,?)").bind('"2"','now').run();
 const scoped=await accountDatabase(db);expect(await scoped.prepare('SELECT COUNT(*) videos FROM videos').first('videos')).toBe(0);
 await scoped.prepare('INSERT INTO videos VALUES(?)').bind('second').run();expect(await db.prepare('SELECT id FROM videos').first('id')).toBe('original');
 expect(await scoped.prepare('SELECT id FROM videos').first('id')).toBe('second');
 expect(scopeSql('SELECT COUNT(*) videos FROM videos','2')).toBe('SELECT COUNT(*) videos FROM up_2_videos');
 db.database.close();
});
