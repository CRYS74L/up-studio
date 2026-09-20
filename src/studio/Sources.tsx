import {BackupPanel} from './BackupPanel';
import {syncDay} from '../../shared/sync-days';
import {SyncFreshness} from './FreshnessAge';
import './sources-layout.css';
import {AccountSettings} from './Account';
import {SyncHistory} from './SyncHistory';
import {Select} from './Select';
import {SyncButton} from './SyncButton';
import {useEffect,useState} from 'react';
import {useQuery,useQueryClient,useMutation,keepPreviousData} from '@tanstack/react-query';
import QRCode from 'qrcode';
import {CheckCircle2,Clock3,Database,RefreshCw,Server,ShieldCheck,Unplug,Link2,ChevronDown} from 'lucide-react';
import {request,date,percent,ageLabel} from '../format';
import {useSync} from '../use-sync';
import {useDashboardData} from '../use-dashboard-data';
import {Empty,Stat,Sheet,AnimatePresence} from './ui';
export type LocalStatus={ok:boolean;pid:number;version:string;uptime:number;autoCollect:boolean;intervalMinutes:number;collecting:boolean;lastCollection:string|null;runtime:string};

export function uptimeLabel(seconds:number){const minutes=Math.floor(seconds/60);return minutes>=60?`${Math.floor(minutes/60)} 小时 ${minutes%60} 分钟`:`${minutes} 分钟`;}
const runNames:Record<string,string>={success:'采集完成',partial:'部分完成',failed:'采集失败',running:'正在采集'};
export function Sources({sync}:{sync:ReturnType<typeof useSync>}){
  const client=useQueryClient();const {summary}=useDashboardData();
  const connection=useQuery({queryKey:['bili-status'],queryFn:()=>request<any>('/api/bilibili/status'),refetchInterval:15000});
  const local=useQuery({queryKey:['local-status'],queryFn:()=>request<LocalStatus>('/api/local/status'),retry:false,refetchInterval:15000});
  const schedule=useMutation({mutationFn:(intervalMinutes:number)=>request('/api/local/schedule',{method:'PUT',body:JSON.stringify({intervalMinutes})}),onSuccess:()=>client.invalidateQueries({queryKey:['local-status']})});
  const [historyDay,setHistoryDay]=useState('');
  const history=useQuery({queryKey:['acquisition-history',historyDay],placeholderData:keepPreviousData,queryFn:()=>request<{runs:any[];day:string;today:string;firstDay:string|null}>('/api/acquisition/runs'+(historyDay?'?day='+historyDay:'')),refetchInterval:5000});
  const shownDay=history.data?.day||historyDay||syncDay();

  const [qr,setQr]=useState<{key:string;image:string}|null>(null),[qrState,setQrState]=useState('waiting'),[error,setError]=useState(''),[starting,setStarting]=useState(false),[confirm,setConfirm]=useState(false);
  const disconnect=useMutation({mutationFn:()=>request('/api/bilibili/qr/disconnect',{method:'POST'}),onSuccess:async()=>{setConfirm(false);await client.invalidateQueries();}});
  async function start(){setStarting(true);setError('');try{const r=await request<{url:string;key:string}>('/api/bilibili/qr/start',{method:'POST'});setQr({key:r.key,image:await QRCode.toDataURL(r.url,{width:250,margin:1})});setQrState('waiting');}catch(e){setError((e as Error).message)}finally{setStarting(false)}}
  useEffect(()=>{if(!qr||!['waiting','scanned'].includes(qrState))return;let cancelled=false,timer:ReturnType<typeof setTimeout>;async function poll(){try{const r=await request<{state:string}>(`/api/bilibili/qr/status/${qr!.key}`);if(cancelled)return;setQrState(r.state);if(r.state==='confirmed'){setQr(null);await client.invalidateQueries();}else if(['waiting','scanned'].includes(r.state))timer=setTimeout(poll,1800);}catch(e){if(!cancelled){setError((e as Error).message);setQrState('expired')}}}timer=setTimeout(poll,1800);return()=>{cancelled=true;clearTimeout(timer)}},[qr,qrState,client]);
  useEffect(()=>{if(location.hash.includes('connect=1'))void start();},[]);
  const runtime=local.error?undefined:local.data;
  const details=summary?.acquisition?.details;const total=details?.totalVideos??0;const connected=connection.data?.connected;const sessionBad=connection.data?.lastRun?.error_code==='session_expired';
  return <div className="s-sources" data-page-pending={connection.isPending||local.isPending||history.isPending}><div className="s-two-col">
   <section className="s-panel s-connection"><div className="s-connection-accounts"><AccountSettings/></div></section>
   <section className="s-panel s-local-service"><header className="s-source-heading"><span className="s-service-symbol blue"><RefreshCw/></span><div><h2>数据更新</h2></div><span className={`s-state ${connected&&!sessionBad?'ok':'warning'}`}>{connection.isPending?'读取中':connected&&!sessionBad?'已运行 '+(runtime?uptimeLabel(runtime.uptime):'—'):'断开连接'}</span></header>
    <div className="s-update-summary"><div><strong><SyncFreshness capturedAt={summary?.summary.fresh} fallback={summary?.freshnessMinutes}/></strong><small>本轮同步 {total} 篇稿件</small></div>{connected&&!sessionBad?<div className="s-sync-actions"><button className="s-text" onClick={()=>setConfirm(true)}>断开连接</button><button className="s-primary" disabled={sync.isPending} onClick={()=>sync.mutate()}><RefreshCw className={sync.isPending?'spin':''}/>{sync.isPending?'正在同步':'立即同步'}</button></div>:<button className="s-primary" disabled={starting} onClick={start}><Link2/>{starting?'生成二维码…':'扫码连接'}</button>}</div>
    {(error||sync.error||connection.error)&&<p className="s-error" role="alert">{error||sync.error?.message||connection.error?.message}</p>}
    <div className="s-update-schedule"><div><b>自动更新</b><small>{runtime?.autoCollect?'按计划同步最新的创作数据':'需要时手动同步数据'}</small></div><Select aria-label="自动更新频率" value={runtime?.intervalMinutes??10} onChange={e=>schedule.mutate(Number(e.target.value))}>{[[0,'仅手动更新'],[5,'每5分钟'],[10,'每10分钟'],[15,'每15分钟'],[30,'每30分钟'],[60,'每1小时']].map(([n,label])=><option key={n} value={n}>{label}</option>)}</Select></div>
    {schedule.error&&<p className="s-error">{schedule.error.message}</p>}
   </section></div>
    <section className="s-panel s-sync-records-panel"><SyncHistory runs={history.data?.runs??[]} day={shownDay} today={history.data?.today??syncDay()} firstDay={history.data?.firstDay??null} onDayChange={day=>setHistoryDay(day===syncDay()?'':day)} loading={history.isPending||history.isPlaceholderData} error={!!history.error}/></section>
    <BackupPanel/>
    <AnimatePresence>{qr&&<Sheet key="qr" title="连接 B 站" subtitle={qrState==='scanned'?'已扫码，请在手机确认':qrState==='expired'?'二维码已过期，请重新获取':'使用哔哩哔哩 App 扫描二维码'} close={()=>setQr(null)}><div className="s-qr"><img src={qr.image} alt="B 站登录二维码"/>{qrState==='expired'&&<button className="s-primary" onClick={start}>重新获取</button>}</div></Sheet>}{confirm&&<Sheet key="disconnect" compact title="断开连接" subtitle="历史数据会保留，自动采集将暂停。重新扫码即可恢复。" close={()=>setConfirm(false)} footer={<><button className="s-secondary" onClick={()=>setConfirm(false)}>取消</button><button className="s-primary" disabled={disconnect.isPending} onClick={()=>disconnect.mutate()}>确认断开</button></>}>{disconnect.error&&<p role="alert">{disconnect.error.message}</p>}</Sheet>}</AnimatePresence>
  </div>;
}
