import {stripTypeScriptTypes} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
const project=path.resolve(import.meta.dirname,'..'), root=path.join(project,'.local-runtime');
for(const folder of ['bin','releases','logs','backups','audit'])fs.mkdirSync(path.join(root,folder),{recursive:true});
if(!fs.existsSync(path.join(root,'data.sqlite'))){
 const location=path.join(project,'.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
 const sources=fs.readdirSync(location).filter(x=>x.endsWith('.sqlite')&&x!=='metadata.sqlite');
 if(sources.length!==1)throw new Error('Expected exactly one source D1 database; no database was copied');
 const source=new DatabaseSync(path.join(location,sources[0]),{readOnly:true});
 await backup(source,path.join(root,'data.sqlite'));source.close();
}
// Existing installations already contain migrations 1-4. New additions are atomic and recorded.
const migrationDb=new DatabaseSync(path.join(root,'data.sqlite'));
migrationDb.exec('CREATE TABLE IF NOT EXISTS runtime_migrations(name TEXT PRIMARY KEY)');
for(const name of fs.readdirSync(path.join(project,'migrations')).filter(name=>/^\d+_.*\.sql$/.test(name)&&Number(name.split('_')[0])>=5).sort()){
 if(migrationDb.prepare('SELECT 1 FROM runtime_migrations WHERE name=?').get(name))continue;
 migrationDb.exec('BEGIN IMMEDIATE');
 try{migrationDb.exec(fs.readFileSync(path.join(project,'migrations',name),'utf8'));migrationDb.prepare('INSERT INTO runtime_migrations(name) VALUES(?)').run(name);migrationDb.exec('COMMIT');}
 catch(error){migrationDb.exec('ROLLBACK');migrationDb.close();throw error;}
}
migrationDb.close();
const id=new Date().toISOString().replace(/[:.]/g,'-'); const release=path.join(root,'releases',id);fs.mkdirSync(release);
fs.copyFileSync(path.join(project,'dist/up_studio/index.js'),path.join(release,'worker.mjs'));
function copyTree(source,target){fs.mkdirSync(target,{recursive:true});for(const entry of fs.readdirSync(source,{withFileTypes:true})){const from=path.join(source,entry.name),to=path.join(target,entry.name);if(entry.isDirectory())copyTree(from,to);else if(entry.isFile())fs.copyFileSync(from,to);}}
copyTree(path.join(project,'dist/client'),path.join(release,'client'));
for(const file of ['server.mjs','service-settings.mjs','startup-settings.ps1','d1.mjs','launch.ps1','cloud-backups.mjs','cloud-backup-tools.mjs','cloud-backup-data.mjs','webdav-folder.mjs'])fs.copyFileSync(path.join(project,'runtime',file),path.join(root,file));
fs.writeFileSync(path.join(root,'snapshot-storage.mjs'),stripTypeScriptTypes(fs.readFileSync(path.join(project,'shared/snapshot-storage.ts'),'utf8')));
fs.writeFileSync(path.join(root,'backup-schema.json'),JSON.stringify(fs.readdirSync(path.join(project,'migrations')).filter(name=>name.endsWith('.sql'))));
const csc=path.join(process.env.SystemRoot,'Microsoft.NET','Framework64','v4.0.30319','csc.exe');
execFileSync(csc,['/nologo','/target:winexe','/optimize+','/out:'+path.join(root,'ServiceHost.exe'),path.join(project,'runtime','ServiceHost.cs')],{windowsHide:true,stdio:'pipe'});
if(!fs.existsSync(path.join(root,'bin/node.exe')))fs.copyFileSync(process.execPath,path.join(root,'bin/node.exe'));
const allowed=new Set(['MASTER_ENCRYPTION_KEY_BASE64','APP_PASSWORD_HASH','INTERNAL_COLLECT_SECRET','DEEPSEEK_API_KEY','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','RESEND_API_KEY','ALERT_RECIPIENT']);
const configPath=path.join(root,'config.json');
const previousConfig=fs.existsSync(configPath)?JSON.parse(fs.readFileSync(configPath,'utf8')):{};
const config={...previousConfig,APP_ORIGIN:'http://localhost:5173',DEEPSEEK_MODEL:'deepseek-flash',AI_DAILY_CNY_LIMIT:'1',AI_MONTHLY_CNY_LIMIT:'5'};
for(const line of fs.readFileSync(path.join(project,'.dev.vars'),'utf8').split(/\r?\n/)){const match=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(match&&allowed.has(match[1]))config[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');}
if(previousConfig.MASTER_ENCRYPTION_KEY_BASE64)config.MASTER_ENCRYPTION_KEY_BASE64=previousConfig.MASTER_ENCRYPTION_KEY_BASE64;
if(!config.MASTER_ENCRYPTION_KEY_BASE64)throw new Error('Encryption key is missing');
fs.writeFileSync(path.join(root,'config.json'),JSON.stringify(config));
const version=process.argv[2]??execFileSync('git',['describe','--tags','--always'],{cwd:project,encoding:'utf8'}).trim();
fs.writeFileSync(path.join(root,'current.next.json'),JSON.stringify({id,version}));fs.renameSync(path.join(root,'current.next.json'),path.join(root,'current.json'));
console.log(JSON.stringify({deployed:true,id,version,root}));
