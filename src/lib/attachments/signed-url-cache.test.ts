import { describe, it, expect, vi } from "vitest";
import { createSignedUrlCache } from "./signed-url-cache";

function makeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("createSignedUrlCache", () => {
  it("dedupes concurrent requests for the same key", async () => {
    const fetcher = vi.fn(async (k: string) => `url:${k}:${Math.random()}`);
    const cache = createSignedUrlCache(fetcher, { ttlMs: 10_000, max: 10 });
    const [a, b, c] = await Promise.all([cache.get("x"), cache.get("x"), cache.get("x")]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("returns cached value within TTL and refetches after expiration", async () => {
    const clock = makeClock();
    let counter = 0;
    const fetcher = vi.fn(async () => `url-${++counter}`);
    const cache = createSignedUrlCache(fetcher, {
      ttlMs: 1_000,
      max: 10,
      refreshMarginMs: 0,
      now: clock.now,
    });

    expect(await cache.get("k")).toBe("url-1");
    clock.advance(500);
    expect(await cache.get("k")).toBe("url-1"); // still fresh
    expect(fetcher).toHaveBeenCalledTimes(1);

    clock.advance(600); // past TTL
    expect(await cache.get("k")).toBe("url-2");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("honors refreshMarginMs, treating near-expired entries as stale", async () => {
    const clock = makeClock();
    let counter = 0;
    const fetcher = vi.fn(async () => `url-${++counter}`);
    const cache = createSignedUrlCache(fetcher, {
      ttlMs: 1_000,
      max: 10,
      refreshMarginMs: 300,
      now: clock.now,
    });

    expect(await cache.get("k")).toBe("url-1");
    clock.advance(700); // within TTL but inside refresh margin (300ms left)
    expect(await cache.get("k")).toBe("url-2");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("evicts the least-recently-used entry when max size is exceeded", async () => {
    const fetcher = vi.fn(async (k: string) => `url:${k}`);
    const cache = createSignedUrlCache(fetcher, { ttlMs: 10_000, max: 3 });

    await cache.get("a");
    await cache.get("b");
    await cache.get("c");
    // Touch "a" so "b" becomes LRU.
    await cache.get("a");
    await cache.get("d"); // evicts "b"

    expect(cache.size()).toBe(3);
    expect(cache._peek("b")).toBeUndefined();
    expect(cache._peek("a")).toBeDefined();
    expect(cache._peek("c")).toBeDefined();
    expect(cache._peek("d")).toBeDefined();
  });

  it("moves entries to most-recently-used on hit", async () => {
    const fetcher = vi.fn(async (k: string) => `url:${k}`);
    const cache = createSignedUrlCache(fetcher, { ttlMs: 10_000, max: 2 });

    await cache.get("a");
    await cache.get("b");
    await cache.get("a"); // promote "a"
    await cache.get("c"); // must evict "b", not "a"

    expect(cache._peek("a")).toBeDefined();
    expect(cache._peek("b")).toBeUndefined();
    expect(cache._peek("c")).toBeDefined();
  });

  it("sweep() drops expired entries", async () => {
    const clock = makeClock();
    const fetcher = vi.fn(async (k: string) => `url:${k}`);
    const cache = createSignedUrlCache(fetcher, {
      ttlMs: 1_000,
      max: 10,
      now: clock.now,
    });

    await cache.get("a");
    await cache.get("b");
    expect(cache.size()).toBe(2);

    clock.advance(1_500);
    cache.sweep();
    expect(cache.size()).toBe(0);
  });

  it("invalidate(prefix) removes matching keys only", async () => {
    const fetcher = vi.fn(async (k: string) => `url:${k}`);
    const cache = createSignedUrlCache(fetcher, { ttlMs: 10_000, max: 10 });

    await cache.get("path/1::file.png");
    await cache.get("path/1::other.pdf");
    await cache.get("path/2::keep.jpg");

    cache.invalidate("path/1");
    expect(cache._peek("path/1::file.png")).toBeUndefined();
    expect(cache._peek("path/1::other.pdf")).toBeUndefined();
    expect(cache._peek("path/2::keep.jpg")).toBeDefined();
  });

  it("propagates fetcher errors without caching them", async () => {
    let attempts = 0;
    const fetcher = vi.fn(async () => {
      attempts++;
      if (attempts === 1) throw new Error("boom");
      return "ok";
    });
    const cache = createSignedUrlCache(fetcher, { ttlMs: 10_000, max: 10 });

    await expect(cache.get("k")).rejects.toThrow("boom");
    expect(await cache.get("k")).toBe("ok");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
