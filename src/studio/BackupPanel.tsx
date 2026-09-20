import {useEffect,useRef,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {CloudUpload,Link2,RotateCcw,Unplug,Check} from 'lucide-react';
import {request} from '../format';
import {Sheet,Segments,AnimatePresence} from './ui';
import {Select} from './Select';
import './backup-panel.css';
type Connection={id:string;provider:'google'|'webdav';label:string;folder:string;endpoint?:string;autoHours:number;lastBackup?:{at:string;bytes:number;uploadedBytes:number;verified:boolean}};
type Job={id:string;kind:string;status:string;phase:string;error?:string;result?:any};
type BackupStatus={available:boolean;googleConfigured:boolean;recoveryOnly:boolean;profiles:Connection[];job:Job|null;googleAuth:{id:string;url:string|null;ready:boolean;error:string|null}|null};
const bytes=(n:number|undefined)=>n==null?'—':n>=1e9?(n/1e9).toFixed(2)+' GB':n>=1e6?(n/1e6).toFixed(1)+' MB':Math.ceil(n/1000)+' KB';
const time=(value:string)=>new Date(value).toLocaleString('zh-CN',{hour12:false});
const post=(url:string,body:unknown={})=>request<any>(url,{method:'POST',body:JSON.stringify(body)});
export function BackupPanel(){
 const client=useQueryClient(),status=useQuery({queryKey:['cloud-backups'],queryFn:()=>request<BackupStatus>('/api/backups/status'),refetchInterval:2000});
 const [selected,setSelected]=useState(''),[dialog,setDialog]=useState<'connect'|'restore'|'confirm'|null>(null),[confirmation,setConfirmation]=useState(''),[notice,setNotice]=useState('');
 const handled=useRef(''),profiles=status.data?.profiles??[],profile=profiles.find(p=>p.id===selected)??profiles[0],job=status.data?.job,busy=job?.status==='running';
 const action=useMutation({mutationFn:({url,body}:{url:string;body?:unknown})=>post(url,body),onSuccess:()=>client.invalidateQueries({queryKey:['cloud-backups']})});
 useEffect(()=>{if(!job||handled.current===job.id+job.status)return;handled.current=job.id+job.status;if(job.kind==='prepare'&&job.status==='ready'){setConfirmation('');setDialog('confirm')}if(job.kind==='restore'&&job.status==='success'){setDialog(null);setNotice('数据已恢复，恢复前的数据已另存保留。');void client.invalidateQueries();}if(job.kind==='backup'&&job.status==='success')setNotice('备份已上传，并通过完整回读校验。');},[job?.id,job?.status]);
 const cancelRestore=()=>{if(!busy&&!action.isPending&&job?.result?.token)action.mutate({url:'/api/backups/restore/cancel',body:{token:job.result.token}},{onSuccess:()=>setDialog(null)})};
 return <section className="s-panel s-backup-panel"><header className="s-source-heading"><span className="s-service-symbol purple"><CloudUpload/></span><div><h2>数据备份</h2></div><span className="s-state">{busy?'处理中':profiles.length?'已关联':'未关联'}</span></header>
 {status.data?.recoveryOnly&&<p className="s-backup-warning">当前数据库不可用。云盘连接仍可使用，请选择备份恢复数据。</p>}
 {profile?<><div className="s-backup-destination"><Select aria-label="备份目标云盘" value={profile.id} onChange={event=>setSelected(event.target.value)} disabled={busy}>{profiles.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</Select><button className="s-icon" aria-label="解除当前备份云盘关联" disabled={busy||action.isPending} onClick={()=>action.mutate({url:'/api/backups/disconnect',body:{id:profile.id}})}><Unplug/></button></div><p className="s-backup-folder" title={profile.folder}>文件夹 · {profile.folder}</p><div className="s-backup-summary"><strong>{profile.lastBackup?time(profile.lastBackup.at):'尚未备份'}</strong><span>{profile.lastBackup?'新增上传 '+bytes(profile.lastBackup.uploadedBytes)+' · 已校验':'统计数据备份，重复内容不重复上传'}</span><small>{profile.autoHours?'每天自动备份':'手动备份'}</small></div></>:null}
 {busy&&<p className="s-backup-progress" role="status">{job.phase}…</p>}{notice&&!busy&&<p className="s-backup-note" role="status">{notice}</p>}
 {(status.error||action.error||job?.status==='failed')&&<p className="s-error" role="alert">{status.error?.message||action.error?.message||job?.error}</p>}
 {status.data&&!status.data.available&&<p className="s-backup-warning">备份工具尚未准备好，请按部署说明安装 rclone 和 restic。</p>}
 <div className="s-backup-actions"><button className="s-secondary" disabled={busy||!status.data?.available} onClick={()=>{action.reset();setDialog('connect')}}><Link2/>{profiles.length?'关联其他云盘':'关联云盘'}</button><button className="s-secondary" disabled={busy||!profile||status.data?.recoveryOnly} onClick={()=>{setNotice('');action.mutate({url:'/api/backups/run',body:{id:profile.id}})}}><CloudUpload/>立即备份</button><button className="s-text" disabled={busy||!profile} onClick={()=>{action.reset();setDialog('restore')}}><RotateCcw/>恢复数据</button></div>
 <AnimatePresence>{dialog==='connect'&&<ConnectBackup status={status.data} close={()=>setDialog(null)} done={id=>{setSelected(id);setDialog(null);void client.invalidateQueries({queryKey:['cloud-backups']})}}/>}{dialog==='restore'&&profile&&<RestoreList profile={profile} busy={busy} close={()=>setDialog(null)} prepare={snapshot=>action.mutate({url:'/api/backups/restore/prepare',body:{id:profile.id,snapshot}})} phase={busy?job.phase:undefined} error={action.error?.message||(job?.status==='failed'?job.error:undefined)}/>} {dialog==='confirm'&&job?.result?.token&&<Sheet title="恢复数据" subtitle="备份已通过完整校验。恢复会替换当前所有账号的数据并退出登录，替换前会保留当前数据库副本。恢复后请重新登录。" close={cancelRestore} footer={<><button className="s-secondary" disabled={busy||action.isPending} onClick={cancelRestore}>取消</button><button className="s-primary" disabled={busy||action.isPending||confirmation!=='恢复数据'} onClick={()=>action.mutate({url:'/api/backups/restore/commit',body:{token:job.result.token,confirmation}})}>{busy?'正在恢复':'确认恢复'}</button></>}><div className="s-backup-restore-summary"><time>{time(job.result.createdAt)}</time><p>{job.result.accounts} 个账号 · {job.result.videos} 篇稿件 · {job.result.snapshots} 条快照</p></div><label className="s-backup-field">输入“恢复数据”确认<input value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="off"/></label>{action.error&&<p className="s-error">{action.error.message}</p>}</Sheet>}</AnimatePresence>
 </section>;
}
function ConnectBackup({status,close,done}:{status?:BackupStatus;close:()=>void;done:(id:string)=>void}){
 const client=useQueryClient(),[provider,setProvider]=useState('Google Drive'),[endpoint,setEndpoint]=useState(''),[folder,setFolder]=useState(''),[username,setUsername]=useState(''),[davPassword,setDavPassword]=useState(''),[autoHours,setAutoHours]=useState(0),[authId,setAuthId]=useState('');
 const authRef=useRef(''),popup=useRef<Window|null>(null),attempt=useRef(0);
 const cancelAuth=()=>{attempt.current++;popup.current?.close();popup.current=null;if(authRef.current)void post('/api/backups/google/cancel',{id:authRef.current}).catch(()=>{});authRef.current='';};
 useEffect(()=>()=>cancelAuth(),[]);
 const google=provider==='Google Drive',auth=status?.googleAuth,authorized=google&&auth?.id===authId&&auth.ready;
 const authorize=useMutation({mutationFn:async({window:target,generation}:{window:Window;generation:number})=>{
  const result=await post('/api/backups/google/start');
  if(attempt.current!==generation){void post('/api/backups/google/cancel',{id:result.id}).catch(()=>{});return;}
  authRef.current=result.id;setAuthId(result.id);
  const deadline=Date.now()+30000;
  while(attempt.current===generation){
   if(target.closed)throw Error('授权窗口已关闭，请重新授权');
   const state=await request<BackupStatus>('/api/backups/status');
   if(attempt.current!==generation)return;
   const current=state.googleAuth;
   if(!current||current.id!==result.id)throw Error('授权已取消，请重试');
   if(current.error)throw Error(current.error);
   if(current.url){target.opener=null;target.location.replace(current.url);void client.invalidateQueries({queryKey:['cloud-backups']});return;}
   if(Date.now()>deadline)throw Error('准备授权超时，请重试');
   await new Promise(resolve=>setTimeout(resolve,250));
  }
 },onError:(_error,variables)=>{if(attempt.current===variables.generation)cancelAuth()}});
 const openAuthorization=()=>{
  cancelAuth();setAuthId('');authorize.reset();
  const target=window.open('about:blank','_blank');
  if(!target){setPopupError('浏览器拦截了授权窗口，请允许此网站打开弹窗后重试。');return;}
  setPopupError('');popup.current=target;
  target.document.title='Google Drive 授权';
  target.document.body.textContent='正在连接 Google Drive，授权页面将自动打开…';
  target.document.body.style.cssText='font:16px system-ui;padding:48px;color:#555';
  authorize.mutate({window:target,generation:attempt.current});
 };
 const [popupError,setPopupError]=useState('');
 const connect=useMutation({mutationFn:()=>{return post('/api/backups/connections',{provider:google?'google':'webdav',authId,endpoint,folder,username,davPassword,autoHours})},onSuccess:result=>done(result.profile.id)});
 return <Sheet title="关联备份云盘" subtitle="备份只写入指定的专用文件夹。仅备份稿件、粉丝等统计数据，不含账号授权、服务密钥和 AI 会话。恢复后重新登录账号，无需备份密码。" close={()=>{if(!connect.isPending)close()}} footer={<><button className="s-secondary" disabled={connect.isPending} onClick={close}>取消</button><button className="s-primary" disabled={connect.isPending||(google&&!authorized)||(!google&&(!endpoint||!username||!davPassword))||(!google&&!folder)} onClick={()=>connect.mutate()}>{connect.isPending?'正在连接并检查':'关联云盘'}</button></>}>
 <Segments label="备份云盘类型" items={['Google Drive','WebDAV']} value={provider} onChange={value=>{cancelAuth();setAuthId('');authorize.reset();setPopupError('');setProvider(value);setFolder('');connect.reset()}}/>
 {google?<div className="s-backup-auth">{authorized?<span><Check/>Google Drive 已授权</span>:<><button className="s-secondary" disabled={authorize.isPending||!status?.googleConfigured} onClick={openAuthorization}>{authorize.isPending?'正在打开授权…':auth?.id===authId&&!auth.error?'重新打开授权':'授权 Google Drive'}</button>{authId&&auth?.id===authId&&!auth.error&&<span role="status">请在 Google 页面完成授权</span>}</>}{auth?.id===authId&&auth.error&&<p className="s-error">{auth.error}</p>}</div>:<><label className="s-backup-field">WebDAV 服务地址<input value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="https://dav.example.com/dav/" autoComplete="url"/></label><div className="s-backup-form-row"><label className="s-backup-field">用户名<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="off"/></label><label className="s-backup-field">WebDAV 密码<input type="password" value={davPassword} onChange={e=>setDavPassword(e.target.value)} autoComplete="new-password"/></label></div></>}
 {google?<p className="s-backup-note">{status?.googleConfigured?'自动在 Google Drive 根目录创建并复用 UP Studio 文件夹。':'Google 授权尚待部署者配置，配置完成后即可连接。'}</p>:<label className="s-backup-field">目标文件夹路径<input value={folder} onChange={e=>setFolder(e.target.value)} placeholder="例如：备份/UP Studio" autoComplete="off"/><small>相对于 WebDAV 地址，请使用专用文件夹。</small></label>}

 <label className="s-backup-field">备份频率<Select aria-label="云盘备份频率" value={autoHours} onChange={e=>setAutoHours(Number(e.target.value))}><option value={0}>仅手动备份</option><option value={24}>每天自动备份</option></Select></label>{(connect.error||authorize.error||popupError)&&<p className="s-error" role="alert">{connect.error?.message||authorize.error?.message||popupError}</p>}
 </Sheet>;
}
function RestoreList({profile,close,prepare,busy,phase,error}:{profile:Connection;close:()=>void;prepare:(id:string)=>void;busy:boolean;phase?:string;error?:string}){
 const list=useQuery({queryKey:['cloud-backup-snapshots',profile.id],queryFn:()=>request<{snapshots:Array<{id:string;time:string;bytes:number|null}>}>('/api/backups/snapshots?id='+encodeURIComponent(profile.id)),refetchOnWindowFocus:false});
 return <Sheet title="从云盘恢复" subtitle={profile.label+' · '+profile.folder} close={()=>{if(!busy)close()}}><p className="s-backup-note">先选择备份进行完整下载和校验，此步骤不会修改当前数据。</p>{list.isPending?<p role="status">正在读取云盘备份…</p>:list.error?<p className="s-error">{list.error.message}</p>:!list.data?.snapshots.length?<p>此文件夹暂无 UP Studio 备份。</p>:<div className="s-backup-snapshots">{list.data.snapshots.map(snapshot=><button className="s-secondary" key={snapshot.id} disabled={busy} onClick={()=>prepare(snapshot.id)}><span>{time(snapshot.time)}</span><small>{snapshot.bytes==null?'完整恢复点':bytes(snapshot.bytes)} · 检查并恢复</small></button>)}</div>}{phase&&<p role="status">{phase}…</p>}{error&&<p className="s-error" role="alert">{error}</p>}</Sheet>;
}
