// src/lib/base64url.ts
export function base64UrlEncodeUtf8(input: any): string {
  const json = typeof input === 'string' ? input : JSON.stringify(input);

  // Node (server)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasBuffer = typeof (globalThis as any).Buffer !== 'undefined';
  if (hasBuffer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b64 = (globalThis as any).Buffer.from(json, 'utf8').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  // Browser (client)
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlDecodeUtf8<T = any>(b64url: string): T {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  const b64p = b64 + pad;

  // Node (server)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasBuffer = typeof (globalThis as any).Buffer !== 'undefined';
  if (hasBuffer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txt = (globalThis as any).Buffer.from(b64p, 'base64').toString('utf8');
    return JSON.parse(txt) as T;
  }

  // Browser (client)
  const txt = decodeURIComponent(escape(atob(b64p)));
  return JSON.parse(txt) as T;
}
