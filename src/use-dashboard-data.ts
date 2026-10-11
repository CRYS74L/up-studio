import { useQuery,keepPreviousData } from '@tanstack/react-query';
import { request } from './format';
import type { Summary, Video } from './types';

export function useDashboardData({loadVideos=true,compact=false}:{loadVideos?:boolean;compact?:boolean}={}) {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => request<Summary>('/api/dashboard/summary'), refetchInterval: 60_000 });
  const capturedAt = summary.data?.summary.fresh;
  const videos = useQuery({
    placeholderData:keepPreviousData,
    queryKey: ['videos', capturedAt ?? null,compact?'cards':'full'],
    queryFn: () => {const params=new URLSearchParams();if(capturedAt)params.set('capturedAt',capturedAt);if(compact)params.set('view','cards');return request<{ videos: Video[] }>(`/api/videos${params.size?'?'+params:''}`)},
    enabled: loadVideos&&Boolean(summary.data?.configured),
  });
  return {
    summary: summary.data,
    summaryPending: summary.isPending,
    videos: loadVideos&&summary.data?.configured ? videos.data?.videos ?? [] : [],
    pending: summary.isPending || (loadVideos&&Boolean(summary.data?.configured) && (videos.isPending||!compact&&videos.isPlaceholderData&&videos.data?.videos.some(v=>v.dimensions===undefined))),
    error: summary.error || (loadVideos&&summary.data?.configured ? videos.error : null),
    retry: () => { void summary.refetch(); if (loadVideos&&summary.data?.configured) void videos.refetch(); },
  };
}
