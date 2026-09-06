import type { Video } from '../types';
import { compact, percent, seconds } from '../format';
export type MetricId = 'views'|'avg_watch_percent'|'avg_watch_seconds'|'cover_ctr'|'followers_gained'|'unfollows'|'interactions'|'likes'|'coins'|'favorites'|'comments'|'shares'|'danmaku'|'interactionRate'|'playToFollowRate'|'threeSecondBounceRate';
export type Metric = { id: MetricId; label: string; unit: string; color: string; group: string };
export const metrics: Metric[] = [
  { id:'views', label:'播放量', unit:'次', color:'#FF7FAC', group:'流量与观看' },
  { id:'avg_watch_percent', label:'平均播放百分比', unit:'%', color:'#48D7F2', group:'流量与观看' },
  { id:'avg_watch_seconds', label:'平均播放时长', unit:'秒', color:'#7AA6FF', group:'流量与观看' },
  { id:'cover_ctr', label:'封标点击率', unit:'星', color:'#FFD36A', group:'流量与观看' },
  { id:'interactions', label:'互动量', unit:'次', color:'#8CDE93', group:'转化与互动' },
  { id:'unfollows', label:'取消关注', unit:'人', color:'#FFD36A', group:'转化与互动' },
  { id:'followers_gained', label:'归因涨粉', unit:'人', color:'#9E92FF', group:'转化与互动' },
  { id:'interactionRate', label:'互动率', unit:'%', color:'#7AA6FF', group:'转化与互动' },
  { id:'playToFollowRate', label:'播转粉率', unit:'%', color:'#9E92FF', group:'转化与互动' },
  { id:'threeSecondBounceRate', label:'3秒跳出率', unit:'%', color:'#FFD36A', group:'流量与观看' },
  ...(['likes','coins','favorites','comments','shares','danmaku'] as const).map((id,i)=>({id,label:['点赞','投币','收藏','评论','分享','弹幕'][i],unit:'次',color:['#FF7FAC','#FFD36A','#9E92FF','#7AA6FF','#48D7F2','#92BA88'][i],group:'转化与互动'})),
];
export const metricById = Object.fromEntries(metrics.map(m=>[m.id,m])) as Record<MetricId,Metric>;
export function valueOf(v:Video,id:MetricId):number|null {
  if(id==='interactions'){const xs=['likes','coins','favorites','comments','shares','danmaku'].map(key=>v.metrics[key]);return xs.every(x=>typeof x==='number'&&Number.isFinite(x))?xs.reduce<number>((a,b)=>a+b!,0):null;}
  const direct=(v as unknown as Record<string,unknown>)[id];
  const value=direct===undefined?v.metrics[id]:direct;
  return typeof value==='number'&&Number.isFinite(value)?value:null;
}
export function formatMetric(value:number|null|undefined,id:MetricId){
  if(value==null)return '—';
  const unit=metricById[id].unit;
  return unit==='%'?percent(value):unit==='秒'?seconds(value):unit==='星'?`${value.toFixed(1)} / 5`:compact(value);
}
export function filterVideos(videos:Video[],search:string,length:string,sort:string){
  return videos.filter(v=>`${v.title} ${v.bvid}`.toLowerCase().includes(search.trim().toLowerCase()))
    .filter(v=>length==='全部'||(v.duration_seconds!=null&&(length==='短视频'?v.duration_seconds<=300:v.duration_seconds>300)))
    .slice().sort((a,b)=>sort==='播放量'?(b.views??-1)-(a.views??-1):sort==='涨粉量'?(b.followers_gained??-1)-(a.followers_gained??-1):b.published_at.localeCompare(a.published_at));
}
export type DayPoint={day:string;value:number};
export function dailyTrend(v:Video,kind:'play'|'fan'):DayPoint[]{
  const trend=v.dimensions?.trend?.[kind];
  const rows=trend?.last_30_day_tendency??trend?.tendency??[];
  if(!Array.isArray(rows))return [];
  return rows.flatMap(row=>{
    const key=String(row.date_key); let day='';
    if(/^\d{8}$/.test(key))day=`${key.slice(0,4)}-${key.slice(4,6)}-${key.slice(6,8)}`;
    else if(/^\d{10,13}$/.test(key))day=new Date(Number(key)*(key.length===10?1000:1)+28800000).toISOString().slice(0,10);
    else if(/^\d{4}-\d{2}-\d{2}/.test(key))day=key.slice(0,10);
    return day&&typeof row.total_inc==='number'&&Number.isFinite(row.total_inc)?[{day,value:row.total_inc}]:[];
  }).sort((a,b)=>a.day.localeCompare(b.day));
}
