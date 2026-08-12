import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { analysisQuerySchema } from '../shared/contracts';
import { BilibiliWebDataSource } from './bilibili';
import { buildManifest } from './backup';
import { encryptJson, hmac, sha256 } from './crypto';

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

app.get('/api/devices', async (c) => c.json({ ok: true, devices: (await c.env.DB.prepare('SELECT id,label,created_at,last_seen_at,expires_at FROM devices WHERE revoked_at IS NULL ORDER BY last_seen_at DESC').all()).results }));
app.delete('/api/devices/:id', async (c) => { await c.env.DB.prepare('UPDATE devices SET revoked_at=? WHERE id=?').bind(new Date().toISOString(), c.req.param('id')).run(); return c.json({ ok: true }); });
app.post('/api/auth/logout', async (c) => { c.header('Set-Cookie', 'insights_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'); return c.json({ ok: true }); });

app.post('/api/bilibili/qr/start', async (c) => {
  const source = new BilibiliWebDataSource();
  try { return c.json({ ok: true, ...(await source.startQrLogin()) }); } catch { return jsonError(c, 502, 'bilibili_unavailable', '暂时无法生成 B 站二维码'); }
});
app.get('/api/bilibili/qr/status/:key', async (c) => {
  const source = new BilibiliWebDataSource();
  try {
    const result = await source.pollQrLogin(c.req.param('key'));
    if (result.session && c.env.MASTER_ENCRYPTION_KEY_BASE64) {
      const encrypted = await encryptJson({ session: result.session }, c.env.MASTER_ENCRYPTION_KEY_BASE64);
      await c.env.DB.prepare("INSERT INTO encrypted_secrets(id,ciphertext,iv,updated_at) VALUES('bilibili_session',?,?,?) ON CONFLICT(id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,updated_at=excluded.updated_at").bind(encrypted.ciphertext, encrypted.iv, new Date().toISOString()).run();
    }
    return c.json({ ok: true, state: result.state });
  } catch { return jsonError(c, 502, 'bilibili_unavailable', '二维码状态查询失败'); }
});

app.get('/api/dashboard/summary', async (c) => {
  const rows = await c.env.DB.prepare('SELECT COUNT(DISTINCT video_id) videos, MAX(captured_at) fresh, SUM(views) views, SUM(followers_gained) followers FROM video_snapshots WHERE captured_at=(SELECT MAX(captured_at) FROM video_snapshots)').first();
  return c.json({ ok: true, configured: Boolean(rows?.fresh), summary: rows ?? {}, freshnessMinutes: rows?.fresh ? Math.floor((Date.now() - Date.parse(String(rows.fresh))) / 60000) : null });
});
app.get('/api/videos', async (c) => c.json({ ok: true, videos: (await c.env.DB.prepare('SELECT v.*,s.views,s.cover_ctr,s.avg_watch_percent,s.followers_gained,s.captured_at FROM videos v LEFT JOIN video_snapshots s ON s.id=(SELECT id FROM video_snapshots WHERE video_id=v.id ORDER BY captured_at DESC LIMIT 1) ORDER BY v.published_at DESC').all()).results }));
app.get('/api/videos/:id/timeseries', async (c) => c.json({ ok: true, points: (await c.env.DB.prepare('SELECT captured_at,views,cover_ctr,avg_watch_percent,followers_gained,metrics_json FROM video_snapshots WHERE video_id=? ORDER BY captured_at').bind(c.req.param('id')).all()).results }));
app.post('/api/lab/query', zValidator('json', analysisQuerySchema), async (c) => c.json({ ok: true, query: c.req.valid('json'), rows: [] }));
app.post('/api/bilibili/qr/disconnect', async (c) => { await c.env.DB.prepare("DELETE FROM encrypted_secrets WHERE id='bilibili_session'").run(); return c.json({ ok: true }); });

app.post('/api/imports/preview', async (c) => {
  const body = await c.req.arrayBuffer();
  if (body.byteLength > 20 * 1024 * 1024) return jsonError(c, 413, 'file_too_large', '导入文件不得超过 20MB');
  const text = new TextDecoder().decode(body.slice(0, 100000));
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  return c.json({ ok: true, sha256: await sha256(body), detectedColumns: firstLine.split(/[\t,]/).map((v) => v.trim()).filter(Boolean), bytes: body.byteLength });
});
app.post('/api/imports/commit', async (c) => jsonError(c, 409, 'preview_required', '必须先完成字段映射预检；当前版本不会盲目写入未知表格'));

app.post('/api/ai/insights', async (c) => {
  if (!c.env.DEEPSEEK_API_KEY) return jsonError(c, 503, 'not_configured', '尚未配置 DeepSeek API 密钥');
  const payload = await c.req.json<Record<string, unknown>>(); const snapshotKey = await sha256(JSON.stringify(payload));
  const cached = await c.env.DB.prepare('SELECT response_json FROM ai_cache WHERE snapshot_key=?').bind(snapshotKey).first<{ response_json: string }>();
  if (cached) return c.json({ ok: true, cached: true, insight: JSON.parse(cached.response_json) });
  return jsonError(c, 501, 'probe_required', '需要先完成数据快照与费用计量探针，AI 不会在未校验前发送数据');
});
app.post('/api/ai/chat', async (c) => {
  if (!c.env.DEEPSEEK_API_KEY) return jsonError(c, 503, 'not_configured', '尚未配置 DeepSeek API 密钥');
  return jsonError(c, 501, 'snapshot_required', '请先连接真实数据快照；聊天不会发送演示数据');
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
  const id = crypto.randomUUID(); const started = new Date().toISOString();
  await env.DB.prepare("INSERT INTO acquisition_runs(id,started_at,status,source_version,coverage,retries) VALUES(?,?,'running','web-data-v1',0,0)").bind(id, started).run();
  await env.DB.prepare("UPDATE acquisition_runs SET finished_at=?,status='failed',error_code='session_expired',safe_error_detail=? WHERE id=?").bind(new Date().toISOString(), `No production session for ${trigger}`, id).run();
  return { id, status: 'failed', errorCode: 'session_expired' };
}
app.post('/internal/collect', async (c) => {
  if (!c.env.INTERNAL_COLLECT_SECRET) return jsonError(c, 503, 'not_configured', '采集签名密钥未配置');
  const timestamp = c.req.header('x-timestamp') ?? ''; const signature = c.req.header('x-signature') ?? '';
  if (Math.abs(Date.now() - Number(timestamp)) > 300000 || signature !== await hmac(timestamp, c.env.INTERNAL_COLLECT_SECRET)) return jsonError(c, 401, 'invalid_signature', '签名无效');
  return c.json({ ok: true, run: await collect(c.env, 'proxy') });
});

app.notFound(async (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    if (event.cron === '*/15 * * * *') ctx.waitUntil(collect(env, 'cron'));
    // Backup/retention cron routes are deliberately no-ops until OAuth is configured and verified.
  }
};
