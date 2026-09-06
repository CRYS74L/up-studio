import {useState} from 'react';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {Download,KeyRound,ShieldCheck,Cloud} from 'lucide-react';
import {useDashboardData} from '../use-dashboard-data';
import {request,date} from '../format';
export function Preferences(){
  const {summary,videos}=useDashboardData(),client=useQueryClient();const [message,setMessage]=useState(''),[key,setKey]=useState('');
  const status=useQuery({queryKey:['deepseek-status'],queryFn:()=>request<any>('/api/settings/deepseek/status')});
  const save=useMutation({mutationFn:()=>request('/api/settings/deepseek',{method:'PUT',body:JSON.stringify({apiKey:key})}),onSuccess:async()=>{setKey('');await client.invalidateQueries({queryKey:['deepseek-status']});}});
  function exportSnapshot(){const payload={format:'bilibili-insights-snapshot',version:1,exportedAt:new Date().toISOString(),capturedAt:summary?.summary.fresh,summary:summary?.summary,videos};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`bilibili-snapshot-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('已发起快照下载');}
  return <div className="s-preferences"><section className="s-panel"><div className="s-setting-title"><span className="s-service-symbol blue"><Download/></span><div><h2>数据由你保管</h2><p>导出当前批次的稿件、指标与来源维度，保存为 JSON 文件。</p></div></div><button className="s-secondary" disabled={!videos.length} onClick={exportSnapshot}>导出当前快照</button><p className="s-note">不含登录会话和 API 密钥，不代表完整数据库备份。</p>{message&&<p role="status">{message}</p>}</section>
    <section className="s-panel"><div className="s-setting-title"><span className="s-service-symbol purple"><KeyRound/></span><div><h2>DeepSeek 连接</h2><p>{status.data?.configured?'密钥已加密保存':'尚未配置密钥'} · AI 分析功能尚未接入</p></div></div><label className="s-field">API Key<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder="输入后加密保存在本机"/></label><button className="s-secondary" disabled={!key.trim()||save.isPending} onClick={()=>save.mutate()}>{save.isPending?'保存中':'保存密钥'}</button>{save.error&&<p className="s-error" role="alert">{save.error.message}</p>}<p className="s-note">保存凭据不会向模型发送你的稿件数据。</p></section>
    <section className="s-panel"><div className="s-setting-title"><span className="s-service-symbol teal"><ShieldCheck/></span><div><h2>本地数据与启动</h2><p>独立 SQLite 保存数据，自动采集每 15 分钟运行。服务管理脚本仅操作本项目的计划任务。</p></div></div><p className="s-note">运行状态与同步记录可在「数据源」查看。云端备份、历史表格导入仍未接入。</p></section></div>;
}
