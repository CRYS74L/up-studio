type ApiError = { error?: { message?: string } };
export type Video = {
  id: string;
  bvid: string;
  title: string;
  cover_url: string | null;
  duration_seconds: number | null;
  published_at: string;
  views: number | null;
  impressions: number | null;
  cover_ctr: number | null;
  avg_watch_seconds: number | null;
  avg_watch_percent: number | null;
  followers_gained: number | null;
  captured_at: string | null;
  metrics: Record<string, number | null>;
  dimensions?: Record<string, any>;
};
export type CoverageDetails = {
  totalVideos: number;
  completeVideos: number;
  metricCounts: Record<string, number>;
  missingByVideo: Array<{
    bvid: string;
    title: string;
    missing: string[];
    reasons: string[];
  }>;
  warnings: string[];
  capabilityCounts?: Record<string, { available: number; total: number }>;
  sourceFields?: {
    archiveStat: string[];
    compareStat: string[];
    diagnose: string[];
    overviewStat: string[];
    overview: string[];
    trend: string[];
    realtime: string[];
    retention: string[];
  };
  plannedNotIntegrated?: string[];
};
export type Acquisition = {
  status: "running" | "success" | "partial" | "failed";
  coverage: number;
  details?: CoverageDetails;
  started_at: string;
  finished_at: string | null;
  error_code?: string | null;
  safe_error_detail?: string | null;
};
export type Summary = {
  miniTrends?:{overview:Array<Record<string,any>>;account:Array<{followers:number|null}>}|null;
  configured: boolean;
  freshnessMinutes: number | null;
  summary: {
    videos?: number;
    fresh?: string;
    views?: number;
    followers?: number;
    cover_ctr?: number;
    avg_watch_percent?: number;
    avg_watch_seconds?: number;
    interaction_rate?: number;
    account_followers?: number|null;
    avg_views?: number|null;
    avg_interactions?: number|null;
  };
  comparison?: Record<string, {
    current: number;
    previous: number;
    delta: number;
    changePercent: number | null;
    direction: "up" | "down" | "flat";
    deltaKind: "percent" | "pp";
  } | null>;
  comparisonCapturedAt?: string | null;
  comparisonLabels?: Record<string,string|null>;
  comparisonPeriod?: { start: string; end: string; label: string } | null;
  acquisition?: Acquisition | null;
};
