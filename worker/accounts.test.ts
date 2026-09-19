import {readFileSync,readdirSync} from 'node:fs';
import {historyStatements} from './history';
import {it,expect} from 'vitest';
import {scopeSql,prepareAccount,accountDatabase,logoutAccount} from './accounts';
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

function fullDatabase(){const db=createD1(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.database.exec(readFileSync('migrations/'+f,'utf8'));return db;}
it('writes and updates real history SQL for the original and multiple newly added accounts',async()=>{
 const db=fullDatabase();
 for(const uid of ['10','20','30']){await prepareAccount(db,{uid,name:uid,avatar:''});await db.prepare("INSERT OR REPLACE INTO settings(key,value_json,updated_at) VALUES('active_account',?,'now')").bind(JSON.stringify(uid)).run();const scoped=await accountDatabase(db);
 await scoped.prepare("INSERT INTO videos(id,bvid,title,published_at) VALUES('v','BV_TEST','test','2026-09-19')").run();
 for(const total of [1,2]){const result:any={snapshots:[{videoId:'v',capturedAt:'2026-09-19T00:00:00Z',dimensions:{trend:{play:{last_30_day_tendency:[{date_key:1,total_inc:Number(uid)+total}]}}}}],account:{capturedAt:'2026-09-19T00:00:00Z',stat:{total_num:Number(uid)},graphs:{total:{list:[{date:1,fans_total_inc:Number(uid)}]}}}};await scoped.batch(historyStatements(scoped,result));}
 expect(await scoped.prepare('SELECT total_inc FROM video_trend_points').first('total_inc')).toBe(Number(uid)+2);
 }
 expect(db.database.prepare('SELECT total_inc FROM video_trend_points').get().total_inc).toBe(12);expect(db.database.prepare('SELECT total_inc FROM up_20_video_trend_points').get().total_inc).toBe(22);expect(db.database.prepare('SELECT total_inc FROM up_30_video_trend_points').get().total_inc).toBe(32);db.database.close();
});
it('keeps strings and explicit aliases intact while scoping qualified table names',()=>{
 expect(scopeSql("SELECT videos.id, 'videos.id FROM videos' FROM videos",'42')).toBe("SELECT up_42_videos.id, 'videos.id FROM videos' FROM up_42_videos");
 expect(scopeSql('SELECT videos.id FROM videos AS videos','42')).toBe('SELECT videos.id FROM up_42_videos AS videos');
 expect(scopeSql('SELECT "videos".id FROM "videos"','42')).toBe('SELECT "up_42_videos".id FROM "up_42_videos"');
});
it('logs out active and inactive accounts without deleting account datasets or conversations',async()=>{
 const db=fullDatabase();for(const uid of ['10','20','30']){await prepareAccount(db,{uid,name:uid,avatar:''});await db.prepare('INSERT INTO encrypted_secrets(id,ciphertext,iv,updated_at) VALUES(?,?,?,?)').bind('bilibili_session_'+uid,'dummy','iv','2026-09-19').run();}
 await db.prepare("INSERT INTO encrypted_secrets(id,ciphertext,iv,updated_at) VALUES('bilibili_session','dummy','iv','now')").run();await db.prepare("INSERT OR REPLACE INTO settings(key,value_json,updated_at) VALUES('active_account',?,'now')").bind(JSON.stringify('10')).run();
 await db.prepare("INSERT INTO videos(id,bvid,title,published_at) VALUES('v','BV_TEST','retained','now')").run();
 await db.prepare("INSERT INTO ai_conversations(id,account_id,title,messages_json,video_ids_json,created_at,updated_at) VALUES('chat','10','retained','[]','[]','now','now')").run();
 await logoutAccount(db,'30');expect(await db.prepare("SELECT value_json FROM settings WHERE key='active_account'").first('value_json')).toBe('"10"');
 await logoutAccount(db,'10');expect(await db.prepare("SELECT value_json FROM settings WHERE key='active_account'").first('value_json')).toBe('"20"');expect(await db.prepare('SELECT title FROM videos').first('title')).toBe('retained');
 await logoutAccount(db,'20');expect(await db.prepare("SELECT id FROM encrypted_secrets WHERE id='bilibili_session'").first()).toBeNull();expect(await db.prepare('SELECT title FROM videos').first('title')).toBe('retained');
 expect(await db.prepare('SELECT COUNT(*) AS n FROM ai_conversations').first('n')).toBe(1);await prepareAccount(db,{uid:'10',name:'Returning',avatar:''});expect(await db.prepare('SELECT title FROM videos').first('title')).toBe('retained');db.database.close();
});
