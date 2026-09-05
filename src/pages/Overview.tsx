import { useMemo, useState } from 'react';
import { Play, Users, Star, Clock3, PieChart, Heart, ChevronRight, Database, Activity, RefreshCw, FileChartColumn } from 'lucide-react';
import type { Theme } from '../theme';
import { ageLabel, compact, coverSrc, date, escapeHtml, formatChange, percent, seconds } from '../format';
import { Chart } from '../components/Chart';
import { Segmented } from '../components/Segmented';
import { useDashboardData } from '../use-dashboard-data';

export function OverviewPage({ navigate, theme }: { navigate: (page: string, id?: string) => void; theme: Theme }) {
  const { summary, videos, pending, error, retry } = useDashboardData();
  const [metric, setMetric] = useState('播放量');
  const [sort, setSort] = useState('published');
  const display = useMemo(() => videos.slice().sort((a, b) => sort === 'views' ? (b.views ?? -1) - (a.views ?? -1) : a.published_at.localeCompare(b.published_at)), [videos, sort]);
  const dark = theme === 'dark';
  const text = dark ? '#a1a1aa' : '#777781';
  const field = metric === '播放量' ? 'views' : metric === '观看质量' ? 'avg_watch_percent' : 'cover_ctr';
  const formatValue = (value: number | null) => field === 'views' ? compact(value) : field === 'avg_watch_percent' ? percent(value) : value == null ? '—' : `${value.toFixed(1)} / 5`;
  const option = {
    accessibleLabel: `全部 ${display.length} 篇稿件的${metric}，按${sort === 'views' ? '播放量' : '发布时间'}排序。下方可展开数据表。`,
    animationDuration: 380,
    grid: { left: 48, right: 16, top: 22, bottom: display.length > 20 ? 74 : 42 },
    tooltip: { trigger: 'axis', confine: true, backgroundColor: dark ? '#303034' : '#fff', borderWidth: 0, textStyle: { color: dark ? '#fff' : '#1c1c1e' }, extraCssText: 'max-width:280px;white-space:normal;line-height:1.6;border-radius:16px;box-shadow:0 6px 30px #0002', formatter: (params: any[]) => {
      const video = display[params[0]?.dataIndex];
      return video ? `${escapeHtml(video.title)}<br/><b>${metric}　${formatValue(video[field])}</b>` : '';
    } },
    xAxis: { type: 'category', data: display.map((v) => v.title), axisLabel: { color: text, fontSize: 12, width: 62, overflow: 'truncate', interval: 'auto', margin: 14, formatter: (v: string) => v.slice(0, 6) + (v.length > 6 ? '…' : '') }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', max: field === 'cover_ctr' ? 5 : field === 'avg_watch_percent' ? 100 : undefined, splitNumber: 3, axisLabel: { color: text, fontSize: 12, formatter: (value: number) => field === 'views' ? compact(value) : field === 'avg_watch_percent' ? `${value}%` : `${value}` }, splitLine: { lineStyle: { type: 'dashed', color: dark ? '#ffffff12' : '#0000000c' } } },
    dataZoom: display.length > 20 ? [{ type: 'slider', height: 18, bottom: 0, start: 0, end: Math.min(100, 20 / display.length * 100), borderColor: 'transparent' }] : [],
    series: [{ type: 'bar', data: display.map((v) => v[field]), barMaxWidth: 24, itemStyle: { color: field === 'avg_watch_percent' ? '#42b9c6' : '#f35b8d', borderRadius: [5, 5, 0, 0] }, emphasis: { itemStyle: { opacity: .75 } } }],
  };
  if (pending) return <div className="iosLoading" role="status"><div className="skeleton metricsSkeleton" /><div className="skeleton chartSkeleton" /><span>正在读取你的创作数据…</span></div>;
  if (error) return <section className="iosEmpty"><Database /><h2>暂时无法读取数据</h2><p>{error.message}</p><button className="primary" onClick={retry}>重新加载</button></section>;
  if (!summary?.configured || !videos.length) return <section className="iosEmpty"><div className="emptySymbol"><Play /></div><h2>从第一份创作快照开始</h2><p>连接 B 站创作中心，查看稿件表现、观众反馈与内容趋势。</p><button className="primary" onClick={() => navigate('数据源')}>连接 B 站 <ChevronRight /></button><small>未连接时不会用样例数字填充看板</small></section>;
  const s = summary.summary;
  const cards = [
    { label: '累计播放', key: 'views', value: compact(s.views), Icon: Play, tone: 'pink', note: '稿件累计播放总量' },
    { label: '归因涨粉', key: 'followers', value: compact(s.followers), Icon: Users, tone: 'blue', note: '归因于稿件的累计涨粉' },
    { label: '封标吸引力', key: 'cover_ctr', value: s.cover_ctr == null ? '—' : s.cover_ctr.toFixed(1), suffix: '/ 5', Icon: Star, tone: 'orange', note: 'B 站稳定星级的单稿平均值，非点击率' },
    { label: '平均观看', key: 'avg_watch_seconds', value: seconds(s.avg_watch_seconds), Icon: Clock3, tone: 'purple', note: '有有效观看数据稿件的播放加权均值' },
    { label: '观看进度', key: 'avg_watch_percent', value: percent(s.avg_watch_percent), Icon: PieChart, tone: 'teal', note: '每篇稿件平均观看百分比的算术平均' },
    { label: '互动率', key: 'interaction_rate', value: percent(s.interaction_rate), Icon: Heart, tone: 'orange', note: '完整互动数据稿件的六类互动总数 ÷ 播放量' },
  ];
  const details = summary.acquisition?.details;
  const counts = Object.values(details?.metricCounts ?? {});
  const total = details?.totalVideos ?? videos.length;
  const available = counts.reduce((a, b) => a + b, 0);
  const possible = total * counts.length;
  const stale = summary.freshnessMinutes == null || summary.freshnessMinutes > 60;
  return <div className="iosOverview">
    <div className={`snapshotStatus ${stale ? 'stale' : ''}`}><Clock3 /><span>{stale ? '历史快照' : '最近快照'} · {ageLabel(summary.freshnessMinutes)}</span><span className="snapshotTimestamp">{date(s.fresh)}</span><button onClick={() => navigate('数据源')}>查看详情 <ChevronRight /></button></div>
    <section className="iosMetrics"><h2>创作表现</h2><p className="comparisonBasis">{summary.comparisonCapturedAt ? `一个月前基准：${date(summary.comparisonCapturedAt)} · 按对应日期回溯完整一个月` : `比较基准：${summary.comparisonPeriod?.label ?? '一个月前的对应日期'} · 缺少当天历史数据，不计算变化`}</p><div className="metricCells">{cards.map(({ label, key, value, suffix, Icon, tone, note }) => {
      const delta = summary.comparison?.[key];
      const change = !delta && summary.comparisonCapturedAt ? '基准日该指标缺失' : formatChange(delta, key);
      return <article key={key} title={note}><div className="metricLabel"><Icon className={`tone-${tone}`} /><span>{label}</span></div><strong>{value}{suffix && <em>{suffix}</em>}</strong><div className="metricComparison"><span>{change}</span>{delta && delta.delta !== 0 && <small>较一个月前</small>}</div></article>;
    })}</div></section>
    <section className="iosChartPanel"><div className="iosSectionHead"><h2>稿件表现</h2><Segmented items={['播放量', '观看质量', '吸引力']} value={metric} onChange={setMetric} label="表现指标" /></div>
      <div className="chartContext"><span>全部 {videos.length} 篇 · {metric === '吸引力' ? '稳定星级，非绝对点击率' : metric === '观看质量' ? '平均观看进度' : '每篇稿件累计播放'} · 点击柱形查看稿件</span><select aria-label="表现图排序" value={sort} onChange={(e) => setSort(e.target.value)}><option value="published">按发布时间</option><option value="views">按播放量</option></select></div>
      <Chart className="iosPerformanceChart" option={option} events={{ click: (p) => { if (display[p.dataIndex]) navigate('稿件', display[p.dataIndex].id); } }} />
      <details className="chartTable"><summary>查看图表数据</summary><div className="tableScroll"><table><thead><tr><th>稿件</th><th>{metric}</th><th>快照时间</th></tr></thead><tbody>{display.map((v) => <tr key={v.id}><td><button onClick={() => navigate('稿件', v.id)}>{v.title}</button></td><td>{formatValue(v[field])}</td><td>{date(v.captured_at)}</td></tr>)}</tbody></table></div></details>
    </section>
    <div className="iosOverviewBottom"><section className="iosRecent"><div className="iosSectionHead"><h2>最近发布</h2><button className="textButton" onClick={() => navigate('稿件')}>全部稿件 <ChevronRight /></button></div><div className="iosVideoRows">{videos.slice(0, 4).map((video) => <button className="iosVideoRow" key={video.id} onClick={() => navigate('稿件', video.id)}><img src={coverSrc(video)} alt="" loading="lazy" /><span className="rowTitle"><b>{video.title}</b><small>{date(video.published_at)}</small></span><span className="rowValue">{compact(video.views)}<small>播放</small></span><ChevronRight /></button>)}</div></section>
    <section className="iosHealth"><div className="iosSectionHead"><h2>数据健康</h2><button aria-label="查看数据健康详情" className="iconButton" onClick={() => navigate('数据源')}><ChevronRight /></button></div>
      <button className="healthRow" onClick={() => navigate('数据源')}><span className="healthIcon blue"><FileChartColumn /></span><span><b>稿件清单</b><small>最近一轮已返回稿件</small></span><strong>{total} 篇</strong></button>
      <button className="healthRow" onClick={() => navigate('数据源')}><span className="healthIcon purple"><Activity /></span><span><b>已接入指标</b><small>{available} / {possible} 个有效值</small></span><strong>{possible ? `${(available / possible * 100).toFixed(0)}%` : '—'}</strong></button>
      <button className="healthRow" onClick={() => navigate('数据源')}><span className="healthIcon teal"><RefreshCw /></span><span><b>最近采集</b><small>{summary.acquisition?.status === 'failed' ? '失败，保留旧快照' : stale ? '数据需要更新' : summary.acquisition?.status === 'partial' ? '部分指标缺失' : '已完成'}</small></span><strong>{ageLabel(summary.freshnessMinutes)}</strong></button>
      <p className="healthFootnote">绝对曝光、绝对点击率和推荐 / 搜索来源尚未接入，不计入上方可用率。</p>
    </section></div>
  </div>;
}
