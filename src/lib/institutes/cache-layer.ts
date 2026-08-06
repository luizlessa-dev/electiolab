/**
 * Cache Layer for Scraping
 *
 * Production: Vercel KV (distributed cache)
 * Development: In-memory cache
 *
 * 24-hour TTL with automatic expiration
 */

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
}

export class CacheLayer {
  private memoryCache = new Map<string, { data: any; expires: number }>();
  private stats = { hits: 0, misses: 0, totalTime: 0, requests: 0 };
  private ttlMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    // Try memory cache first
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      this.stats.hits++;
      this.stats.totalTime += Date.now() - startTime;
      this.stats.requests++;
      return cached.data as T;
    }

    // Cache miss or expired
    this.stats.misses++;
    this.stats.totalTime += Date.now() - startTime;
    this.stats.requests++;

    // Try Vercel KV if available
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        const value = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
          headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        }).then(r => r.json());

        if (value) {
          // Cache in memory too
          this.memoryCache.set(key, { data: value, expires: Date.now() + this.ttlMs });
          this.stats.hits++;
          return value as T;
        }
      } catch (e) {
        console.warn('[Cache] KV error:', e);
      }
    }

    return null;
  }

  /**
   * Set in cache
   */
  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    const ttl = ttlSec ? ttlSec * 1000 : this.ttlMs;
    const expires = Date.now() + ttl;

    // Memory cache
    this.memoryCache.set(key, { data: value, expires });

    // Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
          body: JSON.stringify({ value, ex: ttlSec || 86400 }),
        });
      } catch (e) {
        console.warn('[Cache] KV write error:', e);
      }
    }
  }

  /**
   * Clear cache entry
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        await fetch(`${process.env.KV_REST_API_URL}/del/${key}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        });
      } catch (e) {
        console.warn('[Cache] KV delete error:', e);
      }
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.requests ? this.stats.hits / this.stats.requests : 0,
      avgResponseTime: this.stats.requests ? this.stats.totalTime / this.stats.requests : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, totalTime: 0, requests: 0 };
  }
}

// Singleton instance
export const cache = new CacheLayer();

// Periodic cleanup (every 1 hour)
if (typeof window === 'undefined') {
  setInterval(() => cache.cleanup(), 60 * 60 * 1000);
}
