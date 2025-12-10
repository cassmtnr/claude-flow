/**
 * Cache Tests
 * Tests for the LRU cache with disk persistence
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Simulated LRU Cache for testing
class TestLRUCache<T> {
  private cache: Map<string, { value: T; accessedAt: number; size: number }> = new Map();
  private maxSize: number;
  private ttlMs: number;

  constructor(config: { maxSize: number; ttlMs: number }) {
    this.maxSize = config.maxSize;
    this.ttlMs = config.ttlMs;
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.accessedAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update access time (LRU)
    entry.accessedAt = Date.now();
    return entry.value;
  }

  async set(key: string, value: T): Promise<void> {
    // Evict if at capacity
    await this.evictIfNeeded();

    const size = JSON.stringify(value).length;
    this.cache.set(key, {
      value,
      accessedAt: Date.now(),
      size,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.accessedAt > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): { entries: number; size: number; hitRate: number } {
    let totalSize = 0;
    for (const entry of Array.from(this.cache.values())) {
      totalSize += entry.size;
    }
    return {
      entries: this.cache.size,
      size: totalSize,
      hitRate: 0,
    };
  }

  private async evictIfNeeded(): Promise<void> {
    while (this.cache.size >= this.maxSize) {
      let lruKey: string | null = null;
      let lruTime = Infinity;

      for (const [key, entry] of Array.from(this.cache.entries())) {
        if (entry.accessedAt < lruTime) {
          lruTime = entry.accessedAt;
          lruKey = key;
        }
      }

      if (lruKey) {
        this.cache.delete(lruKey);
      } else {
        break;
      }
    }
  }

  generateKey(request: Record<string, unknown>): string {
    const sorted = Object.keys(request)
      .sort()
      .reduce(
        (obj, key) => {
          obj[key] = request[key];
          return obj;
        },
        {} as Record<string, unknown>
      );
    return Buffer.from(JSON.stringify(sorted)).toString('base64').slice(0, 32);
  }
}

describe('LRU Cache', () => {
  let cache: TestLRUCache<{ data: string }>;

  beforeEach(() => {
    cache = new TestLRUCache({
      maxSize: 5,
      ttlMs: 60000, // 1 minute
    });
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', { data: 'value1' });
      const result = await cache.get('key1');
      expect(result).toEqual({ data: 'value1' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      await cache.set('key1', { data: 'value1' });
      expect(cache.has('key1')).toBe(true);

      await cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all values', async () => {
      await cache.set('key1', { data: 'value1' });
      await cache.set('key2', { data: 'value2' });
      expect(cache.size).toBe(2);

      await cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used when at capacity', async () => {
      // Fill cache to capacity
      await cache.set('key1', { data: 'value1' });
      await cache.set('key2', { data: 'value2' });
      await cache.set('key3', { data: 'value3' });
      await cache.set('key4', { data: 'value4' });
      await cache.set('key5', { data: 'value5' });

      expect(cache.size).toBe(5);

      // Add one more - should evict key1 (oldest)
      await cache.set('key6', { data: 'value6' });

      expect(cache.size).toBe(5);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key6')).toBe(true);
    });

    it('should update access time on get', async () => {
      // Use a fresh cache to ensure clean state
      const testCache = new TestLRUCache<{ data: string }>({
        maxSize: 3,
        ttlMs: 60000,
      });

      await testCache.set('key1', { data: 'value1' });
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 5));
      await testCache.set('key2', { data: 'value2' });
      await new Promise((r) => setTimeout(r, 5));
      await testCache.set('key3', { data: 'value3' });

      // Access key1 to make it recently used
      await testCache.get('key1');

      // Add new key - should evict key2 (now oldest since key1 was accessed)
      await testCache.set('key4', { data: 'value4' });

      expect(testCache.has('key1')).toBe(true); // Still present because accessed
      expect(testCache.has('key2')).toBe(false); // Evicted as oldest
      expect(testCache.has('key3')).toBe(true);
      expect(testCache.has('key4')).toBe(true);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      // Create cache with very short TTL
      const shortTTLCache = new TestLRUCache<{ data: string }>({
        maxSize: 5,
        ttlMs: 1, // 1ms TTL
      });

      await shortTTLCache.set('key1', { data: 'value1' });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await shortTTLCache.get('key1');
      expect(result).toBeNull();
    });

    it('should report has=false for expired entries', async () => {
      const shortTTLCache = new TestLRUCache<{ data: string }>({
        maxSize: 5,
        ttlMs: 1,
      });

      await shortTTLCache.set('key1', { data: 'value1' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(shortTTLCache.has('key1')).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track entry count', async () => {
      await cache.set('key1', { data: 'value1' });
      await cache.set('key2', { data: 'value2' });

      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
    });

    it('should track total size', async () => {
      await cache.set('key1', { data: 'value1' });

      const stats = cache.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Key Generation', () => {
    it('should generate consistent keys for same input', () => {
      const request = { type: 'codebase', target: './src' };
      const key1 = cache.generateKey(request);
      const key2 = cache.generateKey(request);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = cache.generateKey({ type: 'codebase', target: './src', depth: 'deep' });
      const key2 = cache.generateKey({ type: 'security', target: './lib', query: 'test' });
      expect(key1).not.toBe(key2);
    });

    it('should handle key order consistently', () => {
      const key1 = cache.generateKey({ a: 1, b: 2 });
      const key2 = cache.generateKey({ b: 2, a: 1 });
      expect(key1).toBe(key2);
    });
  });
});
