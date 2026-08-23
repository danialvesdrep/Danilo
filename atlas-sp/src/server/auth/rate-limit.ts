import "server-only";

/**
 * Limitador de taxa em memória com janela deslizante.
 *
 * Suficiente para uma instância; com REDIS_URL configurado, a mesma interface
 * passa a usar Redis (ver `createLimiter`). Protege login, cadastro, busca e
 * as rotas de IA, que são as mais caras.
 */

type Bucket = { hits: number[]; blockedUntil?: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 20_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  { limit, windowSeconds, blockSeconds = 0 }: { limit: number; windowSeconds: number; blockSeconds?: number },
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Poda simples para evitar crescimento indefinido do mapa.
  if (buckets.size > MAX_KEYS) {
    for (const [bucketKey, bucket] of buckets) {
      if (!bucket.hits.length || now - bucket.hits[bucket.hits.length - 1] > windowMs * 4) {
        buckets.delete(bucketKey);
      }
      if (buckets.size <= MAX_KEYS / 2) break;
    }
  }

  const bucket = buckets.get(key) ?? { hits: [] };
  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  bucket.hits = bucket.hits.filter((timestamp) => now - timestamp < windowMs);
  if (bucket.hits.length >= limit) {
    if (blockSeconds > 0) bucket.blockedUntil = now + blockSeconds * 1000;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: blockSeconds > 0 ? blockSeconds : Math.ceil((windowMs - (now - bucket.hits[0])) / 1000),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

export const LIMITS = {
  login: { limit: 8, windowSeconds: 300, blockSeconds: 300 },
  register: { limit: 5, windowSeconds: 3600 },
  passwordReset: { limit: 5, windowSeconds: 3600 },
  search: { limit: 90, windowSeconds: 60 },
  ai: { limit: 20, windowSeconds: 300 },
  api: { limit: 240, windowSeconds: 60 },
  write: { limit: 60, windowSeconds: 60 },
} as const;

/** Identificador estável da origem da requisição. */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded ?? request.headers.get("x-real-ip") ?? "desconhecido";
  return `${scope}:${ip}`;
}
