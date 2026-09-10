import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {request} from '../format';
import {Preferences} from './Preferences';
import {AccountSettings} from './Account';
import {Segments} from './ui';
export function SettingsPage(){const [section,setSection]=useState(location.hash.includes('tab=ai')?'AI设置':'账号');const runtime=useQuery({queryKey:['local-status'],queryFn:()=>request<any>('/api/local/status')});return <div className="s-settings-page"><Segments label="设置分类" items={['账号','AI设置']} value={section} onChange={setSection}/><section key={section} className="s-panel s-content-enter">{section==='账号'?<AccountSettings/>:<Preferences/>}</section><div className="s-version"><img src="/brand/up-mark.svg" alt=""/><span>UP Studio <small>{runtime.data?.version??'版本读取中'}</small></span></div></div>}
