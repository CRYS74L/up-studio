import { z } from 'zod';
import type { VideoSnapshot } from '../shared/contracts';

export type VideoRecord = {
  id: string; bvid: string; title: string; coverUrl: string | null;
  durationSeconds: number | null; publishedAt: string;
};
export type CollectResult = {
  videos: VideoRecord[]; snapshots: VideoSnapshot[]; coverage: number;
  coverageDetails: CoverageDetails;
  sourceVersion: string; raw: unknown; timings: Record<string, number>; requestCount: number;
};
export type CoverageDetails = {
  totalVideos: number;
  completeVideos: number;
  metricCounts: Record<string, number>;
  missingByVideo: Array<{ bvid: string; title: string; missing: string[]; reasons: string[] }>;
  warnings: string[];
  sourceFields: { archiveStat: string[]; compareStat: string[]; overviewStat: string[]; overview: string[] };
  plannedNotIntegrated: string[];
};
export interface BilibiliDataSource {
  readonly version: string;
  startQrLogin(): Promise<{ url: string; key: string }>;
  pollQrLogin(key: string): Promise<{ state: 'waiting' | 'scanned' | 'confirmed' | 'expired'; session?: string }>;
  collect(session: string): Promise<CollectResult>;
}

const qrStartSchema = z.object({ code: z.number(), data: z.object({ url: z.string().url(), qrcode_key: z.string() }) });
const qrPollSchema = z.object({
  code: z.number(),
  data: z.object({ code: z.number(), url: z.string().optional(), refresh_token: z.string().optional() })
});
const envelope = <T extends z.ZodTypeAny>(data: T) => z.object({ code: z.number(), message: z.string().optional(), data });
const archiveSchema = envelope(z.object({
  list: z.array(z.object({
    aid: z.number(), bvid: z.string(), title: z.string(), cover: z.string().nullable().optional(),
    pubtime: z.number(), duration: z.number().nullable().optional(),
    stat: z.object({ play: z.number().nullable().optional(), fans: z.number().nullable().optional(), reply: z.number().nullable().optional(), full_play_ratio: z.number().nullable().optional(), likes: z.number().nullable().optional() }).passthrough()
  }).passthrough()),
  pager: z.object({ total: z.number() }).passthrough()
}));
const compareSchema = envelope(z.object({ list: z.array(z.object({
  bvid: z.string(), stat: z.object({
    play: z.number().nullable().optional(), full_play_ratio: z.number().nullable().optional(),
    tm_rate: z.number().nullable().optional(), crash_rate: z.number().nullable().optional(),
    interact_rate: z.number().nullable().optional(), total_new_attention_cnt: z.number().nullable().optional(),
    play_trans_fan_rate: z.number().nullable().optional(), like: z.number().nullable().optional(),
    comment: z.number().nullable().optional(), dm: z.number().nullable().optional(), fav: z.number().nullable().optional(),
    coin: z.number().nullable().optional(), share: z.number().nullable().optional(), unfollow: z.number().nullable().optional()
  }).passthrough()
}).passthrough()) }));
const overviewSchema = envelope(z.object({
  stat: z.object({ play: z.number(), play_avg_duration: z.number().nullable().optional(), total_duration: z.number().nullable().optional(), like: z.number().nullable().optional(), dm: z.number().nullable().optional(), comment: z.number().nullable().optional(), share: z.number().nullable().optional(), fav: z.number().nullable().optional(), coin: z.number().nullable().optional(), fan: z.number().nullable().optional(), unfollow: z.number().nullable().optional() }).passthrough(),
  audience_proportion: z.object({ fans: z.number(), guest: z.number() }).nullable().optional(),
  play_proportion: z.record(z.string(), z.number()).nullable().optional(),
  viewer_area: z.array(z.object({ location: z.string(), count: z.number() })).nullable().optional(),
  gender: z.record(z.string(), z.number()).nullable().optional(),
  viewer_age: z.record(z.string(), z.number()).nullable().optional()
}).passthrough());
const trendSchema = envelope(z.object({
  tendency: z.array(z.object({ date_key: z.number(), total_inc: z.number(), sub_total_inc: z.number() })).optional().default([]),
  hour_realtime_tendency: z.array(z.object({ date_key: z.number(), total_inc: z.number(), sub_total_inc: z.number() })).nullable().optional()
}).passthrough());

const baseHeaders = {
  accept: 'application/json, text/plain, */*',
  referer: 'https://member.bilibili.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
};
const percent10000 = (value: number | null | undefined) => value == null ? null : value / 100;

function sessionFromLogin(urlValue: string | undefined, headers: Headers) {
  const cookieParts = new Map<string, string>();
  const setCookies = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  if (!setCookies.length) {
    const single = headers.get('set-cookie');
    if (single) setCookies.push(single);
  }
  for (const line of setCookies) {
    const match = line.match(/^\s*([^=;,]+)=([^;,]*)/);
    if (match) cookieParts.set(match[1], match[2]);
  }
  if (urlValue) {
    const url = new URL(urlValue);
    for (const name of ['SESSDATA', 'bili_jct', 'DedeUserID', 'DedeUserID__ckMd5', 'sid']) {
      const value = url.searchParams.get(name);
      if (value) cookieParts.set(name, value);
    }
  }
  if (!cookieParts.has('SESSDATA') || !cookieParts.has('DedeUserID')) return undefined;
  return [...cookieParts].map(([name, value]) => `${name}=${value}`).join('; ');
}

export class BilibiliWebDataSource implements BilibiliDataSource {
  readonly version = 'web-data-v3';
  private requestCounter = 0;

  async startQrLogin() {
    const response = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', { headers: baseHeaders });
    const parsed = qrStartSchema.parse(await response.json());
    if (parsed.code !== 0) throw new Error('BILIBILI_QR_START_FAILED');
    return { url: parsed.data.url, key: parsed.data.qrcode_key };
  }

  async pollQrLogin(key: string) {
    const response = await fetch(`https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${encodeURIComponent(key)}`, { redirect: 'manual', headers: baseHeaders });
    const parsed = qrPollSchema.parse(await response.json());
    const state = parsed.data.code === 0 ? 'confirmed' : parsed.data.code === 86090 ? 'scanned' : parsed.data.code === 86101 ? 'waiting' : 'expired';
    const session = state === 'confirmed' ? sessionFromLogin(parsed.data.url, response.headers) : undefined;
    if (state === 'confirmed' && !session) throw new Error('BILIBILI_SESSION_INCOMPLETE');
    return { state, session } as const;
  }

  private async request<T>(session: string, path: string, schema: z.ZodType<T>, timeoutMs = 8_000): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        this.requestCounter += 1;
        const response = await fetch(`https://member.bilibili.com${path}`, { headers: { ...baseHeaders, cookie: session }, signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok) throw new Error(`BILIBILI_HTTP_${response.status}`);
        const parsed = schema.parse(await response.json()) as T & { code?: number };
        if (parsed.code !== 0) throw new Error(`BILIBILI_API_${parsed.code}`);
        return parsed;
      } catch (error) {
        lastError = error;
        if (attempt === 0 && !/BILIBILI_API_(-101|-111|-352)/.test(error instanceof Error ? error.message : '')) continue;
        throw error;
      }
    }
    throw lastError;
  }

  async collect(session: string): Promise<CollectResult> {
    this.requestCounter = 0;
    const startedAt = performance.now();
    const capturedAt = new Date().toISOString();
    const [firstArchive, compare] = await Promise.all([
      this.request(session, '/x/web/data/archive/index?pn=1&ps=20&scene=archive_compare&order=0', archiveSchema),
      this.request(session, '/x/web/data/archive_diagnose/compare?size=10', compareSchema)
    ]);
    const totalPages = Math.max(1, Math.ceil(firstArchive.data.pager.total / 20));
    const remainingArchivePages = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
      this.request(session, `/x/web/data/archive/index?pn=${index + 2}&ps=20&scene=archive_compare&order=0`, archiveSchema)
    ));
    const archiveItems = [firstArchive.data.list, ...remainingArchivePages.map((page) => page.data.list)].flat();
    const indexMs = Math.round(performance.now() - startedAt);
    const compareByBvid = new Map(compare.data.list.map((item) => [item.bvid, item.stat]));
    const missingCompareItems = archiveItems.filter((item) => !compareByBvid.has(item.bvid));
    const supplementalCompareResults = await Promise.allSettled(missingCompareItems.map((item) =>
      this.request(session, `/x/web/data/archive_diagnose/compare?bvid=${encodeURIComponent(item.bvid)}&size=10`, compareSchema)
    ));
    supplementalCompareResults.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const targetBvid = missingCompareItems[index].bvid;
      const match = result.value.data.list.find((entry) => entry.bvid === targetBvid);
      if (match) compareByBvid.set(match.bvid, match.stat);
    });
    const overviewResults = await Promise.allSettled(archiveItems.map((item) =>
      this.request(session, `/x/web/data/archive_diagnose/overview?bvid=${encodeURIComponent(item.bvid)}`, overviewSchema)
    ));
    const enrichmentMs = Math.round(performance.now() - startedAt - indexMs);
    const rawOverview: Record<string, unknown> = {};
    const videos: VideoRecord[] = [];
    const snapshots: VideoSnapshot[] = [];
    archiveItems.forEach((item, index) => {
      const cmp = compareByBvid.get(item.bvid);
      const result = overviewResults[index];
      const ov = result.status === 'fulfilled' ? result.value.data : null;
      rawOverview[item.bvid] = result.status === 'fulfilled' ? result.value.data : { error: 'unavailable' };
      const totalDuration = ov?.stat.total_duration || item.duration || null;
      const reportedAverage = ov?.stat.play_avg_duration || null;
      const avgWatchPercent = reportedAverage != null && totalDuration ? reportedAverage / totalDuration * 100 : percent10000(cmp?.full_play_ratio ?? item.stat.full_play_ratio);
      const avgWatchSeconds = reportedAverage ?? (avgWatchPercent != null && totalDuration ? avgWatchPercent / 100 * totalDuration : null);
      const sourceNumericMetrics: Record<string, number | null> = {};
      for (const [key, value] of Object.entries(cmp ?? {})) if (typeof value === 'number') sourceNumericMetrics[`compare.${key}`] = value;
      for (const [key, value] of Object.entries(ov?.stat ?? {})) if (typeof value === 'number') sourceNumericMetrics[`overviewStat.${key}`] = value;
      videos.push({ id: String(item.aid), bvid: item.bvid, title: item.title, coverUrl: item.cover ?? null, durationSeconds: item.duration ?? null, publishedAt: new Date(item.pubtime * 1000).toISOString() });
      snapshots.push({
        videoId: String(item.aid), capturedAt, views: ov?.stat.play ?? cmp?.play ?? item.stat.play ?? null,
        impressions: null, coverCtr: percent10000(cmp?.tm_rate), avgWatchSeconds, avgWatchPercent,
        followersGained: ov?.stat.fan ?? cmp?.total_new_attention_cnt ?? item.stat.fans ?? null,
        metrics: {
          ...sourceNumericMetrics,
          likes: ov?.stat.like ?? cmp?.like ?? item.stat.likes ?? null, comments: ov?.stat.comment ?? cmp?.comment ?? item.stat.reply ?? null,
          danmaku: ov?.stat.dm ?? cmp?.dm ?? null, favorites: ov?.stat.fav ?? cmp?.fav ?? null, coins: ov?.stat.coin ?? cmp?.coin ?? null,
          shares: ov?.stat.share ?? cmp?.share ?? null, unfollows: ov?.stat.unfollow ?? cmp?.unfollow ?? null,
          threeSecondBounceRate: percent10000(cmp?.crash_rate), interactionRate: percent10000(cmp?.interact_rate),
          playToFollowRate: percent10000(cmp?.play_trans_fan_rate), fanAudiencePercent: ov?.audience_proportion?.fans ?? null,
          guestAudiencePercent: ov?.audience_proportion?.guest ?? null,
          avgWatchSecondsDerived: reportedAverage == null && avgWatchSeconds != null ? 1 : 0
        },
        dimensions: {
          audienceProportion: ov?.audience_proportion ?? null,
          playProportion: ov?.play_proportion ?? null,
          viewerArea: ov?.viewer_area ?? null,
          viewerGender: ov?.gender ?? null,
          viewerAge: ov?.viewer_age ?? null
        }
      });
    });
    const successfulOverview = overviewResults.filter((item) => item.status === 'fulfilled').length;
    const successfulCompare = archiveItems.filter((item) => compareByBvid.has(item.bvid)).length;
    const metricAccessors: Record<string, (snapshot: VideoSnapshot) => number | null | undefined> = {
      views: (snapshot) => snapshot.views,
      coverCtr: (snapshot) => snapshot.coverCtr,
      avgWatchSeconds: (snapshot) => snapshot.avgWatchSeconds,
      avgWatchPercent: (snapshot) => snapshot.avgWatchPercent,
      followersGained: (snapshot) => snapshot.followersGained,
      likes: (snapshot) => snapshot.metrics.likes,
      comments: (snapshot) => snapshot.metrics.comments,
      danmaku: (snapshot) => snapshot.metrics.danmaku,
      favorites: (snapshot) => snapshot.metrics.favorites,
      coins: (snapshot) => snapshot.metrics.coins,
      shares: (snapshot) => snapshot.metrics.shares,
      threeSecondBounceRate: (snapshot) => snapshot.metrics.threeSecondBounceRate,
      interactionRate: (snapshot) => snapshot.metrics.interactionRate,
      playToFollowRate: (snapshot) => snapshot.metrics.playToFollowRate,
      fanAudiencePercent: (snapshot) => snapshot.metrics.fanAudiencePercent,
      guestAudiencePercent: (snapshot) => snapshot.metrics.guestAudiencePercent
    };
    const metricCounts = Object.fromEntries(Object.entries(metricAccessors).map(([key, read]) => [key, snapshots.filter((snapshot) => read(snapshot) != null).length]));
    const missingByVideo = archiveItems.map((item, index) => {
      const snapshot = snapshots[index];
      const missing = Object.entries(metricAccessors).filter(([, read]) => read(snapshot) == null).map(([key]) => key);
      const reasons: string[] = [];
      if (overviewResults[index].status === 'rejected') reasons.push('overview_request_failed');
      if (!compareByBvid.has(item.bvid)) reasons.push('compare_request_failed_or_not_returned');
      if (!reasons.length && missing.length) reasons.push('bilibili_field_not_returned');
      return { bvid: item.bvid, title: item.title, missing, reasons };
    }).filter((item) => item.missing.length > 0);
    const completeVideos = archiveItems.length - missingByVideo.length;
    const coverage = archiveItems.length ? Math.min(successfulOverview, successfulCompare) / archiveItems.length : 0;
    const warnings = [
      successfulOverview < archiveItems.length ? `${archiveItems.length - successfulOverview} 篇稿件的详情接口失败` : '',
      successfulCompare < archiveItems.length ? `${archiveItems.length - successfulCompare} 篇稿件的诊断接口未返回` : '',
      missingByVideo.length ? `${missingByVideo.length} 篇稿件存在 B 站未返回的指标字段` : ''
    ].filter(Boolean);
    const sourceFields = {
      archiveStat: [...new Set(archiveItems.flatMap((item) => Object.keys(item.stat)))].sort(),
      compareStat: [...new Set([...compareByBvid.values()].flatMap((stat) => Object.keys(stat)))].sort(),
      overviewStat: [...new Set(overviewResults.flatMap((result) => result.status === 'fulfilled' ? Object.keys(result.value.data.stat) : []))].sort(),
      overview: [...new Set(overviewResults.flatMap((result) => result.status === 'fulfilled' ? Object.keys(result.value.data) : []))].sort()
    };
    const plannedNotIntegrated = ['impressions', 'retentionCurve', 'trafficSources', 'realtimePlays'];
    return {
      videos, snapshots, coverage,
      coverageDetails: { totalVideos: archiveItems.length, completeVideos, metricCounts, missingByVideo, warnings, sourceFields, plannedNotIntegrated },
      sourceVersion: this.version,
      raw: { archive: { total: firstArchive.data.pager.total, pages: [firstArchive.data, ...remainingArchivePages.map((page) => page.data)] }, compare: { batch: compare.data, supplemental: supplementalCompareResults.map((result, index) => result.status === 'fulfilled' ? result.value.data : { bvid: missingCompareItems[index].bvid, error: 'unavailable' }) }, overview: rawOverview },
      timings: { indexMs, enrichmentMs, totalNetworkMs: Math.round(performance.now() - startedAt) },
      requestCount: this.requestCounter
    };
  }
}
