import type { Summary, Video } from './types';

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(path.includes('collect-now') ? 240_000 : 20_000),
    headers: { ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok === false) throw new Error(body?.error?.message || `请求失败 (${response.status})`);
  if (!body) throw new Error('服务返回了无法识别的数据，请重试');
  return body as T;
}
export const compact = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? '—' : n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString('zh-CN');
export const percent = (n: number | null | undefined, d = 1) => n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(d)}%`;
export const score = (n: number | null | undefined, d = 1) => n == null ? '—' : `${n.toFixed(d)} 星`;
export const seconds = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '—';
  const total = Math.round(n);
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};
export const date = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
export const coverSrc = (video: Pick<Video, 'id'>, variant: 'cover' | 'thumb' = 'cover') => `/api/covers/${encodeURIComponent(video.id)}${variant === 'thumb' ? '?variant=thumb' : ''}`;
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const ageLabel = (minutes: number | null | undefined) => minutes == null ? '时间未知' : minutes < 1 ? '刚刚' : minutes < 60 ? `${minutes} 分钟前` : minutes < 1440 ? `${Math.floor(minutes / 60)} 小时前` : `${Math.floor(minutes / 1440)} 天前`;
export function formatChange(delta: NonNullable<Summary['comparison']>[string] | undefined, key: string) {
  if (!delta) return '暂无上月数据';
  if (delta.delta === 0) return '与上月持平';
  const arrow = delta.delta > 0 ? '↑' : '↓';
  const sign = delta.delta > 0 ? '+' : '';
  if (key === 'cover_ctr') return Math.abs(delta.delta) < .01 ? `${arrow} <0.01 分` : `${sign}${delta.delta.toFixed(2)} 分`;
  if (delta.deltaKind === 'pp') return Math.abs(delta.delta) < .01 ? `${arrow} <0.01 个百分点` : `${sign}${delta.delta.toFixed(2)} 个百分点`;
  if (delta.changePercent == null) return `新增 ${compact(delta.delta)}`;
  return Math.abs(delta.changePercent) < .1 ? `${arrow} <0.1%` : `${sign}${delta.changePercent.toFixed(1)}%`;
}
