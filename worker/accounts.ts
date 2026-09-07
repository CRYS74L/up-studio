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
export function scopeSql(sql:string,uid:string){if(!/^\d+$/.test(uid))throw Error('Invalid account');return sql.replace(new RegExp(`(\\b(?:FROM|JOIN|INTO|UPDATE|TABLE(?:\\s+IF NOT EXISTS)?|REFERENCES)\\s+["\x60]?)(${tables.join('|')})(["\x60]?\\b)`,'gi'),(_,prefix,name,suffix)=>`${prefix}up_${uid}_${name}${suffix}`);}

export async function prepareAccount(input:D1Database,profile:{uid:string;name:string;avatar:string}){
 const db=rootDatabase(input),now=new Date().toISOString();
 const owner=await db.prepare("SELECT value_json FROM settings WHERE key='original_account'").first<{value_json:string}>();
 if(owner&&JSON.parse(owner.value_json)!==profile.uid){
  for(const table of tables){const row=await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").bind(table).first<{sql:string}>();if(!row)throw Error('Missing account schema');await db.exec(scopeSql(row.sql,profile.uid).replace(/CREATE TABLE /i,'CREATE TABLE IF NOT EXISTS '));}
 }
 await db.batch([db.prepare("INSERT OR IGNORE INTO settings(key,value_json,updated_at) VALUES('original_account',?,?)").bind(JSON.stringify(profile.uid),now),db.prepare("INSERT INTO settings(key,value_json,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").bind('profile_'+profile.uid,JSON.stringify(profile),now)]);
}
export async function fetchProfile(session:string){
 const response=await fetch('https://api.bilibili.com/x/web-interface/nav',{headers:{cookie:session,referer:'https://member.bilibili.com/','user-agent':'Mozilla/5.0'},signal:AbortSignal.timeout(10000)});
 const body:any=await response.json();if(body.code!==0||!body.data?.isLogin||!body.data.mid)throw Error('Session expired');
 return {uid:String(body.data.mid),name:String(body.data.uname),avatar:String(body.data.face??'')};
}
