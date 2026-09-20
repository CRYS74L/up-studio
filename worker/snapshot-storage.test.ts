import {gunzipSync} from 'node:zlib';
import {it,expect} from 'vitest';
import {SnapshotWriter,unpackRows,withSnapshotReads,compressRawJson} from '../shared/snapshot-storage';
// @ts-ignore SQLite runtime adapter.
import {createD1} from '../runtime/d1.mjs';
const schema='CREATE TABLE snapshot_chunks(hash TEXT PRIMARY KEY,codec TEXT,raw_bytes INTEGER,body BLOB);CREATE TABLE examples(id INTEGER PRIMARY KEY,metrics_json TEXT,dimensions_json TEXT,source_json TEXT)';
it('restores exact bytes, shares unchanged chunks and preserves SQL projections',async()=>{
 const db=createD1(':memory:');await db.exec(schema);const raw=JSON.stringify({coverAttractionScore:3.7,unicode:'中文🙂',null:null,zero:0,negative:-2,values:Array.from({length:4000},(_,n)=>({date:n,value:n%17}))});
 const writer=new SnapshotWriter(withSnapshotReads(db)),packed=await writer.pack(raw,{coverAttractionScore:3.7});await writer.flush();await db.prepare('INSERT INTO examples(id,metrics_json) VALUES(1,?)').bind(packed).run();
 const firstCount=await db.prepare('SELECT COUNT(*) n FROM snapshot_chunks').first('n');await writer.pack(raw);await writer.flush();expect(await db.prepare('SELECT COUNT(*) n FROM snapshot_chunks').first('n')).toBe(firstCount);
 const read=withSnapshotReads(db);expect((await read.prepare('SELECT metrics_json FROM examples').first())!.metrics_json).toBe(raw);expect(await read.prepare("SELECT json_extract(metrics_json,'$.coverAttractionScore') score FROM examples").first('score')).toBe(3.7);
 const changed=raw.replace('"value":0','"value":99'),next=await writer.pack(changed);await writer.flush();expect((await unpackRows(db,[{dimensions_json:next}]))[0].dimensions_json).toBe(changed);expect(await db.prepare('SELECT COUNT(*) n FROM snapshot_chunks').first('n')).toBeLessThan(Number(firstCount)*2);
 expect((await unpackRows(db,[{source_json:'{"legacy":true}'}]))[0].source_json).toBe('{"legacy":true}');db.database.close();
});
it('fails closed for missing and corrupted blocks instead of returning partial data',async()=>{
 const db=createD1(':memory:');await db.exec(schema);const writer=new SnapshotWriter(db),packed=await writer.pack(JSON.stringify({text:'abc中文'.repeat(1000)}));await writer.flush();
 await db.prepare("UPDATE snapshot_chunks SET body=X'00'").run();await expect(unpackRows(db,[{dimensions_json:packed}])).rejects.toThrow();await db.exec('DELETE FROM snapshot_chunks');await expect(unpackRows(db,[{dimensions_json:packed}])).rejects.toThrow('Missing');db.database.close();
});
it('a failed chunk write cannot publish a snapshot reference',async()=>{
 const db=createD1(':memory:');await db.exec(schema);const broken={...db,batch:async()=>{throw Error('disk full')}};const writer=new SnapshotWriter(broken as any);await writer.pack(JSON.stringify({text:'data'.repeat(1000)}));await expect(writer.flush()).rejects.toThrow('disk full');expect(await db.prepare('SELECT COUNT(*) n FROM examples').first('n')).toBe(0);db.database.close();
});

it('verifies persisted bytes before allowing references to be published',async()=>{
 const db=createD1(':memory:');await db.exec(schema);const corrupted={...db,batch:async(statements:any[])=>{const result=await db.batch(statements);await db.prepare("UPDATE snapshot_chunks SET body=X'00'").run();return result}};
 const writer=new SnapshotWriter(corrupted as any);await writer.pack(JSON.stringify({text:'data'.repeat(1000)}));await expect(writer.flush()).rejects.toThrow();expect(await db.prepare('SELECT COUNT(*) n FROM examples').first('n')).toBe(0);db.database.close();
});
it('preserves whitespace, escapes and raw-archive bytes exactly',async()=>{
 const db=createD1(':memory:');await db.exec(schema);const raw='  '+JSON.stringify({text:'中文🙂\\\"'.repeat(5000),nil:null,zero:0,values:[1,-2,3.5]},null,2)+'\n';const writer=new SnapshotWriter(db),packed=await writer.pack(raw);await writer.flush();expect((await unpackRows(db,[{source_json:packed}]))[0].source_json).toBe(raw);expect(gunzipSync(compressRawJson(raw)).toString()).toBe(raw);db.database.close();
});
