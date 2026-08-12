import { z } from 'zod';
import type { VideoSnapshot } from '../shared/contracts';

export type CollectResult = { snapshots: VideoSnapshot[]; coverage: number; sourceVersion: string; raw: unknown };
export interface BilibiliDataSource {
  readonly version: string;
  startQrLogin(): Promise<{ url: string; key: string }>;
  pollQrLogin(key: string): Promise<{ state: 'waiting' | 'scanned' | 'confirmed' | 'expired'; session?: string }>;
  collect(session: string): Promise<CollectResult>;
}

const qrStartSchema = z.object({ code: z.number(), data: z.object({ url: z.string().url(), qrcode_key: z.string() }) });
const qrPollSchema = z.object({ code: z.number(), data: z.object({ code: z.number(), url: z.string().optional() }) });

export class BilibiliWebDataSource implements BilibiliDataSource {
  readonly version = 'web-data-v1';
  async startQrLogin() {
    const response = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate');
    const parsed = qrStartSchema.parse(await response.json());
    return { url: parsed.data.url, key: parsed.data.qrcode_key };
  }
  async pollQrLogin(key: string) {
    const response = await fetch(`https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${encodeURIComponent(key)}`, { redirect: 'manual' });
    const parsed = qrPollSchema.parse(await response.json());
    const state = parsed.data.code === 0 ? 'confirmed' : parsed.data.code === 86090 ? 'scanned' : parsed.data.code === 86101 ? 'waiting' : 'expired';
    // Cloud runtimes do not expose Set-Cookie reliably through CORS; the Worker route captures it server-side.
    const session = state === 'confirmed' ? response.headers.get('set-cookie') ?? undefined : undefined;
    return { state, session } as const;
  }
  async collect(_session: string): Promise<CollectResult> {
    // Endpoint payloads change frequently. The first production probe records redacted schemas before adapters are enabled.
    throw new Error('BILIBILI_PROBE_REQUIRED');
  }
}

