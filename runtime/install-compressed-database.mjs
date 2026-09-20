import fs from 'node:fs';import path from 'node:path';import {DatabaseSync,backup} from 'node:sqlite';import {compactCopy} from './compact-snapshots.mjs';
const root=path.resolve(process.argv[2]??'.local-runtime'),file=path.join(root,'data.sqlite');
if(!fs.existsSync(file))throw Error('Existing database required');
const serviceFile=path.join(root,'service.json');if(fs.existsSync(serviceFile)){const {pid}=JSON.parse(fs.readFileSync(serviceFile,'utf8'));let alive=false;try{process.kill(pid,0);alive=true}catch(error){if(error.code!=='ESRCH')throw error;}if(alive)throw Error('Stop the owned service before database migration');}
const lock=path.join(root,'snapshot-migration.lock'),fd=fs.openSync(lock,'wx');
try{const timestamp=new Date().toISOString().replace(/[:.]/g,'-'),backupDir=path.join(root,'backups');fs.mkdirSync(backupDir,{recursive:true});const original=path.join(backupDir,'pre-compression-'+timestamp+'.sqlite'),candidate=path.join(root,'data.compressed-'+timestamp+'.sqlite');
 const current=new DatabaseSync(file);const checkpoint=current.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();if(checkpoint.busy){current.close();throw Error('Database still in use');}await backup(current,original);current.close();
 const report=await compactCopy(original,candidate,p=>console.log(JSON.stringify(p)));if(!report.verified)throw Error('Verification required');
 for(const target of [original,candidate]){const handle=fs.openSync(target,'r+');fs.fsyncSync(handle);fs.closeSync(handle);}
 // Same-directory file replacement is atomic; the verified original is retained independently.
 fs.renameSync(candidate,file);const check=new DatabaseSync(file,{readOnly:true});if(Object.values(check.prepare('PRAGMA integrity_check').get())[0]!=='ok'){check.close();throw Error('Post-install integrity failure; preserved original: '+original);}check.close();
 fs.writeFileSync(path.join(root,'snapshot-migration-report.json'),JSON.stringify({...report,original,installedAt:new Date().toISOString()},null,2));console.log(JSON.stringify({installed:true,original,...report}));
}finally{fs.closeSync(fd);fs.unlinkSync(lock);}
