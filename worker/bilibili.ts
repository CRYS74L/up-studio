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
  sourceFields: { archiveStat: string[]; compareStat: string[]; diagnose: string[]; overviewStat: string[]; overview: string[]; trend: string[]; realtime: string[]; retention: string[] };
  capabilityCounts: Record<string, { available: number; total: number }>;
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
const playAnalyzeSchema = envelope(z.object({
  guest_interact: z.object({
    tm_rate: z.number().nullable().optional(), crash_rate: z.number().nullable().optional(),
    interact_rate: z.number().nullable().optional(), play_trans_fan_rate: z.number().nullable().optional()
  }).passthrough(),
  arc_audience: z.record(z.string(), z.unknown()).nullable().optional(),
  viewer_assistant: z.record(z.string(), z.unknown()).nullable().optional(),
  improve_idea: z.record(z.string(), z.unknown()).nullable().optional()
}).passthrough());
const trendSchema = envelope(z.object({
  tendency: z.array(z.object({ date_key: z.number(), total_inc: z.number(), sub_total_inc: z.number() })).optional().default([]),
  last_30_day_tendency: z.array(z.object({ date_key: z.number(), total_inc: z.number(), sub_total_inc: z.number().optional() }).passthrough()).nullable().optional(),
  hour_realtime_tendency: z.array(z.object({ date_key: z.number(), total_inc: z.number(), sub_total_inc: z.number() })).nullable().optional()
}).passthrough());
const realtimeSchema = envelope(z.record(z.string(), z.unknown()));
const archiveViewSchema = envelope(z.record(z.string(), z.unknown()));
const retentionSchema = envelope(z.object({
  viewer_quit: z.array(z.object({
    duration_key: z.number(),
    num: z.number()
  }).passthrough()).nullish().transform((value) => value ?? []),
  dm: z.unknown().nullish(),
  peer_viewer_quit: z.array(z.object({
    duration_key: z.number(),
    num: z.number()
  }).passthrough()).nullish().transform((value) => value ?? []),
  peer_dm: z.unknown().nullish(),
  quit_info: z.object({
    avg_play_progress: z.number().nullable().optional(),
    duration: z.number().nullable().optional(),
    full_play_ratio: z.number().nullable().optional()
  }).passthrough().nullable().optional(),
  danmu_info: z.record(z.string(), z.unknown()).nullable().optional(),
  duration_info: z.object({
    avg_play_time: z.string().nullable().optional(),
    avg_play_time_int: z.number().nullable().optional()
  }).passthrough().nullable().optional()
}).passthrough());

const baseHeaders = {
  accept: 'application/json, text/plain, */*',
  referer: 'https://member.bilibili.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
};
const percent10000 = (value: number | null | undefined) => value == null ? null : value / 100;

function findCid(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  if (!Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record.cid === 'number' && Number.isFinite(record.cid) && record.cid > 0) return record.cid;
    for (const key of ['archive', 'arc', 'page', 'pages', 'videos', 'data']) {
      const found = findCid(record[key]);
      if (found != null) return found;
    }
  }
  for (const child of Array.isArray(value) ? value : Object.values(value as Record<string, unknown>)) {
    const found = findCid(child);
    if (found != null) return found;
  }
  return null;
}

async function allSettledInBatches<T, R>(items: T[], batchSize: number, worker: (item: T, index: number) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = [];
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    results.push(...await Promise.allSettled(batch.map((item, offset) => worker(item, start + offset))));
  }
  return results;
}
const safeReason = (result: PromiseSettledResult<unknown>) => result.status === 'fulfilled'
  ? null
  : (result.reason instanceof Error ? result.reason.message : String(result.reason || 'unknown')).replace(/[^A-Z0-9_-]/gi, '_').slice(0, 80);

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
  readonly version = 'web-data-v8';
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
    const [overviewResults, diagnoseResults, playTrendResults, fanTrendResults, realtimeResults, archiveViewResults] = await Promise.all([
      Promise.allSettled(archiveItems.map((item) =>
        this.request(session, `/x/web/data/archive_diagnose/overview?bvid=${encodeURIComponent(item.bvid)}`, overviewSchema)
      )),
      Promise.allSettled(archiveItems.map((item) =>
        this.request(session, `/x/web/data/archive_diagnose/play_analyze?bvid=${encodeURIComponent(item.bvid)}`, playAnalyzeSchema)
      )),
      Promise.allSettled(archiveItems.map((item) =>
        this.request(session, `/x/web/data/archive_diagnose/trend?type=play&bvid=${encodeURIComponent(item.bvid)}`, trendSchema)
      )),
      Promise.allSettled(archiveItems.map((item) =>
        this.request(session, `/x/web/data/archive_diagnose/trend?type=fan&bvid=${encodeURIComponent(item.bvid)}`, trendSchema)
      )),
      Promise.allSettled(archiveItems.map((item) =>
        this.request(session, `/x/web/data/real_time_play_num?bvid=${encodeURIComponent(item.bvid)}`, realtimeSchema)
      )),
      Promise.allSettled(archiveItems.map((item) =>
        this.request(session, `/x/web/data/v3/archive/view?bvid=${encodeURIComponent(item.bvid)}`, archiveViewSchema)
      ))
    ]);
    const retentionResults = await allSettledInBatches(archiveViewResults, 4, async (viewResult) => {
      if (viewResult.status !== 'fulfilled') return Promise.reject(new Error('ARCHIVE_VIEW_UNAVAILABLE'));
      const cid = findCid(viewResult.value.data);
      if (cid == null) return Promise.reject(new Error('ARCHIVE_CID_NOT_RETURNED'));
      return this.request(session, `/x/web/data/v2/archive/analyze/graph?cid=${encodeURIComponent(String(cid))}`, retentionSchema, 10_000);
    });
    const enrichmentMs = Math.round(performance.now() - startedAt - indexMs);
    const rawOverview: Record<string, unknown> = {};
    const rawDiagnose: Record<string, unknown> = {};
    const rawTrend: Record<string, unknown> = {};
    const rawRealtime: Record<string, unknown> = {};
    const rawArchiveView: Record<string, unknown> = {};
    const rawRetention: Record<string, unknown> = {};
    const videos: VideoRecord[] = [];
    const snapshots: VideoSnapshot[] = [];
    archiveItems.forEach((item, index) => {
      const cmp = compareByBvid.get(item.bvid);
      const result = overviewResults[index];
      const ov = result.status === 'fulfilled' ? result.value.data : null;
      const diagnoseResult = diagnoseResults[index];
      const diagnose = diagnoseResult.status === 'fulfilled' ? diagnoseResult.value.data : null;
      const playTrendResult = playTrendResults[index];
      const fanTrendResult = fanTrendResults[index];
      const trend = {
        play: playTrendResult.status === 'fulfilled' ? playTrendResult.value.data : null,
        fan: fanTrendResult.status === 'fulfilled' ? fanTrendResult.value.data : null
      };
      const realtimeResult = realtimeResults[index];
      const realtime = realtimeResult.status === 'fulfilled' ? realtimeResult.value.data : null;
      const archiveViewResult = archiveViewResults[index];
      const retentionResult = retentionResults[index];
      const retention = retentionResult.status === 'fulfilled' ? retentionResult.value.data : null;
      rawOverview[item.bvid] = result.status === 'fulfilled' ? result.value.data : { error: 'unavailable' };
      rawDiagnose[item.bvid] = diagnoseResult.status === 'fulfilled' ? diagnoseResult.value.data : { error: 'unavailable' };
      rawTrend[item.bvid] = {
        play: playTrendResult.status === 'fulfilled' ? playTrendResult.value.data : { error: 'unavailable' },
        fan: fanTrendResult.status === 'fulfilled' ? fanTrendResult.value.data : { error: 'unavailable' }
      };
      rawRealtime[item.bvid] = realtimeResult.status === 'fulfilled' ? realtimeResult.value.data : { error: 'unavailable' };
      rawArchiveView[item.bvid] = archiveViewResult.status === 'fulfilled' ? archiveViewResult.value.data : { error: 'unavailable' };
      rawRetention[item.bvid] = retentionResult.status === 'fulfilled' ? retentionResult.value.data : { error: 'unavailable' };
      const totalDuration = ov?.stat.total_duration || item.duration || null;
      const reportedAverage = ov?.stat.play_avg_duration || null;
      const avgWatchPercent = reportedAverage != null && totalDuration ? reportedAverage / totalDuration * 100 : percent10000(cmp?.full_play_ratio ?? item.stat.full_play_ratio);
      const avgWatchSeconds = reportedAverage ?? (avgWatchPercent != null && totalDuration ? avgWatchPercent / 100 * totalDuration : null);
      const sourceNumericMetrics: Record<string, number | null> = {};
      for (const [key, value] of Object.entries(cmp ?? {})) if (typeof value === 'number') sourceNumericMetrics[`compare.${key}`] = value;
      for (const [key, value] of Object.entries(diagnose?.guest_interact ?? {})) if (typeof value === 'number') sourceNumericMetrics[`diagnose.${key}`] = value;
      for (const [key, value] of Object.entries(ov?.stat ?? {})) if (typeof value === 'number') sourceNumericMetrics[`overviewStat.${key}`] = value;
      for (const [key, value] of Object.entries(realtime ?? {})) if (typeof value === 'number') sourceNumericMetrics[`realtime.${key}`] = value;
      const audienceFans = ov?.audience_proportion?.fans ?? null;
      const audienceGuests = ov?.audience_proportion?.guest ?? null;
      const audienceTotal = audienceFans != null && audienceGuests != null ? audienceFans + audienceGuests : null;
      videos.push({ id: String(item.aid), bvid: item.bvid, title: item.title, coverUrl: item.cover ?? null, durationSeconds: item.duration ?? null, publishedAt: new Date(item.pubtime * 1000).toISOString() });
      snapshots.push({
        videoId: String(item.aid), capturedAt, views: ov?.stat.play ?? cmp?.play ?? item.stat.play ?? null,
        impressions: null, coverCtr: percent10000(diagnose?.guest_interact.tm_rate), avgWatchSeconds, avgWatchPercent,
        followersGained: ov?.stat.fan ?? cmp?.total_new_attention_cnt ?? item.stat.fans ?? null,
        metrics: {
          ...sourceNumericMetrics,
          likes: ov?.stat.like ?? cmp?.like ?? item.stat.likes ?? null, comments: ov?.stat.comment ?? cmp?.comment ?? item.stat.reply ?? null,
          danmaku: ov?.stat.dm ?? cmp?.dm ?? null, favorites: ov?.stat.fav ?? cmp?.fav ?? null, coins: ov?.stat.coin ?? cmp?.coin ?? null,
          shares: ov?.stat.share ?? cmp?.share ?? null, unfollows: ov?.stat.unfollow ?? cmp?.unfollow ?? null,
          threeSecondBounceRate: percent10000(diagnose?.guest_interact.crash_rate), interactionRate: percent10000(diagnose?.guest_interact.interact_rate),
          playToFollowRate: percent10000(diagnose?.guest_interact.play_trans_fan_rate),
          fanAudienceCount: audienceFans, guestAudienceCount: audienceGuests,
          fanAudiencePercent: audienceTotal ? audienceFans! / audienceTotal * 100 : null,
          guestAudiencePercent: audienceTotal ? audienceGuests! / audienceTotal * 100 : null,
          realtimePlay: typeof realtime?.play === 'number' ? realtime.play : typeof realtime?.real_time_play === 'number' ? realtime.real_time_play : typeof realtime?.num === 'number' ? realtime.num : null,
          avgWatchSecondsDerived: reportedAverage == null && avgWatchSeconds != null ? 1 : 0
        },
        dimensions: {
          audienceProportion: ov?.audience_proportion ?? null,
          playProportion: ov?.play_proportion ?? null,
          viewerArea: ov?.viewer_area ?? null,
          viewerGender: ov?.gender ?? null,
          viewerAge: ov?.viewer_age ?? null,
          trend: playTrendResult.status === 'fulfilled' || fanTrendResult.status === 'fulfilled' ? trend : null,
          realtime: realtime ?? null,
          playbackTerminalSources: ov?.play_proportion ?? null,
          retention: retention ? {
            viewerQuit: retention.viewer_quit,
            peerViewerQuit: retention.peer_viewer_quit,
            quitInfo: retention.quit_info ?? null,
            durationInfo: retention.duration_info ?? null
          } : null
        }
      });
    });
    const successfulOverview = overviewResults.filter((item) => item.status === 'fulfilled').length;
    const successfulDiagnose = diagnoseResults.filter((item) => item.status === 'fulfilled').length;
    const successfulPlayTrend = playTrendResults.filter((item) => item.status === 'fulfilled').length;
    const successfulFanTrend = fanTrendResults.filter((item) => item.status === 'fulfilled').length;
    const successfulRealtime = realtimeResults.filter((item) => item.status === 'fulfilled').length;
    const successfulArchiveView = archiveViewResults.filter((item) => item.status === 'fulfilled').length;
    const successfulRetention = retentionResults.filter((item) => item.status === 'fulfilled').length;
    const successfulTerminalSources = overviewResults.filter((item) => item.status === 'fulfilled' && item.value.data.play_proportion && Object.keys(item.value.data.play_proportion).length > 0).length;
    const retentionFailures = retentionResults.flatMap((result, index) => result.status === 'rejected' ? [{
      bvid: archiveItems[index].bvid,
      title: archiveItems[index].title,
      reason: safeReason(result)
    }] : []);
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
      if (diagnoseResults[index].status === 'rejected') reasons.push('diagnose_request_failed');
      if (!reasons.length && missing.length) reasons.push('bilibili_field_not_returned');
      return { bvid: item.bvid, title: item.title, missing, reasons };
    }).filter((item) => item.missing.length > 0);
    const completeVideos = archiveItems.length - missingByVideo.length;
    const coverage = archiveItems.length ? Math.min(successfulOverview, successfulDiagnose) / archiveItems.length : 0;
    const warnings = [
      successfulOverview < archiveItems.length ? `${archiveItems.length - successfulOverview} 篇稿件的详情接口失败` : '',
      successfulDiagnose < archiveItems.length ? `${archiveItems.length - successfulDiagnose} 篇稿件的单稿诊断接口失败` : '',
      successfulPlayTrend < archiveItems.length ? `${archiveItems.length - successfulPlayTrend} 篇稿件的播放趋势接口失败` : '',
      successfulFanTrend < archiveItems.length ? `${archiveItems.length - successfulFanTrend} 篇稿件的涨粉趋势接口失败` : '',
      successfulRealtime < archiveItems.length ? `${archiveItems.length - successfulRealtime} 篇稿件的实时播放接口失败` : '',
      successfulArchiveView < archiveItems.length ? `${archiveItems.length - successfulArchiveView} 篇稿件的 CID 元数据接口失败，留存曲线可能不完整` : '',
      successfulRetention < archiveItems.length ? `${archiveItems.length - successfulRetention} 篇稿件的留存曲线暂不可用：${retentionFailures.map((item) => `${item.title}（${item.reason}）`).join('；')}` : '',
      successfulTerminalSources < archiveItems.length ? `${archiveItems.length - successfulTerminalSources} 篇稿件没有返回播放终端来源` : '',
      missingByVideo.length ? `${missingByVideo.length} 篇稿件存在 B 站未返回的指标字段` : ''
    ].filter(Boolean);
    const sourceFields = {
      archiveStat: [...new Set(archiveItems.flatMap((item) => Object.keys(item.stat)))].sort(),
      compareStat: [...new Set([...compareByBvid.values()].flatMap((stat) => Object.keys(stat)))].sort(),
      diagnose: [...new Set(diagnoseResults.flatMap((result) => result.status === 'fulfilled' ? Object.keys(result.value.data.guest_interact) : []))].sort(),
      overviewStat: [...new Set(overviewResults.flatMap((result) => result.status === 'fulfilled' ? Object.keys(result.value.data.stat) : []))].sort(),
      overview: [...new Set(overviewResults.flatMap((result) => result.status === 'fulfilled' ? Object.keys(result.value.data) : []))].sort(),
      trend: [...new Set([
        ...playTrendResults.flatMap((result) => result.status === 'fulfilled' ? Object.keys(result.value.data).map((key) => `play.${key}`) : []),
        ...fanTrendResults.flatMap((result) => result.status === 'fulfilled' ? Object.keys(result.value.data).map((key) => `fan.${key}`) : [])
      ])].sort(),
      realtime: [...new Set(realtimeResults.flatMap((result) => result.status === 'fulfilled' ? Object.keys(result.value.data) : []))].sort()
      ,retention: [...new Set(retentionResults.flatMap((result) => result.status === 'fulfilled' ? Object.keys(result.value.data) : []))].sort()
    };
    const plannedNotIntegrated = ['impressions', 'recommendationTrafficSources'];
    const capabilityCounts = {
      archive: { available: archiveItems.length, total: archiveItems.length },
      compare: { available: successfulCompare, total: archiveItems.length },
      overview: { available: successfulOverview, total: archiveItems.length },
      diagnose: { available: successfulDiagnose, total: archiveItems.length },
      playTrend: { available: successfulPlayTrend, total: archiveItems.length },
      fanTrend: { available: successfulFanTrend, total: archiveItems.length },
      realtime: { available: successfulRealtime, total: archiveItems.length },
      archiveView: { available: successfulArchiveView, total: archiveItems.length },
      retention: { available: successfulRetention, total: archiveItems.length },
      terminalSources: { available: successfulTerminalSources, total: archiveItems.length }
    };
    return {
      videos, snapshots, coverage,
      coverageDetails: { totalVideos: archiveItems.length, completeVideos, metricCounts, missingByVideo, warnings, sourceFields, capabilityCounts, plannedNotIntegrated },
      sourceVersion: this.version,
      raw: { archive: { total: firstArchive.data.pager.total, pages: [firstArchive.data, ...remainingArchivePages.map((page) => page.data)] }, compare: { batch: compare.data, supplemental: supplementalCompareResults.map((result, index) => result.status === 'fulfilled' ? result.value.data : { bvid: missingCompareItems[index].bvid, error: 'unavailable' }) }, overview: rawOverview, diagnose: rawDiagnose, trend: rawTrend, realtime: rawRealtime, archiveView: rawArchiveView, retention: rawRetention },
      timings: { indexMs, enrichmentMs, totalNetworkMs: Math.round(performance.now() - startedAt) },
      requestCount: this.requestCounter
    };
  }
}
