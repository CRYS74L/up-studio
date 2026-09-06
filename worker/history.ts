import type { CollectResult } from './bilibili';
export const trendWindows = { first30d: 'tendency', recent30: 'last_30_day_tendency', first48h: 'hour_tendency', hourRealtime: 'hour_realtime_tendency' } as const;
export const chinaDay = (unixSeconds: number) => new Date(unixSeconds * 1000 + 8 * 3600_000).toISOString().slice(0, 10);
export function recentWindow<T extends {date_key:number}>(points:T[],days=30):T[]{
 const latest=Math.max(...points.map(p=>p.date_key));
 return points.filter(p=>p.date_key>=latest-(days-1)*86400);
}
const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export function historyStatements(db: D1Database, result: CollectResult) {
  const statements: D1PreparedStatement[] = [];
  for (const snapshot of result.snapshots) {
    const trend = snapshot.dimensions.trend as Record<string, Record<string, unknown>> | null;
    for (const type of ['play', 'fan']) for (const window of Object.values(trendWindows)) {
      const points = trend?.[type]?.[window];
      if (!Array.isArray(points)) continue;
      for (const point of points) {
        if (finite(point.date_key) == null || finite(point.total_inc) == null) continue;
        statements.push(db.prepare(`INSERT INTO video_trend_points(video_id,type,window,date_key,total_inc,sub_total_inc,source_json,captured_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(video_id,type,window,date_key) DO UPDATE SET total_inc=excluded.total_inc,sub_total_inc=excluded.sub_total_inc,source_json=excluded.source_json,captured_at=excluded.captured_at WHERE excluded.captured_at>=video_trend_points.captured_at`).bind(snapshot.videoId,type,window,point.date_key,point.total_inc,finite(point.sub_total_inc),JSON.stringify(point),snapshot.capturedAt));
      }
    }
  }
  const account = result.account;
  if (account) {
    statements.push(db.prepare('INSERT OR REPLACE INTO account_snapshots(captured_at,followers,source_json) VALUES(?,?,?)').bind(account.capturedAt,finite(account.stat?.total_num),JSON.stringify(account)));
    const days = new Map<string, Record<string, number | null>>();
    for (const [type, graph] of Object.entries(account.graphs)) {
      if (!Array.isArray(graph?.list)) continue;
      for (const point of graph.list) {
        if (finite(point.date) == null) continue;
        const day = chinaDay(point.date); const values = days.get(day) ?? {};
        values[type === 'total' ? 'followers' : type === 'follow' ? 'follows' : 'unfollows'] = finite(point.fans_total_inc);
        if (finite(point.play_total_inc) != null) values.views = finite(point.play_total_inc);
        days.set(day,values);
      }
    }
    for (const [day, values] of days) statements.push(db.prepare(`INSERT INTO account_trends(day,followers,follows,unfollows,views,captured_at) VALUES(?,?,?,?,?,?) ON CONFLICT(day) DO UPDATE SET followers=COALESCE(excluded.followers,account_trends.followers),follows=COALESCE(excluded.follows,account_trends.follows),unfollows=COALESCE(excluded.unfollows,account_trends.unfollows),views=COALESCE(excluded.views,account_trends.views),captured_at=excluded.captured_at`).bind(day,values.followers??null,values.follows??null,values.unfollows??null,values.views??null,account.capturedAt));
  }
  return statements;
}
