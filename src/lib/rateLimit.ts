/**
 * Rate-limit in-memory por chave (IP, email, etc).
 * Suficiente pra MVP: bloqueia spam óbvio em /api/public/*.
 * Quando escalar (multi-instance), trocar pra Redis/Upstash.
 */

type Bucket = { hits: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Limpeza preguiçosa (1 a cada 100 inserções)
let inserts = 0;
function gc() {
  if (++inserts < 100) return;
  inserts = 0;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export type RateLimitOptions = {
  /** Identificador único da chave (geralmente "rota:ip"). */
  key: string;
  /** Máximo de requests permitidas no intervalo. */
  max: number;
  /** Janela em ms. */
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec?: number;
  remaining: number;
};

export function checkRateLimit({ key, max, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    gc();
    return { ok: true, remaining: max - 1 };
  }

  if (bucket.hits >= max) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  bucket.hits++;
  return { ok: true, remaining: max - bucket.hits };
}

/**
 * Helper para extrair IP do cliente respeitando proxies (Vercel, Cloudflare, etc).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
