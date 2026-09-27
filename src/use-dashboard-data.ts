import { useQuery,keepPreviousData } from '@tanstack/react-query';
import { request } from './format';
import type { Summary, Video } from './types';

export function useDashboardData({loadVideos=true}:{loadVideos?:boolean}={}) {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => request<Summary>('/api/dashboard/summary'), refetchInterval: 60_000 });
  const capturedAt = summary.data?.summary.fresh;
  const videos = useQuery({
    placeholderData:keepPreviousData,
    queryKey: ['videos', capturedAt ?? null],
    queryFn: () => request<{ videos: Video[] }>(`/api/videos${capturedAt ? `?capturedAt=${encodeURIComponent(capturedAt)}` : ''}`),
    enabled: loadVideos&&Boolean(summary.data?.configured),
  });
  return {
    summary: summary.data,
    summaryPending: summary.isPending,
    videos: loadVideos&&summary.data?.configured ? videos.data?.videos ?? [] : [],
    pending: summary.isPending || (loadVideos&&Boolean(summary.data?.configured) && videos.isPending),
    error: summary.error || (loadVideos&&summary.data?.configured ? videos.error : null),
    retry: () => { void summary.refetch(); if (loadVideos&&summary.data?.configured) void videos.refetch(); },
  };
}
