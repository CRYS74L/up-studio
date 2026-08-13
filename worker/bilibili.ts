import { z } from 'zod';
import type { VideoSnapshot } from '../shared/contracts';

export type VideoRecord = {
  id: string; bvid: string; title: string; coverUrl: string | null;
  durationSeconds: number | null; publishedAt: string;
};
export type CollectResult = {
  videos: VideoRecord[]; snapshots: VideoSnapshot[]; coverage: number;
  sourceVersion: string; raw: unknown; timings: Record<string, number>; requestCount: number;
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
  readonly version = 'web-data-v2';

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
    const response = await fetch(`https://member.bilibili.com${path}`, { headers: { ...baseHeaders, cookie: session }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`BILIBILI_HTTP_${response.status}`);
    const parsed = schema.parse(await response.json()) as T & { code?: number };
    if (parsed.code !== 0) throw new Error(`BILIBILI_API_${parsed.code}`);
    return parsed;
  }

  async collect(session: string): Promise<CollectResult> {
    const startedAt = performance.now();
    const capturedAt = new Date().toISOString();
    const [archive, compare] = await Promise.all([
      this.request(session, '/x/web/data/archive/index?pn=1&ps=20&scene=archive_compare&order=0', archiveSchema),
      this.request(session, '/x/web/data/archive_diagnose/compare?size=10', compareSchema)
    ]);
    const indexMs = Math.round(performance.now() - startedAt);
    const compareByBvid = new Map(compare.data.list.map((item) => [item.bvid, item.stat]));
    const overviewResults = await Promise.allSettled(archive.data.list.map((item) =>
      this.request(session, `/x/web/data/archive_diagnose/overview?bvid=${encodeURIComponent(item.bvid)}`, overviewSchema)
    ));
    const enrichmentMs = Math.round(performance.now() - startedAt - indexMs);
    const rawOverview: Record<string, unknown> = {};
    const videos: VideoRecord[] = [];
    const snapshots: VideoSnapshot[] = [];
    archive.data.list.forEach((item, index) => {
      const cmp = compareByBvid.get(item.bvid);
      const result = overviewResults[index];
      const ov = result.status === 'fulfilled' ? result.value.data : null;
      rawOverview[item.bvid] = result.status === 'fulfilled' ? result.value.data : { error: 'unavailable' };
      const totalDuration = ov?.stat.total_duration || item.duration || null;
      const reportedAverage = ov?.stat.play_avg_duration || null;
      const avgWatchPercent = reportedAverage != null && totalDuration ? reportedAverage / totalDuration * 100 : percent10000(cmp?.full_play_ratio ?? item.stat.full_play_ratio);
      const avgWatchSeconds = reportedAverage ?? (avgWatchPercent != null && totalDuration ? avgWatchPercent / 100 * totalDuration : null);
      videos.push({ id: String(item.aid), bvid: item.bvid, title: item.title, coverUrl: item.cover ?? null, durationSeconds: item.duration ?? null, publishedAt: new Date(item.pubtime * 1000).toISOString() });
      snapshots.push({
        videoId: String(item.aid), capturedAt, views: ov?.stat.play ?? cmp?.play ?? item.stat.play ?? null,
        impressions: null, coverCtr: percent10000(cmp?.tm_rate), avgWatchSeconds, avgWatchPercent,
        followersGained: ov?.stat.fan ?? cmp?.total_new_attention_cnt ?? item.stat.fans ?? null,
        metrics: {
          likes: ov?.stat.like ?? cmp?.like ?? item.stat.likes ?? null, comments: ov?.stat.comment ?? cmp?.comment ?? item.stat.reply ?? null,
          danmaku: ov?.stat.dm ?? cmp?.dm ?? null, favorites: ov?.stat.fav ?? cmp?.fav ?? null, coins: ov?.stat.coin ?? cmp?.coin ?? null,
          shares: ov?.stat.share ?? cmp?.share ?? null, unfollows: ov?.stat.unfollow ?? cmp?.unfollow ?? null,
          threeSecondBounceRate: percent10000(cmp?.crash_rate), interactionRate: percent10000(cmp?.interact_rate),
          playToFollowRate: percent10000(cmp?.play_trans_fan_rate), fanAudiencePercent: ov?.audience_proportion?.fans ?? null,
          guestAudiencePercent: ov?.audience_proportion?.guest ?? null,
          avgWatchSecondsDerived: reportedAverage == null && avgWatchSeconds != null ? 1 : 0
        }
      });
    });
    const successfulOverview = overviewResults.filter((item) => item.status === 'fulfilled').length;
    return {
      videos, snapshots, coverage: archive.data.list.length ? successfulOverview / archive.data.list.length : 0,
      sourceVersion: this.version,
      raw: { archive: archive.data, compare: compare.data, overview: rawOverview },
      timings: { indexMs, enrichmentMs, totalNetworkMs: Math.round(performance.now() - startedAt) },
      requestCount: 2 + archive.data.list.length
    };
  }
}
