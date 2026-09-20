import fs from 'node:fs';import path from 'node:path';import {DatabaseSync,backup} from 'node:sqlite';import {performance} from 'node:perf_hooks';import {fileURLToPath} from 'node:url';
import {createD1} from './d1.mjs';import {SnapshotWriter,unpackRows,manifest} from '../shared/snapshot-storage.ts';
const readonlyAdapter=database=>{const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),all:async()=>({results:database.prepare(sql).all(...args)}),first:async()=>database.prepare(sql).get(...args)??null});return{prepare}};
const quote=name=>'"'+name.replaceAll('"','""')+'"';
export async function compactCopy(sourceFile,targetFile,onProgress=()=>{},decodeOnly=false){
 if(fs.existsSync(targetFile))throw Error('Target already exists');
 const started=performance.now(),source=new DatabaseSync(sourceFile,{readOnly:true});await backup(source,targetFile);const target=createD1(targetFile);await target.exec(fs.readFileSync(new URL('../migrations/0008_snapshot_chunks.sql',import.meta.url),'utf8'));
 const sourceAdapter=readonlyAdapter(source);const originalTables=source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'snapshot_chunks'").all().map(row=>row.name);const candidates=originalTables.filter(name=>/(^|_)(video_snapshots|account_snapshots)$/.test(name));let converted=0;const times=[];
 try{
 for(const table of candidates){const fields=table.endsWith('video_snapshots')?['metrics_json','dimensions_json']:['source_json'];let cursor=0;const tableStarted=performance.now();
 while(true){const rows=source.prepare('SELECT rowid AS __rowid,* FROM '+quote(table)+' WHERE rowid>? ORDER BY rowid LIMIT 40').all(cursor);if(!rows.length)break;const writer=new SnapshotWriter(target);const encoded=[];
 for(const row of decodeOnly?await unpackRows(sourceAdapter,rows):rows){const copy={...row};for(const field of fields)copy[field]=decodeOnly||manifest(row[field])?row[field]:await writer.pack(row[field],field==='metrics_json'?{coverAttractionScore:JSON.parse(row[field]).coverAttractionScore}:undefined);encoded.push(copy)}
 await writer.flush();const restored=await unpackRows(target,encoded),originalRestored=await unpackRows(sourceAdapter,rows);for(let i=0;i<rows.length;i++)for(const field of fields)if(restored[i][field]!==originalRestored[i][field])throw Error('Pre-write verification failed: '+table);
 await target.batch(encoded.map(row=>target.prepare('UPDATE '+quote(table)+' SET '+fields.map(f=>quote(f)+'=?').join(',')+' WHERE rowid=?').bind(...fields.map(f=>row[f]),row.__rowid)));converted+=rows.length;cursor=rows.at(-1).__rowid;
 if(converted%400===0)onProgress({table,converted,seconds:Math.round((performance.now()-started)/1000)});
 }times.push({table,seconds:(performance.now()-tableStarted)/1000});}
 // Independent full comparison, including every non-compressed column and table.
 let compared=0;const verifyStarted=performance.now();for(const table of originalTables){let cursor=0;const originalCount=source.prepare('SELECT COUNT(*) n FROM '+quote(table)).get().n;if(target.database.prepare('SELECT COUNT(*) n FROM '+quote(table)).get().n!==originalCount)throw Error('Row count mismatch: '+table);
 while(true){const sourceRows=source.prepare('SELECT rowid AS __rowid,* FROM '+quote(table)+' WHERE rowid>? ORDER BY rowid LIMIT 40').all(cursor);const originals=await unpackRows(sourceAdapter,sourceRows);if(!originals.length)break;const stored=target.database.prepare('SELECT rowid AS __rowid,* FROM '+quote(table)+' WHERE rowid>? ORDER BY rowid LIMIT 40').all(cursor),restored=await unpackRows(target,stored);for(let i=0;i<originals.length;i++)for(const key of Object.keys(originals[i])){const a=originals[i][key],b=restored[i][key];if(a instanceof Uint8Array?!(b instanceof Uint8Array&&Buffer.from(a).equals(Buffer.from(b))):a!==b)throw Error('Full verification mismatch: '+table+' column '+key);}compared+=originals.length;cursor=originals.at(-1).__rowid;
 }}
 const integrity=target.database.prepare('PRAGMA integrity_check').get();if(Object.values(integrity)[0]!=='ok'||target.database.prepare('PRAGMA foreign_key_check').all().length)throw Error('Database integrity check failed');
 const verificationSeconds=(performance.now()-verifyStarted)/1000;target.database.exec('PRAGMA wal_checkpoint(TRUNCATE);VACUUM;PRAGMA wal_checkpoint(TRUNCATE)');
 const report={sourceBytes:fs.statSync(sourceFile).size,targetBytes:fs.statSync(targetFile).size,converted,compared,times,verificationSeconds,totalSeconds:(performance.now()-started)/1000,chunks:target.database.prepare('SELECT COUNT(*) count,SUM(raw_bytes) rawBytes,SUM(length(body)) storedBytes FROM snapshot_chunks').get(),verified:true};onProgress(report);return report;
 }finally{target.database.close();source.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){const [source,target,mode]=process.argv.slice(2);if(!source||!target)throw Error('Usage: node runtime/compact-snapshots.mjs source.sqlite target.sqlite');await compactCopy(source,target,p=>console.log(JSON.stringify(p)),mode==='--expand');}
