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
  if(pending)return <div className="s-loading" role="status">正在整理你的创作数据…</div>;
  if(error)return <Empty title="暂时无法读取概览" body={error.message} action={<button className="s-primary" onClick={retry}>重试</button>}/>;
  if(!summary?.configured||!videos.length)return <Empty title="把创作，变成看得见的成长" body="连接 B 站创作中心，建立第一份真实快照。" action={<button className="s-primary" onClick={()=>navigate('sources')}>连接 B 站 <ArrowRight/></button>}/>;
  const s=summary.summary,base=chartBase(),recent=videos.slice(0,3),ranked=videos.filter(v=>v.cover_ctr!=null).sort((a,b)=>b.cover_ctr!-a.cover_ctr!);
  const cards=[{key:'views',label:'累计播放',value:compact(s.views),color:'#F67FAB',Icon:Play},{key:'followers',label:'归因涨粉',value:compact(s.followers),color:'#A28CE9',Icon:Users},{key:'avg_watch_seconds',label:'平均观看',value:seconds(s.avg_watch_seconds),color:'#69A8EF',Icon:Timer},{key:'avg_watch_percent',label:'观看进度',value:percent(s.avg_watch_percent),color:'#52BDC5',Icon:PieChart}];
  const option={...base,legend:{top:0,data:['平均观看时长','平均观看进度'],textStyle:base.textStyle,itemHeight:8,itemWidth:16},grid:{left:48,right:45,top:50,bottom:55},tooltip:{...base.tooltip,formatter:(ps:any[])=>{const v=videos[ps[0]?.dataIndex];return v?`${escapeHtml(v.title)}<br/>平均观看时长：${seconds(v.avg_watch_seconds)}<br/>平均观看进度：${percent(v.avg_watch_percent)}`:'';}},xAxis:{...base.xAxis,type:'category',data:videos.map(v=>v.title),axisLabel:{fontSize:12,interval:'auto',formatter:(s:string)=>s.slice(0,6)+'…'}},yAxis:[{...base.yAxis,name:'秒'},{...base.yAxis,name:'%',min:0,max:100,splitLine:{show:false}}],series:[{name:'平均观看时长',type:'bar',data:videos.map(v=>v.avg_watch_seconds),barMaxWidth:24,itemStyle:{color:'#91BCEE',borderRadius:[4,4,0,0]}},{name:'平均观看进度',type:'line',yAxisIndex:1,data:videos.map(v=>v.avg_watch_percent),showSymbol:false,smooth:.15,lineStyle:{color:'#F28AAE',width:2.5},itemStyle:{color:'#F28AAE'}}]};
  return <div className="s-overview">
    <div className="s-overview-status"><span><Clock3/>{(summary.freshnessMinutes??Infinity)>60?'历史快照':'最近同步'} · {ageLabel(summary.freshnessMinutes)}</span><button className="s-text" onClick={()=>navigate('sources')}>查看数据状态 <ArrowUpRight/></button></div>
    <section className="s-overview-kpis">{cards.map(({key,label,value,color,Icon})=><article key={key}><div className="s-kpi-name"><Icon style={{color}}/>{label}</div><strong>{value}</strong><div className="s-kpi-bottom"><span>{formatChange(summary.comparison?.[key],key)}</span><Sparkline values={(history.data?.points??[]).map(p=>p[key]??null)} color={color}/></div></article>)}</section>
    <p className="s-comparison-note">{summary.comparisonCapturedAt?`一个月前基准：${date(summary.comparisonCapturedAt)}`:`一个月前对应日期：${summary.comparisonPeriod?.label??'暂无'} · 缺少该日历史时不计算变化`} · 趋势线来自真实采集快照</p>
    <div className="s-overview-middle"><section className="s-panel"><div className="s-section-head"><div><h2>封标吸引力排行</h2><p>0–5 星评分 · {ranked.length} / {videos.length} 篇有值</p></div></div>{ranked.length?<MetricChart videos={ranked} id="cover_ctr" horizontal/>:<Empty title="暂无评分" body="本次未获取到吸引力评分。"/>}<p className="s-note">采用创作中心稳定星级，绝对点击率未接入。</p></section>
    <section className="s-panel s-recent-panel"><div className="s-section-head"><div><h2>最近发布的稿件</h2><p>回到作品，看见数据背后的内容</p></div><button className="s-text" onClick={()=>navigate('videos')}>全部 <ArrowRight/></button></div><div className="s-recent-grid">{recent.map(v=><button key={v.id} className="s-recent-item" onClick={()=>navigate('videos',{video:v.id})}><Cover video={v}/><h3>{v.title}</h3><p>{date(v.published_at).split(' ')[0]}</p><div><Stat label="播放" value={compact(v.views)}/><Stat label="吸引力" value={v.cover_ctr==null?'—':v.cover_ctr.toFixed(1)+' 星'}/><Stat label="观看进度" value={percent(v.avg_watch_percent)}/></div></button>)}</div><div className="s-recent-bottom"><span>每篇作品都有自己的节奏</span><button className="s-text" onClick={()=>navigate('analysis')}>开始一次对比 <ArrowRight/></button></div></section></div>
    <section className="s-panel"><div className="s-section-head"><div><h2>平均观看时长与观看进度</h2><p>蓝色柱形表示时长，粉色折线表示平均进度</p></div><span className="s-muted">全部 {videos.length} 篇</span></div><Chart className="s-watch-chart" option={option}/><p className="s-note">平均进度不同于完播率。两个指标使用各自坐标轴，缺失值不补零。</p></section>
  </div>;
}
