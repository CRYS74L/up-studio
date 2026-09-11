import {registerAi,aiModel,aiEffort,AI_MODELS} from './ai-analysis';
import {registerChat} from './ai-chat';
import {accountDatabase,rootDatabase,prepareAccount,fetchProfile} from './accounts';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { analysisQuerySchema } from '../shared/contracts';
import { BilibiliWebDataSource } from './bilibili';
import { buildManifest } from './backup';
import { decryptJson, encryptJson, hmac, sha256 } from './crypto';
import { historyStatements, trendWindows, recentWindow } from './history';
import { buildSummaryComparison, monthAgoReference, hasSharedOverviewBaseline } from './summary';

type Bindings = {
  DB: D1Database; BUCKET: R2Bucket; ASSETS: Fetcher; APP_ORIGIN: string;
  MASTER_ENCRYPTION_KEY_BASE64?: string; APP_PASSWORD_HASH?: string; INTERNAL_COLLECT_SECRET?: string;
  DEEPSEEK_API_KEY?: string; DEEPSEEK_MODEL: string; AI_DAILY_CNY_LIMIT: string; AI_MONTHLY_CNY_LIMIT: string;
  GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string; RESEND_API_KEY?: string; ALERT_RECIPIENT?: string;
};
type Variables = { deviceId?: string };
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const jsonError = (c: any, status: number, code: string, message: string) => c.json({ ok: false, error: { code, message } }, status);

app.use('/api/*', secureHeaders());
app.use('/api/*', async (c, next) => cors({ origin: c.env.APP_ORIGIN, credentials: true })(c, next));

app.post('/api/auth/login', zValidator('json', z.object({ password: z.string().min(1), remember: z.boolean().default(false), deviceLabel: z.string().max(80).default('当前设备') })), async (c) => {
  if (!c.env.APP_PASSWORD_HASH) return jsonError(c, 503, 'not_configured', '尚未配置看板密码');
  const input = c.req.valid('json');
  if (await sha256(input.password) !== c.env.APP_PASSWORD_HASH) return jsonError(c, 401, 'invalid_credentials', '密码不正确');
  const token = crypto.randomUUID() + crypto.randomUUID(); const tokenHash = await sha256(token); const id = crypto.randomUUID();
  const now = new Date().toISOString(); const expires = input.remember ? new Date(Date.now() + 180 * 86400000).toISOString() : null;
  await c.env.DB.prepare('INSERT INTO devices(id,token_hash,label,created_at,last_seen_at,expires_at) VALUES(?,?,?,?,?,?)').bind(id, tokenHash, input.deviceLabel, now, now, expires).run();
  c.header('Set-Cookie', `insights_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict${expires ? `; Expires=${new Date(expires).toUTCString()}` : ''}`);
  return c.json({ ok: true });
});

app.get('/api/account/profile',async(c)=>{
 const db=rootDatabase(c.env.DB),secret=await db.prepare("SELECT ciphertext,iv FROM encrypted_secrets WHERE id='bilibili_session'").first<{ciphertext:string;iv:string}>();
 if(!secret||!c.env.MASTER_ENCRYPTION_KEY_BASE64)return c.json({ok:true,profile:null,accounts:[]});
 const active=await db.prepare("SELECT value_json FROM settings WHERE key='active_account'").first<{value_json:string}>();
 const cached=active?await db.prepare('SELECT value_json,updated_at FROM settings WHERE key=?').bind('profile_'+JSON.parse(active.value_json)).first<{value_json:string;updated_at:string}>():null;
 let profile=cached?JSON.parse(cached.value_json):null;
 if(!cached||Date.now()-Date.parse(cached.updated_at)>300000){try{const {session}=await decryptJson<{session:string}>(secret.ciphertext,secret.iv,c.env.MASTER_ENCRYPTION_KEY_BASE64);profile=await fetchProfile(session);await prepareAccount(db,profile);await db.batch([db.prepare("INSERT OR REPLACE INTO settings(key,value_json,updated_at) VALUES('active_account',?,?)").bind(JSON.stringify(profile.uid),new Date().toISOString()),db.prepare("INSERT OR REPLACE INTO encrypted_secrets(id,ciphertext,iv,updated_at) VALUES(?,?,?,?)").bind('bilibili_session_'+profile.uid,secret.ciphertext,secret.iv,new Date().toISOString())]);}catch{if(!profile)return jsonError(c,502,'profile_unavailable','UP主资料暂时无法读取，请重新连接账号');}}
 const accounts=(await db.prepare("SELECT value_json FROM settings WHERE key LIKE 'profile_%'").all<{value_json:string}>()).results.map(r=>JSON.parse(r.value_json));
 return c.json({ok:true,profile,accounts});
});
app.post('/api/account/switch',zValidator('json',z.object({uid:z.string().regex(/^\d+$/)})),async(c)=>{
 const db=rootDatabase(c.env.DB),uid=c.req.valid('json').uid,secret=await db.prepare('SELECT ciphertext,iv FROM encrypted_secrets WHERE id=?').bind('bilibili_session_'+uid).first<{ciphertext:string;iv:string}>();if(!secret)return jsonError(c,404,'account_missing','请先扫码连接该账号');
 await db.batch([db.prepare("UPDATE encrypted_secrets SET ciphertext=?,iv=?,updated_at=? WHERE id='bilibili_session'").bind(secret.ciphertext,secret.iv,new Date().toISOString()),db.prepare("UPDATE settings SET value_json=?,updated_at=? WHERE key='active_account'").bind(JSON.stringify(uid),new Date().toISOString())]);return c.json({ok:true});
});

app.get('/api/devices', async (c) => c.json({ ok: true, devices: (await c.env.DB.prepare('SELECT id,label,created_at,last_seen_at,expires_at FROM devices WHERE revoked_at IS NULL ORDER BY last_seen_at DESC').all()).results }));
app.delete('/api/devices/:id', async (c) => { await c.env.DB.prepare('UPDATE devices SET revoked_at=? WHERE id=?').bind(new Date().toISOString(), c.req.param('id')).run(); return c.json({ ok: true }); });
app.post('/api/auth/logout', async (c) => { c.header('Set-Cookie', 'insights_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'); return c.json({ ok: true }); });

app.post('/api/bilibili/qr/start', async (c) => {
  if (!c.env.MASTER_ENCRYPTION_KEY_BASE64) return jsonError(c, 503, 'not_configured', '尚未配置登录会话加密密钥，暂时无法连接');
  const source = new BilibiliWebDataSource();
  try { return c.json({ ok: true, ...(await source.startQrLogin()) }); } catch { return jsonError(c, 502, 'bilibili_unavailable', '暂时无法生成 B 站二维码'); }
});
app.get('/api/bilibili/qr/status/:key', async (c) => {
  const source = new BilibiliWebDataSource();
  try {
    const result = await source.pollQrLogin(c.req.param('key'));
    if (result.session && c.env.MASTER_ENCRYPTION_KEY_BASE64) {
      const profile=await fetchProfile(result.session),root=rootDatabase(c.env.DB);await prepareAccount(root,profile);
      const encrypted = await encryptJson({ session: result.session }, c.env.MASTER_ENCRYPTION_KEY_BASE64);
      await root.batch([root.prepare("INSERT INTO settings(key,value_json,updated_at) VALUES('active_account',?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").bind(JSON.stringify(profile.uid),new Date().toISOString()),root.prepare("INSERT INTO encrypted_secrets(id,ciphertext,iv,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,updated_at=excluded.updated_at").bind('bilibili_session_'+profile.uid,encrypted.ciphertext,encrypted.iv,new Date().toISOString()),root.prepare("INSERT INTO encrypted_secrets(id,ciphertext,iv,updated_at) VALUES('bilibili_session',?,?,?) ON CONFLICT(id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,updated_at=excluded.updated_at").bind(encrypted.ciphertext,encrypted.iv,new Date().toISOString())]);

    }
    return c.json({ ok: true, state: result.state });
  } catch { return jsonError(c, 502, 'bilibili_unavailable', '二维码状态查询失败'); }
});

async function loadSummaryAt(db: D1Database, capturedAt: string) {
  const rows = await db.prepare("SELECT COUNT(DISTINCT video_id) videos, MAX(captured_at) fresh, SUM(views) views, SUM(followers_gained) followers, AVG(CAST(json_extract(metrics_json,'$.coverAttractionScore') AS REAL)) cover_ctr, AVG(avg_watch_percent) avg_watch_percent, SUM(avg_watch_seconds*views)/NULLIF(SUM(CASE WHEN avg_watch_seconds IS NOT NULL THEN views END),0) avg_watch_seconds FROM video_snapshots WHERE captured_at=?").bind(capturedAt).first<any>();
  const latest = await db.prepare('SELECT views,metrics_json FROM video_snapshots WHERE captured_at=?').bind(capturedAt).all<{ views: number; metrics_json: string }>();
  let interactions = 0; let totalViews = 0; let completeInteractions = 0;
  for (const item of latest.results) {
    const metrics = JSON.parse(item.metrics_json || '{}');
    const values = ['likes','comments','danmaku','favorites','coins','shares'].map((key) => metrics[key]);
    if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) continue;
    completeInteractions += 1;
    interactions += values.reduce((sum, value) => sum + value, 0); totalViews += item.views ?? 0;
  }
  return { ...(rows ?? {}), avg_views: latest.results.length && latest.results.every(item => item.views != null) ? rows.views / latest.results.length : null, avg_interactions: latest.results.length && completeInteractions === latest.results.length ? interactions / latest.results.length : null, interaction_rate: totalViews ? interactions / totalViews * 100 : null };
}

app.get('/api/dashboard/summary', async (c) => {
  const current = await c.env.DB.prepare('SELECT captured_at,source FROM video_snapshots ORDER BY captured_at DESC LIMIT 1').first<{ captured_at: string; source: string }>();
  const currentAt = current?.captured_at;
  const now = new Date().toISOString();
  const comparisonPeriod = monthAgoReference(now);
  const day = (at: string) => new Date(Date.parse(at) + 8 * 3600_000).toISOString().slice(0,10);
  const periods = [
    { day: day(comparisonPeriod.start), label: '相比上月' },
    { day: day(new Date(Date.parse(now)-7*86400_000).toISOString()), label: '相比上周' },
    { day: day(new Date(Date.parse(now)-86400_000).toISOString()), label: '相比昨天' }
  ];
  const sourceFamily = current?.source.startsWith('web-data-v') ? 'web-data-v%' : current?.source;
  const account = await c.env.DB.prepare('SELECT followers FROM account_snapshots WHERE followers IS NOT NULL ORDER BY captured_at DESC LIMIT 1').first<{ followers: number }>();
  const summary = { ...(currentAt ? await loadSummaryAt(c.env.DB, currentAt) : {}), account_followers: account?.followers ?? null };
  const comparison = buildSummaryComparison(summary, {});
  const comparisonLabels: Record<string, string | null> = Object.fromEntries(Object.keys(comparison).map(key => [key,null]));
  let previousAt: string | null = null;
  for (const period of periods) {
    const start = new Date(`${period.day}T00:00:00+08:00`).toISOString(), end = new Date(`${period.day}T23:59:59.999+08:00`).toISOString();
    const previous = sourceFamily ? await c.env.DB.prepare('SELECT captured_at FROM video_snapshots WHERE source LIKE ? AND captured_at>=? AND captured_at<=? GROUP BY captured_at ORDER BY captured_at DESC LIMIT 1').bind(sourceFamily,start,end).first<{captured_at:string}>() : null;
    const priorAccount = await c.env.DB.prepare('SELECT followers FROM account_trends WHERE day=? AND followers IS NOT NULL').bind(period.day).first<{followers:number}>();
    const priorSnapshot = priorAccount ? null : await c.env.DB.prepare('SELECT followers FROM account_snapshots WHERE captured_at>=? AND captured_at<=? AND followers IS NOT NULL ORDER BY captured_at DESC LIMIT 1').bind(start,end).first<{followers:number}>();
    const values = { ...(previous ? await loadSummaryAt(c.env.DB,previous.captured_at) : {}), account_followers: priorAccount?.followers ?? priorSnapshot?.followers ?? null };
    const candidate = buildSummaryComparison(summary,values);
    if (hasSharedOverviewBaseline(candidate)) {
      for (const key of Object.keys(comparison)) { comparison[key]=candidate[key]; comparisonLabels[key]=candidate[key]?period.label:null; }
      previousAt=previous?.captured_at??null;break;
    }
  }
  const lastRun = await c.env.DB.prepare('SELECT status,coverage,coverage_json,started_at,finished_at,error_code,safe_error_detail FROM acquisition_runs ORDER BY started_at DESC LIMIT 1').first<any>();
  return c.json({ ok: true, configured: Boolean(currentAt), summary, comparison, comparisonLabels, comparisonPeriod, comparisonCapturedAt: previousAt ?? null, miniTrends: currentAt ? {overview:await overviewHistory(c.env.DB),account:(await c.env.DB.prepare('SELECT followers FROM account_trends WHERE followers IS NOT NULL ORDER BY day').all()).results} : null, freshnessMinutes: currentAt ? Math.floor((Date.now() - Date.parse(currentAt)) / 60000) : null, acquisition: lastRun ? { ...lastRun, details: JSON.parse(lastRun.coverage_json || '{}'), coverage_json: undefined } : null });
});
app.get('/api/account/history', async (c) => {
  const points = (await c.env.DB.prepare('SELECT day,followers,follows,unfollows,views FROM account_trends ORDER BY day').all()).results;
  const snapshot = await c.env.DB.prepare('SELECT captured_at,followers FROM account_snapshots WHERE followers IS NOT NULL ORDER BY captured_at DESC LIMIT 1').first<any>();
  return c.json({ ok: true, points, latest: snapshot ? { ...points.at(-1), ...snapshot } : points.at(-1) ?? null });
});
app.get('/api/videos/:id/history', async (c) => {
  const rows = (await c.env.DB.prepare('SELECT type,window,source_json,captured_at FROM video_trend_points WHERE video_id=? ORDER BY captured_at,date_key').bind(c.req.param('id')).all<{type:string;window:string;source_json:string;captured_at:string}>()).results;
  const series = Object.fromEntries(['play','fan'].map(type => {
    const selected = rows.filter(row=>row.type===type);
    const lifetime = new Map<number, any>();
    for (const row of selected) if (['tendency','last_30_day_tendency'].includes(row.window)) { const point=JSON.parse(row.source_json); lifetime.set(point.date_key,point); }
    return [type,{ ...Object.fromEntries(Object.entries(trendWindows).map(([key,window]) => {const points=selected.filter(row=>row.window===window).map(row=>JSON.parse(row.source_json)).sort((a,b)=>a.date_key-b.date_key);return [key,key==='recent30'?recentWindow(points):key==='hourRealtime'?recentWindow(points,3):points];})), lifetime:[...lifetime.values()].sort((a,b)=>a.date_key-b.date_key) }];
  }));
  return c.json({ ok: true, series, sourceWindows: trendWindows });
});
app.get('/api/videos', async (c) => {
  const capturedAt = c.req.query('capturedAt');
  if (capturedAt && !z.string().datetime().safeParse(capturedAt).success) return jsonError(c, 400, 'invalid_snapshot', '快照时间格式无效');
  const query = capturedAt
    ? c.env.DB.prepare('SELECT v.*,s.views,s.impressions,s.cover_ctr,s.avg_watch_seconds,s.avg_watch_percent,s.followers_gained,s.metrics_json,s.dimensions_json,s.captured_at FROM videos v JOIN video_snapshots s ON s.video_id=v.id WHERE s.captured_at=? ORDER BY v.published_at DESC').bind(capturedAt)
    : c.env.DB.prepare('SELECT v.*,s.views,s.impressions,s.cover_ctr,s.avg_watch_seconds,s.avg_watch_percent,s.followers_gained,s.metrics_json,s.dimensions_json,s.captured_at FROM videos v LEFT JOIN video_snapshots s ON s.id=(SELECT id FROM video_snapshots WHERE video_id=v.id ORDER BY captured_at DESC LIMIT 1) ORDER BY v.published_at DESC');
  const rows = (await query.all()).results;
  return c.json({ ok: true, videos: rows.map((row: any) => { const metrics=JSON.parse(row.metrics_json || '{}'); return { ...row, cover_ctr:metrics.coverAttractionScore ?? null, cover_url:`/api/covers/${encodeURIComponent(row.id)}`, metrics, dimensions: JSON.parse(row.dimensions_json || '{}'), metrics_json: undefined, dimensions_json: undefined }; }) });
});
app.get('/api/videos/:id', async (c) => {
  const row: any = await c.env.DB.prepare('SELECT v.*,s.views,s.impressions,s.cover_ctr,s.avg_watch_seconds,s.avg_watch_percent,s.followers_gained,s.metrics_json,s.dimensions_json,s.captured_at FROM videos v LEFT JOIN video_snapshots s ON s.id=(SELECT id FROM video_snapshots WHERE video_id=v.id ORDER BY captured_at DESC LIMIT 1) WHERE v.id=?').bind(c.req.param('id')).first();
  if (!row) return jsonError(c, 404, 'not_found', '没有找到这篇稿件');
  const metrics=JSON.parse(row.metrics_json || '{}');
  return c.json({ ok: true, video: { ...row, cover_ctr:metrics.coverAttractionScore ?? null, cover_url:`/api/covers/${encodeURIComponent(row.id)}`, metrics, dimensions: JSON.parse(row.dimensions_json || '{}'), metrics_json: undefined, dimensions_json: undefined } });
});
app.get('/api/covers/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT cover_url FROM videos WHERE id=?').bind(c.req.param('id')).first<{ cover_url:string|null }>();
  if (!row?.cover_url) return new Response(null, { status: 404 });
  const url = new URL(row.cover_url.replace(/^http:/, 'https:'));
  if (!/(^|\.)hdslb\.com$/.test(url.hostname)) return new Response(null, { status: 403 });
  if (c.req.query('variant') === 'bubble') url.pathname=url.pathname.replace(/@.*$/,'')+'@256w_256h_1c.webp';
  if (c.req.query('variant') === 'card') url.pathname=url.pathname.replace(/@.*$/, '')+'@800w_450h_1c.webp';
  if (c.req.query('variant') === 'preview') url.pathname=url.pathname.replace(/@.*$/, '')+'@320w_180h_1c.webp';
  if (c.req.query('variant') === 'thumb') url.pathname += '@128w_128h_1c.webp';
  const upstream = await fetch(url, { headers: { referer:'https://member.bilibili.com/', 'user-agent':'Mozilla/5.0' }, cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!upstream.ok) return new Response(null, { status: 502 });
  return new Response(upstream.body, { headers: { 'content-type':upstream.headers.get('content-type')||'image/jpeg', 'cache-control':'public, max-age=86400, stale-while-revalidate=604800', 'cross-origin-resource-policy':'same-origin' } });
});
app.get('/api/videos/:id/timeseries', async (c) => {
  const rows = (await c.env.DB.prepare('SELECT captured_at,views,cover_ctr,avg_watch_seconds,avg_watch_percent,followers_gained,metrics_json FROM video_snapshots WHERE video_id=? ORDER BY captured_at').bind(c.req.param('id')).all()).results;
  return c.json({ ok: true, points: rows.map((row: any) => ({ ...row, metrics: JSON.parse(row.metrics_json || '{}'), metrics_json: undefined })) });
});
const labMetricSql: Record<string, string> = { views:'s.views', cover_ctr:"CAST(json_extract(s.metrics_json,'$.coverAttractionScore') AS REAL)", avg_watch_seconds:'s.avg_watch_seconds', avg_watch_percent:'s.avg_watch_percent', followers_gained:'s.followers_gained', published_at:'v.published_at', duration_seconds:'v.duration_seconds' };
app.post('/api/lab/query', zValidator('json', analysisQuerySchema), async (c) => {
  const query = c.req.valid('json');
  const requested = [...new Set([query.xAxis, query.yAxis, ...query.metrics].filter(Boolean) as string[])];
  if (requested.some((metric) => !labMetricSql[metric])) return jsonError(c, 400, 'unsupported_metric', '查询包含尚未开放的指标');
  const columns = requested.map((metric) => `${labMetricSql[metric]} AS ${metric}`).join(',');
  const rows = (await c.env.DB.prepare(`SELECT v.id video_id,v.bvid,v.title,${columns},s.captured_at FROM videos v JOIN video_snapshots s ON s.id=(SELECT id FROM video_snapshots WHERE video_id=v.id AND captured_at BETWEEN ? AND ? ORDER BY captured_at DESC LIMIT 1) ORDER BY v.published_at DESC`).bind(query.from, query.to).all()).results;
  return c.json({ ok: true, query, rows, definitions: requested.map((id) => ({ id, nullable: true, source: id === 'duration_seconds' || id === 'published_at' ? '稿件元数据' : 'B站快照' })) });
});
app.post('/api/bilibili/qr/disconnect', async (c) => { await c.env.DB.prepare("DELETE FROM encrypted_secrets WHERE id='bilibili_session' OR id=?").bind('bilibili_session_'+((c.env.DB as any).accountUid??'')).run(); return c.json({ ok: true }); });
app.get('/api/bilibili/status', async (c) => {
  const secret = await c.env.DB.prepare("SELECT updated_at FROM encrypted_secrets WHERE id='bilibili_session'").first<{ updated_at: string }>();
  const lastRun = await c.env.DB.prepare('SELECT id,status,started_at,finished_at,coverage,coverage_json,error_code,safe_error_detail,timings_json,request_count FROM acquisition_runs ORDER BY started_at DESC LIMIT 1').first<any>();
  return c.json({ ok: true, connected: Boolean(secret), connectedAt: secret?.updated_at ?? null, lastRun: lastRun ? { ...lastRun, details: JSON.parse(lastRun.coverage_json || '{}'), coverage_json: undefined } : null });
});

app.get('/api/acquisition/runs', async (c) => {
  const rows = (await c.env.DB.prepare('SELECT id,status,started_at,finished_at,coverage,coverage_json,error_code,timings_json,request_count FROM acquisition_runs ORDER BY started_at DESC LIMIT 360').all()).results;
  return c.json({ok:true,runs:rows.map((row:any)=>({...row,details:JSON.parse(row.coverage_json||'{}'),timings:JSON.parse(row.timings_json||'{}'),coverage_json:undefined,timings_json:undefined}))});
});
async function overviewHistory(db:D1Database){
 const rows=(await db.prepare("SELECT captured_at,views,followers_gained,avg_watch_seconds,avg_watch_percent,metrics_json FROM video_snapshots WHERE captured_at IN (SELECT captured_at FROM video_snapshots WHERE source LIKE 'web-data-v%' GROUP BY captured_at ORDER BY captured_at DESC LIMIT 30) ORDER BY captured_at").all()).results as any[];
 const groups=new Map<string,any[]>();for(const row of rows){const list=groups.get(row.captured_at)??[];list.push(row);groups.set(row.captured_at,list)}
 return [...groups].map(([captured_at,items])=>{const views=items.reduce((n,v)=>n+(v.views??0),0);const interactions=items.map(v=>{const m=JSON.parse(v.metrics_json||'{}'),xs=['likes','comments','danmaku','favorites','coins','shares'].map(k=>m[k]);return xs.every(x=>typeof x==='number'&&Number.isFinite(x))?xs.reduce((a,b)=>a+b,0):null});return {captured_at,views,avg_views:items.every(v=>v.views!=null)?views/items.length:null,avg_interactions:interactions.every(v=>v!=null)?interactions.reduce((a,b)=>a!+b!,0)!/items.length:null};});
}
app.get('/api/dashboard/history',async(c)=>c.json({ok:true,points:await overviewHistory(c.env.DB)}));

app.post('/api/imports/preview', async (c) => {
  const body = await c.req.arrayBuffer();
  if (body.byteLength > 20 * 1024 * 1024) return jsonError(c, 413, 'file_too_large', '导入文件不得超过 20MB');
  const text = new TextDecoder().decode(body.slice(0, 100000));
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  return c.json({ ok: true, sha256: await sha256(body), detectedColumns: firstLine.split(/[\t,]/).map((v) => v.trim()).filter(Boolean), bytes: body.byteLength });
});
app.post('/api/imports/commit', async (c) => jsonError(c, 409, 'preview_required', '必须先完成字段映射预检；当前版本不会盲目写入未知表格'));

async function readDeepSeekKey(env: Bindings) {
  if (env.MASTER_ENCRYPTION_KEY_BASE64) {
    const stored = await env.DB.prepare("SELECT ciphertext,iv FROM encrypted_secrets WHERE id='deepseek_api_key'").first<{ ciphertext:string; iv:string }>();
    if (stored) return (await decryptJson<{ key:string }>(stored.ciphertext, stored.iv, env.MASTER_ENCRYPTION_KEY_BASE64)).key;
  }
  return env.DEEPSEEK_API_KEY;
}
registerAi(app,readDeepSeekKey);
registerChat(app,readDeepSeekKey);
app.get('/api/settings/deepseek/status', async (c) => {
  const setting = await c.env.DB.prepare("SELECT value_json,updated_at FROM settings WHERE key='deepseek_status'").first<{ value_json:string; updated_at:string }>();
  const value = setting ? JSON.parse(setting.value_json) : {};
  return c.json({ ok:true, configured:Boolean(await readDeepSeekKey(c.env)), maskedKey:await readDeepSeekKey(c.env).then(key=>key?key.slice(0,4)+'********'+key.slice(-4):null), last4:value.last4 ?? null, lastTestAt:value.lastTestAt ?? null, model:await aiModel(c.env),models:AI_MODELS,effort:await aiEffort(c.env),dailyBudget:Number(c.env.AI_DAILY_CNY_LIMIT)||1,monthlyBudget:Number(c.env.AI_MONTHLY_CNY_LIMIT)||5 });
});
app.put('/api/settings/deepseek', zValidator('json', z.object({ apiKey:z.string().min(8).max(256).optional(), model:z.enum(AI_MODELS).optional(),effort:z.enum(['low','high','max']).optional() })), async (c) => {
  if (!c.env.MASTER_ENCRYPTION_KEY_BASE64) return jsonError(c,503,'encryption_not_configured','请先配置本地主加密密钥');
  const input=c.req.valid('json'),now=new Date().toISOString();
  if(input.effort)await c.env.DB.prepare("INSERT INTO settings(key,value_json,updated_at) VALUES('deepseek_effort',?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").bind(JSON.stringify(input.effort),now).run();
  if(input.model)await c.env.DB.prepare("INSERT INTO settings(key,value_json,updated_at) VALUES('deepseek_model',?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").bind(JSON.stringify(input.model),now).run();
  if(input.apiKey){const key=input.apiKey.trim(),encrypted=await encryptJson({key},c.env.MASTER_ENCRYPTION_KEY_BASE64);await c.env.DB.batch([c.env.DB.prepare("INSERT INTO encrypted_secrets(id,ciphertext,iv,updated_at) VALUES('deepseek_api_key',?,?,?) ON CONFLICT(id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,updated_at=excluded.updated_at").bind(encrypted.ciphertext,encrypted.iv,now),c.env.DB.prepare("INSERT INTO settings(key,value_json,updated_at) VALUES('deepseek_status',?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").bind(JSON.stringify({last4:key.slice(-4),lastTestAt:null}),now)]);}
  return c.json({ok:true,configured:!!await readDeepSeekKey(c.env),model:await aiModel(c.env)});
});
app.delete('/api/settings/deepseek', async (c) => { await c.env.DB.batch([c.env.DB.prepare("DELETE FROM encrypted_secrets WHERE id='deepseek_api_key'"),c.env.DB.prepare("DELETE FROM settings WHERE key='deepseek_status'")]); return c.json({ok:true}); });
app.post('/api/settings/deepseek/test', async (c) => {
  const key=await readDeepSeekKey(c.env); if(!key)return jsonError(c,503,'not_configured','尚未填写 DeepSeek API Key');
  const started=Date.now();
  try {
    const response=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:await aiModel(c.env),messages:[{role:'user',content:'只回复 OK'}],thinking:{type:'disabled'},max_tokens:16,stream:false}),signal:AbortSignal.timeout(15000)});
    if(!response.ok){ const safe=response.status===401?'API Key 无效':response.status===429?'请求过于频繁或额度不足':`DeepSeek 返回 HTTP ${response.status}`; return jsonError(c,502,'deepseek_rejected',safe); }
    const now=new Date().toISOString(); const old=await c.env.DB.prepare("SELECT value_json FROM settings WHERE key='deepseek_status'").first<{value_json:string}>(); const value=old?JSON.parse(old.value_json):{};
    await c.env.DB.prepare("INSERT INTO settings(key,value_json,updated_at) VALUES('deepseek_status',?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").bind(JSON.stringify({...value,lastTestAt:now}),now).run();
    return c.json({ok:true,model:await aiModel(c.env),latencyMs:Date.now()-started,testedAt:now});
  } catch { return jsonError(c,502,'deepseek_unreachable','DeepSeek 连接超时或网络不可达'); }
});

app.get('/api/backups/status', async (c) => c.json({ ok: true, configured: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET), runs: (await c.env.DB.prepare('SELECT id,kind,status,started_at,finished_at,bytes,sha256,safe_error_detail FROM backup_runs ORDER BY started_at DESC LIMIT 20').all()).results }));
app.get('/api/backups/oauth/start', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID) return jsonError(c, 503, 'not_configured', '尚未配置 Google OAuth 客户端');
  const state = crypto.randomUUID();
  const redirect = new URL('/api/backups/oauth/callback', c.req.url).toString();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id:c.env.GOOGLE_CLIENT_ID, redirect_uri:redirect, response_type:'code', scope:'https://www.googleapis.com/auth/drive.file', access_type:'offline', prompt:'consent', state }).toString();
  return c.json({ ok:true, url:url.toString(), state });
});
app.get('/api/backups/oauth/callback', async (c) => jsonError(c, 501, 'oauth_exchange_pending', '部署域名和加密主密钥确认后才能安全交换并保存刷新令牌'));
app.post('/api/backups/run', async (c) => {
  const settings = await c.env.DB.prepare("SELECT value_json FROM settings WHERE key='google_drive'").first<{ value_json: string }>();
  if (!settings) return jsonError(c, 503, 'not_configured', '请先连接 Google Drive 并选择目标目录');
  const manifest = await buildManifest('incremental', [{ path: 'settings.json', body: '{}' }], new Date().toISOString());
  return c.json({ ok: true, staged: true, manifest });
});
app.post('/api/backups/verify', async (c) => c.json({ ok: true, status: 'preflight_ready', note: '真实校验将在 OAuth 授权后读取 Drive 元数据并核对 SHA-256 manifest' }));
app.post('/api/backups/restore/preflight', async (c) => c.json({ ok: true, status: 'requires_manifest', destructive: false }));

async function collect(env: Bindings, trigger: string) {
  env={...env,DB:await accountDatabase(env.DB)};
  const id = crypto.randomUUID(); const started = new Date().toISOString();
  const source = new BilibiliWebDataSource();
  const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const claimed = await env.DB.prepare("INSERT INTO acquisition_runs(id,started_at,status,source_version,coverage,retries) SELECT ?,?,'running',?,0,0 WHERE NOT EXISTS (SELECT 1 FROM acquisition_runs WHERE status='running' AND started_at>?)").bind(id, started, source.version, cutoff).run();
  if (!claimed.meta.changes) return { status: 'skipped', reason: 'already_running' };
  try {
    if (!env.MASTER_ENCRYPTION_KEY_BASE64) throw new Error('ENCRYPTION_KEY_MISSING');
    const sessionId=(env.DB as any).accountUid?'bilibili_session_'+(env.DB as any).accountUid:'bilibili_session';
    const stored = await env.DB.prepare('SELECT ciphertext,iv FROM encrypted_secrets WHERE id=?').bind(sessionId).first<{ ciphertext: string; iv: string }>();
    if (!stored) throw new Error('SESSION_MISSING');
    const { session } = await decryptJson<{ session: string }>(stored.ciphertext, stored.iv, env.MASTER_ENCRYPTION_KEY_BASE64);
    const result = await source.collect(session);
    const dbStarted = performance.now();
    const statements: D1PreparedStatement[] = [];
    for (let index = 0; index < result.videos.length; index += 1) {
      const video = result.videos[index]; const snapshot = result.snapshots[index];
      statements.push(env.DB.prepare(`INSERT INTO videos(id,bvid,title,cover_url,duration_seconds,published_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET bvid=excluded.bvid,title=excluded.title,cover_url=excluded.cover_url,duration_seconds=excluded.duration_seconds,published_at=excluded.published_at`).bind(video.id, video.bvid, video.title, video.coverUrl, video.durationSeconds, video.publishedAt));
      statements.push(env.DB.prepare(`INSERT OR IGNORE INTO video_snapshots(video_id,captured_at,source,views,impressions,cover_ctr,avg_watch_seconds,avg_watch_percent,followers_gained,metrics_json,dimensions_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(snapshot.videoId, snapshot.capturedAt, source.version, snapshot.views, snapshot.impressions, snapshot.coverCtr, snapshot.avgWatchSeconds, snapshot.avgWatchPercent, snapshot.followersGained, JSON.stringify(snapshot.metrics), JSON.stringify(snapshot.dimensions)));
    }
    if (statements.length) await env.DB.batch(statements);
    const history = historyStatements(env.DB,result);
    for (let offset=0;offset<history.length;offset+=80) await env.DB.batch(history.slice(offset,offset+80));
    const dbMs = Math.round(performance.now() - dbStarted);
    const storageStarted = performance.now();
    if (env.BUCKET) await env.BUCKET.put(`raw/${started.slice(0, 10)}/${id}.json`, JSON.stringify(result.raw), { httpMetadata: { contentType: 'application/json' } });
    const storageMs = Math.round(performance.now() - storageStarted);
    const capabilitiesComplete = Object.values(result.coverageDetails.capabilityCounts).every((capability) => capability.available === capability.total);
    const status = result.coverage === 1 && result.coverageDetails.missingByVideo.length === 0 && result.coverageDetails.warnings.length === 0 && capabilitiesComplete ? 'success' : 'partial';
    const timings = { ...result.timings, dbMs, storageMs, totalMs: Date.now() - Date.parse(started) };
    await env.DB.prepare('UPDATE acquisition_runs SET finished_at=?,status=?,coverage=?,coverage_json=?,timings_json=?,request_count=? WHERE id=?').bind(new Date().toISOString(), status, result.coverage, JSON.stringify(result.coverageDetails), JSON.stringify(timings), result.requestCount, id).run();
    return { id, status, coverage: result.coverage, details: result.coverageDetails, videos: result.videos.length, trigger, timings, requestCount: result.requestCount };
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}${error.cause ? ` | cause: ${String(error.cause)}` : ''}` : String(error || 'UNKNOWN');
    const errorCode = /SESSION|API_-101|API_-111|HTTP_401/.test(detail) ? 'session_expired' : /API_(-352|-412)|HTTP_(403|412|429)/.test(detail) ? 'risk_control' : /INVENTORY_INCOMPLETE/.test(detail) ? 'inventory_incomplete' : error instanceof z.ZodError ? 'schema_changed' : 'network';
    await env.DB.prepare('UPDATE acquisition_runs SET finished_at=?,status=\'failed\',error_code=?,safe_error_detail=? WHERE id=?').bind(new Date().toISOString(), errorCode, detail.slice(0, 160), id).run();
    return { id, status: 'failed', errorCode };
  }
}
app.post('/api/bilibili/collect-now', async (c) => c.json({ ok: true, run: await collect(c.env, 'manual') }));
app.post('/internal/collect', async (c) => {
  if (!c.env.INTERNAL_COLLECT_SECRET) return jsonError(c, 503, 'not_configured', '采集签名密钥未配置');
  const timestamp = c.req.header('x-timestamp') ?? ''; const signature = c.req.header('x-signature') ?? '';
  if (Math.abs(Date.now() - Number(timestamp)) > 300000 || signature !== await hmac(timestamp, c.env.INTERNAL_COLLECT_SECRET)) return jsonError(c, 401, 'invalid_signature', '签名无效');
  return c.json({ ok: true, run: await collect(c.env, 'proxy') });
});

app.notFound(async (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  async fetch(request:Request,env:Bindings,ctx:ExecutionContext){return app.fetch(request,{...env,DB:await accountDatabase(env.DB)},ctx);},
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    if (event.cron === '*/15 * * * *') ctx.waitUntil(collect(env, 'cron'));
    // Backup/retention cron routes are deliberately no-ops until OAuth is configured and verified.
  }
};
