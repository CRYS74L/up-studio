import { useQuery } from '@tanstack/react-query';
import { request } from './format';
import type { Summary, Video } from './types';

export function useDashboardData() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => request<Summary>('/api/dashboard/summary'), refetchInterval: 60_000 });
  const capturedAt = summary.data?.summary.fresh;
  const videos = useQuery({
    queryKey: ['videos', capturedAt ?? null],
    queryFn: () => request<{ videos: Video[] }>(`/api/videos${capturedAt ? `?capturedAt=${encodeURIComponent(capturedAt)}` : ''}`),
    enabled: Boolean(summary.data?.configured),
  });
  return {
    summary: summary.data,
    videos: videos.data?.videos ?? [],
    pending: summary.isPending || (Boolean(summary.data?.configured) && videos.isPending),
    error: summary.error || (summary.data?.configured ? videos.error : null),
    retry: () => { void summary.refetch(); if (summary.data?.configured) void videos.refetch(); },
  };
}
