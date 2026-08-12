import { backupManifestSchema, type BackupManifest } from '../shared/contracts';
import { sha256 } from './crypto';

export async function buildManifest(kind: 'incremental' | 'full', payloads: Array<{ path: string; body: string }>, cursor: string): Promise<BackupManifest> {
  const now = new Date().toISOString();
  const files = await Promise.all(payloads.map(async ({ path, body }) => ({ path, bytes: new TextEncoder().encode(body).byteLength, sha256: await sha256(body) })));
  return backupManifestSchema.parse({ version: 1, kind, createdAt: now, from: now, to: now, cursor, recordCount: payloads.length, files });
}

export async function uploadDriveFile(accessToken: string, folderId: string, name: string, body: string, mimeType = 'application/json') {
  const boundary = `insights-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name, parents: [folderId], appProperties: { source: 'bilibili-creator-insights' } });
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${body}\r\n--${boundary}--`;
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,md5Checksum', {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart
  });
  if (!response.ok) throw new Error(`DRIVE_UPLOAD_${response.status}`);
  return response.json<{ id: string; name: string; size?: string; md5Checksum?: string }>();
}

