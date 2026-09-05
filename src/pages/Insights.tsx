import { useEffect, useRef } from 'react';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { compact, percent } from '../format';
import { useDashboardData } from '../use-dashboard-data';

export function Insights({ close, navigate }: { close: () => void; navigate: (page: string, id?: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { videos, pending, error } = useDashboardData();
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const mostViewed = videos.filter((v) => v.views != null).sort((a, b) => b.views! - a.views!)[0];
  const deepest = videos.filter((v) => v.avg_watch_percent != null).sort((a, b) => b.avg_watch_percent! - a.avg_watch_percent!)[0];
  const missing = videos.filter((v) => [v.views, v.avg_watch_percent, v.cover_ctr].some((n) => n == null)).length;
  return <dialog ref={dialog} className="insightsDialog" onCancel={close} onClick={(e) => { if (e.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } }}>
    <div className="sheetHandle" /><div className="iosSectionHead"><span className="insightSymbol"><Sparkles /></span><button className="glassCircle" aria-label="关闭创作建议" onClick={close}><X /></button></div>
    <h2>从数据里，找一点灵感。</h2><p className="insightsDescription">基于当前快照的本地统计。没有调用 AI，也没有向外部服务发送数据。</p>
    {pending ? <p role="status">正在读取快照…</p> : error ? <p role="alert">{error.message}</p> : !videos.length ? <p>连接数据源后，这里会显示值得关注的稿件。</p> : <>
      {mostViewed && <button className="insightItem" onClick={() => { navigate('稿件', mostViewed.id); close(); }}><small>最受关注</small><b>{mostViewed.title}</b><p>累计播放 {compact(mostViewed.views)}。可结合观看进度和涨粉表现，复盘它的选题与包装。</p><ChevronRight /></button>}
      {deepest && <button className="insightItem" onClick={() => { navigate('稿件', deepest.id); close(); }}><small>观看更深入</small><b>{deepest.title}</b><p>平均观看进度 {percent(deepest.avg_watch_percent)}。比较时也要考虑视频时长，不能仅据此判断内容优劣。</p><ChevronRight /></button>}
      <p className="insightsFootnote">本次查看 {videos.length} 篇稿件；其中 {missing} 篇缺少核心指标。以上为累计快照排序，不代表近期增长或因果结论。</p>
    </>}
  </dialog>;
}
