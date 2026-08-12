export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
const toBase64 = (value: ArrayBuffer | Uint8Array) => {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return btoa(String.fromCharCode(...bytes));
};

export async function encryptJson(value: unknown, keyBase64: string) {
  const key = await crypto.subtle.importKey('raw', fromBase64(keyBase64), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { ciphertext: toBase64(ciphertext), iv: toBase64(iv), algorithm: 'AES-GCM' as const };
}

export async function decryptJson<T>(ciphertext: string, iv: string, keyBase64: string): Promise<T> {
  const key = await crypto.subtle.importKey('raw', fromBase64(keyBase64), 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

