// Cache LRU com TTL para URLs assinadas de anexos.
// Factory testável — CommentsPanel importa instâncias já configuradas.

export type CachedUrl = { url: string; expiresAt: number };

export interface SignedUrlCacheOptions {
  ttlMs: number;
  max: number;
  refreshMarginMs?: number;
  now?: () => number;
}

export interface SignedUrlCache {
  get(key: string): Promise<string>;
  invalidate(prefix?: string): void;
  sweep(): void;
  size(): number;
  /** internal — for tests */
  _peek(key: string): CachedUrl | undefined;
}

export function createSignedUrlCache(
  fetcher: (key: string) => Promise<string>,
  options: SignedUrlCacheOptions,
): SignedUrlCache {
  const { ttlMs, max, refreshMarginMs = 0, now = Date.now } = options;
  const cache = new Map<string, CachedUrl>();
  const inflight = new Map<string, Promise<string>>();

  const hit = (key: string): string | null => {
    const entry = cache.get(key);
    if (entry && entry.expiresAt - refreshMarginMs > now()) {
      cache.delete(key);
      cache.set(key, entry);
      return entry.url;
    }
    if (entry) cache.delete(key);
    return null;
  };

  const put = (key: string, url: string) => {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, { url, expiresAt: now() + ttlMs });
    while (cache.size > max) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  };

  return {
    async get(key) {
      const cached = hit(key);
      if (cached) return cached;
      const existing = inflight.get(key);
      if (existing) return existing;
      const p = fetcher(key)
        .then((url) => {
          put(key, url);
          return url;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, p);
      return p;
    },
    invalidate(prefix) {
      if (!prefix) {
        cache.clear();
        return;
      }
      for (const k of Array.from(cache.keys())) {
        if (k === prefix || k.startsWith(`${prefix}::`)) cache.delete(k);
      }
    },
    sweep() {
      const t = now();
      for (const [k, v] of cache) {
        if (v.expiresAt - refreshMarginMs <= t) cache.delete(k);
      }
    },
    size() {
      return cache.size;
    },
    _peek(key) {
      return cache.get(key);
    },
  };
}
