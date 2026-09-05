import { useState } from 'react';
import { Download } from 'lucide-react';
import { useDashboardData } from '../use-dashboard-data';

export function SnapshotExport() {
  const { summary, videos, pending, error } = useDashboardData();
  const [exported, setExported] = useState(false);
  const download = () => {
    const payload = { format: 'bilibili-insights-snapshot', version: 1, exportedAt: new Date().toISOString(), capturedAt: summary?.summary.fresh, summary: summary?.summary, videos };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `bilibili-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
  };
  return <section className="panel settingCard"><div className="settingIcon"><Download /></div><div><h2>导出当前快照</h2><p>将当前批次的稿件、指标与来源维度保存为 JSON 文件，不包含登录会话或 API 密钥。这是当前快照的副本，不包含完整历史。</p>{error && <p role="alert">{error.message}</p>}{exported && <p role="status">已发起快照下载</p>}</div><button className="secondary" disabled={pending || !!error || !videos.length} onClick={download}>导出 JSON</button></section>;
}
