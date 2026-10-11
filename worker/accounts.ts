const tables=['videos','video_snapshots','video_trend_points','account_snapshots','account_trends','acquisition_runs'];
export const rootDatabase=(db:any):D1Database=>db.accountRoot??db;
export async function accountDatabase(input:D1Database):Promise<D1Database>{
 if((input as any).accountRoot)return input;
 const active=await input.prepare("SELECT value_json FROM settings WHERE key='active_account'").first<{value_json:string}>();
 const owner=await input.prepare("SELECT value_json FROM settings WHERE key='original_account'").first<{value_json:string}>();
 if(!active||!owner)return input;
 const uid=JSON.parse(active.value_json);if(!/^\d+$/.test(uid))throw Error('Invalid account');
 const translate=(sql:string)=>active.value_json===owner.value_json?sql:scopeSql(sql,uid);
 return {accountRoot:input,accountUid:uid,prepare:(sql:string)=>input.prepare(translate(sql)),batch:(s:any)=>input.batch(s),exec:(sql:string)=>input.exec(translate(sql))} as unknown as D1Database;
}
export function scopeSql(sql:string,uid:string){
 if(!/^\d+$/.test(uid))throw Error('Invalid account');
 const literals:string[]=[];let code=sql.replace(/'(?:''|[^'])*'|--[^\r\n]*|\/\*[^]*?\*\//g,value=>'§'+(literals.push(value)-1)+'§');
 const names=tables.join('|'),aliases=new Set<string>();
 const aliasPattern=new RegExp('\\b(?:FROM|JOIN)\\s+["\x60]?('+names+')["\x60]?\\s+(?:AS\\s+)?([a-z_][a-z0-9_]*)','gi');
 for(const m of code.matchAll(aliasPattern))if(!['where','on','join','left','right','inner','outer','group','order','limit','union','set'].includes(m[2].toLowerCase()))aliases.add(m[2].toLowerCase());
 code=code.replace(new RegExp('(["\x60]?)(\\b(?:'+names+'))(["\x60]?)(?=\\s*\\.)','gi'),(all,open,name,close)=>aliases.has(name.toLowerCase())?all:open+'up_'+uid+'_'+name+close);
 code=code.replace(new RegExp('(\\b(?:FROM|JOIN|INTO|UPDATE|TABLE(?:\\s+IF NOT EXISTS)?|REFERENCES)\\s+["\x60]?)('+names+')(["\x60]?\\b)','gi'),(_,prefix,name,suffix)=>prefix+'up_'+uid+'_'+name+suffix);
 return code.replace(/§(\d+)§/g,(_,i)=>literals[Number(i)]);
}


export async function prepareAccount(input:D1Database,profile:{uid:string;name:string;avatar:string}){
 const db=rootDatabase(input),now=new Date().toISOString();
 const owner=await db.prepare("SELECT value_json FROM settings WHERE key='original_account'").first<{value_json:string}>();
 if(owner&&JSON.parse(owner.value_json)!==profile.uid){
  for(const table of tables){const row=await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").bind(table).first<{sql:string}>();if(!row)throw Error('Missing account schema');await db.exec(scopeSql(row.sql,profile.uid).replace(/CREATE TABLE /i,'CREATE TABLE IF NOT EXISTS '));}
  for(const [table,columns] of [['video_snapshots','captured_at DESC,source'],['account_snapshots','captured_at DESC'],['acquisition_runs','started_at DESC']])await db.exec(`CREATE INDEX IF NOT EXISTS up_${profile.uid}_${table}_dashboard_lookup ON up_${profile.uid}_${table}(${columns})`);
 }
 await db.batch([db.prepare("INSERT OR IGNORE INTO settings(key,value_json,updated_at) VALUES('original_account',?,?)").bind(JSON.stringify(profile.uid),now),db.prepare("INSERT INTO settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").bind('profile_'+profile.uid,JSON.stringify(profile),now)]);
}
export async function fetchProfile(session:string){
 const response=await fetch('https://api.bilibili.com/x/web-interface/nav',{headers:{cookie:session,referer:'https://member.bilibili.com/','user-agent':'Mozilla/5.0'},signal:AbortSignal.timeout(10000)});
 const body:any=await response.json();if(body.code!==0||!body.data?.isLogin||!body.data.mid)throw Error('Session expired');
 return {uid:String(body.data.mid),name:String(body.data.uname),avatar:String(body.data.face??'')};
}

export async function logoutAccount(input:D1Database,uid:string){
 if(!/^\d+$/.test(uid))throw Error('Invalid account');const db=rootDatabase(input);
 const active=await db.prepare("SELECT value_json FROM settings WHERE key='active_account'").first<{value_json:string}>();
 const statements=[db.prepare('DELETE FROM encrypted_secrets WHERE id=?').bind('bilibili_session_'+uid)];let nextUid=active?JSON.parse(active.value_json):null;
 if(nextUid===uid){const candidates=(await db.prepare("SELECT id,ciphertext,iv FROM encrypted_secrets WHERE id LIKE 'bilibili_session_%' AND id<>? ORDER BY updated_at DESC").bind('bilibili_session_'+uid).all<{id:string;ciphertext:string;iv:string}>()).results;const next=candidates.find(r=>/^bilibili_session_\d+$/.test(r.id));nextUid=next?.id.slice('bilibili_session_'.length)??null;
 if(next){statements.push(db.prepare("INSERT OR REPLACE INTO encrypted_secrets(id,ciphertext,iv,updated_at) VALUES('bilibili_session',?,?,?)").bind(next.ciphertext,next.iv,new Date().toISOString()),db.prepare("UPDATE settings SET value_json=? WHERE key='active_account'").bind(JSON.stringify(nextUid)));}
 else statements.push(db.prepare("DELETE FROM encrypted_secrets WHERE id='bilibili_session'"),db.prepare("DELETE FROM settings WHERE key='active_account'"));}
 await db.batch(statements);return {activeAccount:nextUid};
}
