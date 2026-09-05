import { useEffect, useState } from 'react';
const routes: Record<string, string> = { '概览': 'overview', '稿件': 'videos', '内容吸引力矩阵': 'matrix', '联合分析': 'analysis', '数据源': 'sources', '设置': 'settings' };
const readPage = () => Object.entries(routes).find(([, slug]) => slug === location.hash.slice(1).split('?')[0])?.[0] ?? '概览';
export function useRoute(): [string, (page: string, videoId?: string) => void] {
  const [page, setPage] = useState(readPage);
  useEffect(() => {
    const sync = () => { setPage(readPage()); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return [page, (next, videoId) => {
    location.hash = `${routes[next] ?? 'overview'}${videoId ? `?video=${encodeURIComponent(videoId)}` : ''}`;
    setPage(next);
  }];
}
