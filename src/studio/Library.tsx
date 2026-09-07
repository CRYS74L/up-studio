import {BiliPlay,BiliDanmaku} from './BiliIcons';
import {Select} from './Select';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,Check,LayoutGrid,List,Search,SlidersHorizontal,X,ExternalLink,Play,MessageSquare} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import type {Video} from '../types';
import {date,seconds,watchTime,score,compact,percent,request,coverSrc} from '../format';
import {useDashboardData} from '../use-dashboard-data';
import {filterVideos,metrics,valueOf,formatMetric,metricById} from './model';
import {Cover,Empty,Segments,Stat,motion,AnimatePresence,spring} from './ui';
import {navigate,type StudioRoute} from './route';
import {Chart} from '../components/Chart';
import {chartBase} from './charts';
import {VideoHistory} from './VideoHistory';
import {VideoAudience} from './VideoAudience';
import {VideoDiagnostics,VideoEngagement} from './VideoDiagnostics';

export function Library({route}:{route:StudioRoute}){
  const {videos,pending,error,retry}=useDashboardData();const [search,setSearch]=useState(''),[length,setLength]=useState('全部'),[sort,setSort]=useState('最新发布'),[view,setView]=useState('网格'),[selected,setSelected]=useState<string[]>([]);
  const shown=filterVideos(videos,search,length,sort),current=videos.find(v=>v.id===route.video);
  const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(v=>v!==id):[...s,id]);
  if(pending)return <div className="s-loading" role="status">正在读取作品库…</div>;
  if(error)return <Empty title="作品暂时无法读取" body={error.message} action={<button className="s-primary" onClick={retry}>重新加载</button>}/>;
  if(route.video&&current)return <VideoDetail video={current} previous={videos[(videos.indexOf(current)+videos.length-1)%videos.length]} next={videos[(videos.indexOf(current)+1)%videos.length]}/>;
  return <>
    <div className="s-library-toolbar"><label className="s-search"><Search/><input aria-label="搜索稿件" placeholder="搜索标题或 BV 号" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button aria-label="清除搜索" onClick={()=>setSearch('')}><X/></button>}</label><Segments items={['全部','短视频','中长视频']} value={length} onChange={setLength} label="稿件时长"/><Segments items={['网格','列表']} value={view} onChange={setView} label="浏览方式"/></div>
    <div className="s-list-meta"><span>{shown.length} 篇稿件{length!=='全部'&&` · ${length==='短视频'?'5 分钟以内':'超过 5 分钟'}`}</span><label>排序 <Select aria-label="稿件排序" value={sort} onChange={e=>setSort(e.target.value)}>{['最新发布','播放量','涨粉量'].map(v=><option key={v}>{v}</option>)}</Select></label></div>
    {!shown.length?<Empty title="没有匹配的稿件" body={videos.length?'换个关键词，或者清除筛选条件。':'连接 B 站并同步后，作品会出现在这里。'} action={<button className="s-secondary" onClick={()=>{setSearch('');setLength('全部');if(!videos.length)navigate('sources');}}>{videos.length?'清除筛选':'连接数据源'}</button>}/>:
    <motion.div layout className={`s-library ${view==='列表'?'list':''}`}>{shown.map(v=><motion.article layout="position" key={v.id} className={`s-media ${selected.includes(v.id)?'selected':''}`} transition={spring}>
      <div className="s-media-open"><button className="s-media-cover" aria-label={`查看 ${v.title}`} onClick={()=>navigate('videos',{video:v.id})}><Cover video={v}/><span className="s-cover-numbers"><span><BiliPlay/>{compact(v.views)}</span><span><BiliDanmaku/>{compact(v.metrics.danmaku)}</span></span><span className="s-duration">{seconds(v.duration_seconds)}</span></button><div className="s-media-copy"><h2><button className="s-title-link" onClick={()=>navigate('videos',{video:v.id})}>{v.title}</button></h2><p>{date(v.published_at).split(' ')[0]} · {v.bvid}</p><div className="s-media-stats"><Stat label="点击率" value={score(v.cover_ctr)}/><Stat label="平均播放时长" value={watchTime(v.avg_watch_seconds)}/><Stat label="平均播放百分比" value={percent(v.avg_watch_percent)}/></div></div></div>
      <button className="s-select-cover" aria-label={`选择 ${v.title}`} aria-pressed={selected.includes(v.id)} onClick={()=>toggle(v.id)}>{selected.includes(v.id)&&<Check/>}</button>
    </motion.article>)}</motion.div>}
    <AnimatePresence>{selected.length>0&&<motion.div className="s-selection-dock" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:30}} transition={spring}><b>已选 {selected.length} 篇</b><div className="s-dock-covers">{videos.filter(v=>selected.includes(v.id)).slice(0,3).map(v=><Cover key={v.id} video={v}/>)}</div><button className="s-secondary" onClick={()=>setSelected([])}>取消</button><button className="s-primary" onClick={()=>navigate('analysis',{ids:selected.join(',')})}>去分析 <ArrowRight/></button></motion.div>}</AnimatePresence>
  </>;
}
function VideoDetail({video,previous,next}:{video:Video;previous:Video;next:Video}){
  const [tab,setTab]=useState('表现');const q=useQuery({queryKey:['timeseries',video.id],queryFn:()=>request<{points:any[]}>(`/api/videos/${video.id}/timeseries`)});const base=chartBase();
  const history=q.data?.points??[],dims=video.dimensions??{},retention=dims.retention?.viewerQuit??[];
  const interactions=metrics.filter(m=>['likes','coins','favorites','comments','shares','danmaku'].includes(m.id));
  const pie={...base,grid:undefined,tooltip:{...base.tooltip,trigger:'item'},series:[{type:'pie',radius:['52%','76%'],center:['50%','48%'],label:{show:false},data:interactions.filter(m=>valueOf(video,m.id)!=null).map(m=>({name:m.label,value:valueOf(video,m.id),itemStyle:{color:m.color}}))}]};
  const line=(points:any[],x:(p:any)=>string,y:(p:any)=>number|null,color:string)=>({...base,xAxis:{...base.xAxis,type:'category',data:points.map(x)},yAxis:base.yAxis,series:[{type:'line',data:points.map(y),smooth:false,showSymbol:points.length<10,lineStyle:{color,width:2.5},itemStyle:{color},areaStyle:{color:color+'16'}}]});
  return <motion.div className="s-detail" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring}>
    <div className="s-detail-navigation"><button className="s-text" onClick={()=>navigate('videos')}><ArrowLeft/> 所有稿件</button><div><button className="s-icon" aria-label="上一篇稿件" onClick={()=>navigate('videos',{video:previous.id})}><ArrowLeft/></button><button className="s-icon" aria-label="下一篇稿件" onClick={()=>navigate('videos',{video:next.id})}><ArrowRight/></button></div></div>
    <section className="s-detail-hero"><Cover video={video}/><div><p className="s-muted">{date(video.published_at)} · {seconds(video.duration_seconds)}</p><h2>{video.title}</h2><p className="s-muted">{video.bvid}</p><div className="s-detail-actions"><button className="s-primary" onClick={()=>navigate('analysis',{ids:video.id})}>分析这篇稿件 <SlidersHorizontal/></button><a className="s-secondary" href={`https://www.bilibili.com/video/${encodeURIComponent(video.bvid)}`} target="_blank" rel="noreferrer">在 B 站查看 <ExternalLink/></a></div></div></section>
    <div className="s-detail-kpis">{(['views','avg_watch_seconds','avg_watch_percent','cover_ctr','followers_gained'] as const).map(id=><Stat key={id} label={metricById[id].label} value={formatMetric(valueOf(video,id),id)}/>)}</div>
    <Segments items={['表现','观众','留存与趋势']} value={tab} onChange={setTab} label="稿件详情"/>
    <motion.div key={tab} className="s-detail-content" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.18}}>
      {tab==='表现'&&<div className="s-two-col"><section className="s-panel"><h3>互动构成</h3><div className="s-interactions"><Chart className="s-donut-chart" option={pie}/><div>{interactions.map(m=><div className="s-data-row" key={m.id}><span><i style={{background:m.color}}/>{m.label}</span><strong>{formatMetric(valueOf(video,m.id),m.id)}</strong></div>)}</div></div></section><section className="s-panel"><h3>观看与转化</h3>{(['threeSecondBounceRate','interactionRate','playToFollowRate'] as const).map(id=><div className="s-quality-row" key={id}><div><span>{metricById[id].label}</span><b>{formatMetric(valueOf(video,id),id)}</b></div><div className="s-meter"><i style={{width:`${Math.max(0,Math.min(100,valueOf(video,id)??0))}%`,background:metricById[id].color}}/></div></div>)}<div className="s-inline-stats"><Stat label="实时播放" value={compact(video.metrics.realtimePlay)}/><Stat label="取关" value={compact(video.metrics.unfollows)}/></div></section></div>}
      {tab==='表现'&&<VideoDiagnostics video={video}/>}
      {tab==='观众'&&<VideoAudience video={video}/>}
      {tab==='留存与趋势'&&<><VideoHistory video={video}/><VideoEngagement video={video}/><div className="s-two-col"><section className="s-panel"><h3>观众留存</h3>{retention.length?<Chart className="s-large-chart" option={{...base,legend:{top:0,textStyle:base.textStyle},grid:{left:50,right:25,top:50,bottom:45},xAxis:{...base.xAxis,type:'value',name:'秒'},yAxis:{...base.yAxis,name:'留存 %',min:0,max:100},series:[{name:'你的作品',type:'line',showSymbol:false,data:retention.map((p:any)=>[p.duration_key,p.num<0?null:p.num/100]),itemStyle:{color:'#89B8FF'}},{name:'同类作品',type:'line',showSymbol:false,data:(dims.retention?.peerViewerQuit??[]).map((p:any)=>[p.duration_key,p.num<0?null:p.num/100]),itemStyle:{color:'#B3A0FF'}}]}}/>:<Empty title="暂无留存曲线" body="创作中心本轮未返回有效曲线。"/>}</section><section className="s-panel"><h3>播放快照趋势</h3>{q.isPending?<p role="status">读取历史中…</p>:q.error?<p role="alert">历史暂时无法读取</p>:history.length>1?<Chart className="s-large-chart" option={line(history,p=>date(p.captured_at),p=>p.views,'#F67FAB')}/>:<Empty title="正在建立历史" body="至少两次有效采集后才会形成趋势。"/>}</section></div></>}
    </motion.div><details className="s-panel s-detail-metrics"><summary>全部互动与细分指标</summary><div className="s-metric-details">{metrics.map(m=><Stat key={m.id} label={m.label} value={formatMetric(valueOf(video,m.id),m.id)}/>)}{[['fanCoverScore','粉丝点击星级'],['guestCoverScore','游客点击星级'],['fanBounceRate','粉丝3秒跳出率'],['guestBounceRate','游客3秒跳出率'],['fanInteractionRate','粉丝互动率'],['guestInteractionRate','游客互动率']].map(([key,label])=><Stat key={key} label={label} value={video.metrics[key]==null?'—':key.includes('Score')?String(video.metrics[key])+' 星':percent(video.metrics[key])}/>)}</div></details>
  </motion.div>;
}