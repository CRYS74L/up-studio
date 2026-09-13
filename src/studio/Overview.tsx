import {useQuery} from '@tanstack/react-query';
import {Clock3,ArrowUpRight,Play,Users,Timer,PieChart,ArrowRight} from 'lucide-react';
import {useDashboardData} from '../use-dashboard-data';
import {compact,percent,seconds,date,ageLabel,formatChange,request,escapeHtml} from '../format';
import {Chart} from '../components/Chart';
import {chartBase,MetricChart,Sparkline} from './charts';
import {Cover,Empty,Stat} from './ui';
import {navigate} from './route';

export function Overview(){
  const {summary,videos,pending,error,retry}=useDashboardData();
  const history=useQuery({queryKey:['overview-history'],staleTime:60000,queryFn:()=>request<{points:Array<Record<string,any>>}>('/api/dashboard/history'),enabled:!!summary?.configured&&!summary?.miniTrends});
  const accountHistory=useQuery({queryKey:['account-history'],queryFn:()=>request<{points:Array<{followers:number|null}>}>('/api/account/history'),enabled:!!summary?.configured&&!summary?.miniTrends});
  if(pending)return <div className="s-loading" role="status">正在整理你的创作数据…</div>;
  if(error)return <Empty title="暂时无法读取概览" body={error.message} action={<button className="s-primary" onClick={retry}>重试</button>}/>;
  if(!summary?.configured||!videos.length)return <Empty title="把创作，变成看得见的成长" body="连接 B 站创作中心，建立第一份真实快照。" action={<button className="s-primary" onClick={()=>navigate('sources')}>连接 B 站 <ArrowRight/></button>}/>;
  const s=summary.summary,base=chartBase(),recent=videos.slice(0,8),ranked=videos.filter(v=>v.cover_ctr!=null).sort((a,b)=>b.published_at.localeCompare(a.published_at));
  const cards=[{key:'account_followers',label:'粉丝量',value:compact(s.account_followers),color:'#FF82B2',Icon:Users},{key:'views',label:'播放量',value:compact(s.views),color:'#89B8FF',Icon:Play},{key:'avg_views',label:'平均播放量',value:compact(s.avg_views),color:'#93CDD9',Icon:Timer},{key:'avg_interactions',label:'平均互动量',value:compact(s.avg_interactions),color:'#B3A0FF',Icon:PieChart}];
  return <div className="s-overview">
    <section className="s-overview-kpis">{cards.map(({key,label,value,color,Icon})=><article key={key}><div className="s-kpi-name"><Icon style={{color}}/>{label}</div><strong>{value}</strong><div className="s-kpi-bottom"><span className="s-kpi-change"><small>{summary.comparisonLabels?.[key]?.replace('相比上月','较上月变化').replace('相比上周','较上周变化').replace('相比昨天','较昨日变化')??'暂无共同对比数据'}</small><b data-direction={summary.comparison?.[key]?.direction}>{summary.comparison?.[key]&&<svg className="s-delta-triangle" viewBox="0 0 18 12" aria-hidden="true"><path d="M8 1.8 Q9 .5 10 1.8 L16 9 Q18 11 15.5 11 H2.5 Q0 11 2 9 Z" fill="currentColor"/></svg>}{summary.comparison?.[key]?Math.abs(summary.comparison[key]!.delta).toLocaleString('zh-CN',{useGrouping:false,maximumFractionDigits:Math.abs(summary.comparison[key]!.delta)<.01?6:2}):'—'}</b></span><Sparkline pending={key==='account_followers'?accountHistory.isPending:history.isPending} values={key==='account_followers'?(summary.miniTrends?.account??accountHistory.data?.points??[]).map(p=>p.followers):(summary.miniTrends?.overview??history.data?.points??[]).map(p=>p[key]??null)} color={color}/></div></article>)}</section>

    <div className="s-overview-middle"><section className="s-panel"><div className="s-section-head"><div><h2>封标点击率</h2></div></div>{ranked.length?<MetricChart videos={ranked} id="cover_ctr" horizontal/>:<Empty title="暂无评分" body="本次未获取到吸引力评分。"/>}</section>
    <section className="s-panel s-recent-panel"><div className="s-section-head"><div><h2>最近发布的稿件</h2></div></div><div className="s-recent-grid">{recent.map(v=><button key={v.id} className="s-recent-item" onClick={()=>navigate('videos',{video:v.id})}><Cover video={v}/><h3>{v.title}</h3><p>{date(v.published_at).split(' ')[0]}</p><div><Stat label="播放" value={compact(v.views)}/><Stat label="吸引力" value={v.cover_ctr==null?'—':v.cover_ctr.toFixed(1)+' 星'}/><Stat label="观看进度" value={percent(v.avg_watch_percent)}/></div></button>)}</div></section></div>
  </div>;
}
