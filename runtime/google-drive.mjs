import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
export const driveScope='https://www.googleapis.com/auth/drive.file';
export function googleConfig(root){
 const file=path.join(root,'google-oauth.json');if(!fs.existsSync(file))return null;
 const raw=JSON.parse(fs.readFileSync(file,'utf8')),c=raw.web??raw;
 const clientId=c.client_id,clientSecret=c.client_secret,redirectUri=c.redirect_uri??c.redirect_uris?.[0];
 if(typeof clientId!=='string'||!clientId.endsWith('.apps.googleusercontent.com')||typeof clientSecret!=='string'||/[\r\n\0]/.test(clientId+clientSecret)||!redirectUri)throw Error('Google OAuth 配置无效');
 const uri=new URL(redirectUri);if(uri.pathname!=='/api/backups/google/callback'||uri.search||uri.hash||uri.username||uri.password||!(uri.protocol==='https:'||(uri.protocol==='http:'&&['localhost','127.0.0.1'].includes(uri.hostname))))throw Error('Google OAuth 回调地址无效');
 return {clientId,clientSecret,redirectUri:uri.toString()};
}
export function beginGoogleAuth(config){
 if(!config)throw Error('请先由部署者配置 UP Studio 的 Google OAuth 应用');
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 Object.entries({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:driveScope,access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).forEach(([k,v])=>url.searchParams.set(k,v));
 return {id:state,url:url.toString(),verifier,config,token:null,error:null,expires:Date.now()+600000};
}
export async function finishGoogleAuth(auth,url,fetcher=fetch){
 if(!auth||auth.expires<Date.now()||auth.id!==url.searchParams.get('state')||auth.used)throw Error('授权已过期或无效，请重新开始');
 auth.used=true;
 if(url.searchParams.has('error'))throw Error('Google 授权未完成，请重试');
 const code=url.searchParams.get('code');if(!code)throw Error('Google 未返回授权码');
 const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:auth.config.clientId,client_secret:auth.config.clientSecret,redirect_uri:auth.config.redirectUri,grant_type:'authorization_code',code,code_verifier:auth.verifier}),signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(!response.ok||!data.access_token||!data.refresh_token||!String(data.scope??'').split(' ').includes(driveScope))throw Error('Google 授权交换失败或未授予文件访问权限');
 auth.token={access_token:data.access_token,refresh_token:data.refresh_token,token_type:'Bearer',expiry:new Date(Date.now()+Number(data.expires_in??3600)*1000).toISOString()};delete auth.verifier;
 return auth.token;
}
async function driveRequest(token,suffix,options={},fetcher=fetch){
 const response=await fetcher('https://www.googleapis.com/drive/v3/'+suffix,{...options,headers:{authorization:'Bearer '+token.access_token,'content-type':'application/json'},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(response.status===401?'Google 授权已失效，请重新关联':'无法访问 UP Studio 云盘文件夹');return response.json();
}
const folderType='application/vnd.google-apps.folder';
export async function resolveGoogleFolder(token,fetcher=fetch){
 const q="'root' in parents and trashed=false and mimeType='"+folderType+"' and appProperties has { key='upStudioBackup' and value='statistics-v1' }";
 let rows=[],pageToken;
 do{const query=new URLSearchParams({q,fields:'nextPageToken,files(id,name,mimeType,parents,appProperties,trashed)',pageSize:'1000',...(pageToken?{pageToken}:{})});const data=await driveRequest(token,'files?'+query,{},fetcher);rows.push(...(data.files??[]));pageToken=data.nextPageToken;}while(pageToken);
 if(rows.length>1)throw Error('发现多个 UP Studio 备份文件夹，请先在云盘中确认保留的备份目录');
 if(rows.length)return rows[0].id;
 const misplaced=await driveRequest(token,'files?'+new URLSearchParams({q:q.replace("'root' in parents and ",''),fields:'files(id)',pageSize:'1'}),{},fetcher);if(misplaced.files?.length)throw Error('UP Studio 备份文件夹已移出根目录，请先移回');
 const created=await driveRequest(token,'files?fields=id',{method:'POST',body:JSON.stringify({name:'UP Studio',mimeType:folderType,parents:['root'],appProperties:{upStudioBackup:'statistics-v1'}})},fetcher);
 if(!/^[\w-]+$/.test(created.id??''))throw Error('Google 未返回有效文件夹 ID');return created.id;
}
