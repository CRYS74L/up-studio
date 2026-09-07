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
  const history=useQuery({queryKey:['overview-history',summary?.summary.fresh],queryFn:()=>request<{points:Array<Record<string,any>>}>('/api/dashboard/history'),enabled:!!summary?.configured});
  const accountHistory=useQuery({queryKey:['account-history'],queryFn:()=>request<{points:Array<{followers:number|null}>}>('/api/account/history'),enabled:!!summary?.configured});
  if(pending)return <div className="s-loading" role="status">正在整理你的创作数据…</div>;
  if(error)return <Empty title="暂时无法读取概览" body={error.message} action={<button className="s-primary" onClick={retry}>重试</button>}/>;
  if(!summary?.configured||!videos.length)return <Empty title="把创作，变成看得见的成长" body="连接 B 站创作中心，建立第一份真实快照。" action={<button className="s-primary" onClick={()=>navigate('sources')}>连接 B 站 <ArrowRight/></button>}/>;
  const s=summary.summary,base=chartBase(),recent=videos.slice(0,3),ranked=videos.filter(v=>v.cover_ctr!=null).sort((a,b)=>b.cover_ctr!-a.cover_ctr!);
  const cards=[{key:'account_followers',label:'粉丝量',value:compact(s.account_followers),color:'#FF82B2',Icon:Users},{key:'views',label:'播放量',value:compact(s.views),color:'#89B8FF',Icon:Play},{key:'avg_views',label:'平均播放量',value:compact(s.avg_views),color:'#65D9EB',Icon:Timer},{key:'avg_interactions',label:'平均互动量',value:compact(s.avg_interactions),color:'#B3A0FF',Icon:PieChart}];
  return <div className="s-overview">
    <div className="s-overview-status"><span><Clock3/>{(summary.freshnessMinutes??Infinity)>60?'历史快照':'最近同步'} · {ageLabel(summary.freshnessMinutes)}</span><button className="s-text" onClick={()=>navigate('sources')}>查看数据状态 <ArrowUpRight/></button></div>
    <section className="s-overview-kpis">{cards.map(({key,label,value,color,Icon})=><article key={key}><div className="s-kpi-name"><Icon style={{color}}/>{label}</div><strong>{value}</strong><div className="s-kpi-bottom"><span>{formatChange(summary.comparison?.[key],key)}{summary.comparisonLabels?.[key]&&<small>{summary.comparisonLabels[key]}</small>}</span><Sparkline values={key==='account_followers'?(accountHistory.data?.points??[]).map(p=>p.followers):(history.data?.points??[]).map(p=>p[key]??null)} color={color}/></div></article>)}</section>
    <p className="s-comparison-note">优先对比上月，其次上周、昨天 · 平均量按每篇稿件计算</p>
    <div className="s-overview-middle"><section className="s-panel"><div className="s-section-head"><div><h2>封标点击率</h2><p>创作中心星级口径 · {ranked.length} / {videos.length} 篇有值</p></div></div>{ranked.length?<MetricChart videos={ranked} id="cover_ctr" horizontal/>:<Empty title="暂无评分" body="本次未获取到吸引力评分。"/>}<p className="s-note">采用创作中心稳定星级，绝对点击率未接入。</p></section>
    <section className="s-panel s-recent-panel"><div className="s-section-head"><div><h2>最近发布的稿件</h2><p>回到作品，看见数据背后的内容</p></div><button className="s-text" onClick={()=>navigate('videos')}>全部 <ArrowRight/></button></div><div className="s-recent-grid">{recent.map(v=><button key={v.id} className="s-recent-item" onClick={()=>navigate('videos',{video:v.id})}><Cover video={v}/><h3>{v.title}</h3><p>{date(v.published_at).split(' ')[0]}</p><div><Stat label="播放" value={compact(v.views)}/><Stat label="吸引力" value={v.cover_ctr==null?'—':v.cover_ctr.toFixed(1)+' 星'}/><Stat label="观看进度" value={percent(v.avg_watch_percent)}/></div></button>)}</div><div className="s-recent-bottom"><span>每篇作品都有自己的节奏</span><button className="s-text" onClick={()=>navigate('analysis')}>开始一次对比 <ArrowRight/></button></div></section></div>
  </div>;
}
