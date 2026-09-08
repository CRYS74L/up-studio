import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {UserRound,Plus,Check,ArrowLeftRight} from 'lucide-react';
import {request} from '../format';
import {ConnectAccount} from './ConnectAccount';
import {Sheet,AnimatePresence} from './ui';
type Profile={uid:string;name:string;avatar:string};
function useProfile(){return useQuery({queryKey:['account-profile'],queryFn:()=>request<{profile:Profile|null;accounts:Profile[]}>('/api/account/profile'),staleTime:300000})}
function Avatar({profile}:{profile:Profile|null|undefined}){return <span className="s-avatar">{profile?.avatar?<img src={profile.avatar} alt="" referrerPolicy="no-referrer"/>:<UserRound/>}</span>}
export function Account(){const q=useProfile(),p=q.data?.profile;return <div className="s-sidebar-footer" aria-label="UP主信息"><Avatar profile={p}/><div><b>{p?.name??(q.isPending?'读取账号…':'未连接账号')}</b><small>{p?'UID '+p.uid:'在设置中连接账号'}</small></div></div>}
export function AccountSettings(){const q=useProfile(),client=useQueryClient(),[connecting,setConnecting]=useState(false),[switching,setSwitching]=useState(''),[error,setError]=useState('');const p=q.data?.profile,accounts=q.data?.accounts??[];const list=p&&!accounts.some(a=>a.uid===p.uid)?[p,...accounts]:accounts;
 async function change(uid:string){setSwitching(uid);setError('');try{await request('/api/account/switch',{method:'POST',body:JSON.stringify({uid})});await client.cancelQueries();client.removeQueries({predicate:q=>!['account-profile','local-status','deepseek-status','ai-status'].includes(String(q.queryKey[0]))});await client.invalidateQueries();}catch(e){setError((e as Error).message)}finally{setSwitching('')}}
 return <><div className="s-section-head"><h2>哔哩哔哩账号</h2><button className="s-secondary" onClick={()=>setConnecting(true)}><Plus/> 添加账号</button></div><div className="s-account-list">{list.map(a=><div className="s-account-row" key={a.uid}><Avatar profile={a}/><div><b>{a.name}</b><small>UID {a.uid}</small></div>{a.uid===p?.uid?<span className="s-current-account"><Check/> 当前账号</span>:<button className="s-secondary" disabled={!!switching} onClick={()=>change(a.uid)}><ArrowLeftRight/>{switching===a.uid?'切换中…':'切换账号'}</button>}</div>)}</div>{!list.length&&<p className="s-muted">添加账号后开始同步创作数据。</p>}{(error||q.error)&&<p role="alert" className="s-error">{error||q.error?.message}</p>}<AnimatePresence>{connecting&&<Sheet title="添加哔哩哔哩账号" close={()=>setConnecting(false)}><ConnectAccount done={()=>setConnecting(false)}/></Sheet>}</AnimatePresence></>;
}
