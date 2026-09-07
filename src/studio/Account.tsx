import {Preferences} from './Preferences';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useState,useEffect} from 'react';
import {UserRound,ArrowLeftRight,ExternalLink} from 'lucide-react';
import {request} from '../format';
import {Sheet,Segments} from './ui';
import {navigate} from './route';
type Profile={uid:string;name:string;avatar:string};
export function Account(){
 const client=useQueryClient(),[open,setOpen]=useState(false),[error,setError]=useState(''),[section,setSection]=useState('账号');
 useEffect(()=>{const handler=()=>{setSection('AI设置');setOpen(true)};window.addEventListener('open-account-settings',handler);return()=>window.removeEventListener('open-account-settings',handler)},[]);
 const q=useQuery({queryKey:['account-profile'],queryFn:()=>request<{profile:Profile|null;accounts:Profile[]}>('/api/account/profile'),staleTime:300000});const p=q.data?.profile;
 const avatar=p?.avatar?<img src={p.avatar} alt="" referrerPolicy="no-referrer"/>:<UserRound/>;
 async function change(uid:string){try{await request('/api/account/switch',{method:'POST',body:JSON.stringify({uid})});await client.invalidateQueries();setOpen(false);navigate('overview');}catch(e){setError((e as Error).message)}}
 return <><button className="s-sidebar-footer" aria-label="UP主账号" onClick={()=>{setSection('账号');setOpen(true)}}><span className="s-avatar">{avatar}</span><div><b>{p?.name??(q.isPending?'读取账号…':'连接UP主账号')}</b><small>{p?'UID '+p.uid:'点击管理账号连接'}</small></div></button>{open&&<Sheet wide title={p?.name??'UP主账号'} subtitle={p?'UID '+p.uid:'扫码连接后显示真实UP主资料'} close={()=>setOpen(false)}><Segments items={['账号','AI设置','数据导出']} value={section} onChange={setSection} label="账号面板"/>{section==='账号'?<><div className="s-account-profile"><span className="s-avatar">{avatar}</span><div><b>{p?.name??'尚未读取UP主资料'}</b><p className="s-muted">{p?'已连接的哔哩哔哩账号':'昵称和头像由登录账号提供'}</p></div></div><div className="s-workspace-actions">{p&&<a className="s-secondary" href={`https://space.bilibili.com/${p.uid}`} target="_blank" rel="noreferrer"><ExternalLink/> UP主个人主页</a>}{q.data?.accounts.filter(a=>a.uid!==p?.uid).map(a=><button key={a.uid} onClick={()=>change(a.uid)}><ArrowLeftRight/><span>切换至 {a.name}<small>UID {a.uid}</small></span></button>)}<button onClick={()=>{setOpen(false);navigate('sources',{connect:'1'});}}><ArrowLeftRight/><span><b>切换 / 添加账号</b><small>使用目标UP主扫码登录，历史按账号独立保存</small></span></button></div></>:<Preferences section={section==='AI设置'?'ai':'export'}/>} {(error||q.error)&&<p role="alert" className="s-error">{error||q.error?.message}</p>}</Sheet>}</>;
}
