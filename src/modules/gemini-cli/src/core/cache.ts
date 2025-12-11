/**
 * Gemini CLI Module - Cache Manager
 * LRU cache with file persistence
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { CacheConfig, AnalysisResult } from './types.js';

interface CacheEntry {
  key: string;
  value: AnalysisResult;
  createdAt: number;
  accessedAt: number;
  size: number;
}

export class GeminiCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private initialized: boolean = false;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Initialize cache directory
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled || this.initialized) return;

    try {
      await fs.mkdir(this.config.directory, { recursive: true });
      await this.loadFromDisk();
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize cache:', error);
    }
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(params: Record<string, unknown>): string {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Get cached result
   */
  async get(key: string): Promise<AnalysisResult | null> {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > this.config.ttl) {
      this.cache.delete(key);
      await this.removeFromDisk(key);
      return null;
    }

    // Update access time (LRU)
    entry.accessedAt = Date.now();
    return entry.value;
  }

  /**
   * Set cached result
   */
  async set(key: string, value: AnalysisResult): Promise<void> {
    if (!this.config.enabled) return;

    const size = JSON.stringify(value).length;

    // Evict if necessary
    await this.evictIfNeeded();

    const entry: CacheEntry = {
      key,
      value,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      size,
    };

    this.cache.set(key, entry);
    await this.saveToDisk(key, entry);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern?: { target?: string; type?: string }): Promise<number> {
    let invalidated = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      let shouldInvalidate = !pattern;

      if (pattern) {
        const value = entry.value;
        if (pattern.target && value.requestId?.includes(pattern.target)) {
          shouldInvalidate = true;
        }
        if (pattern.type && value.findings?.some(f => f.type === pattern.type)) {
          shouldInvalidate = true;
        }
      }

      if (shouldInvalidate) {
        this.cache.delete(key);
        await this.removeFromDisk(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();

    try {
      const files = await fs.readdir(this.config.directory);
      await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(f => fs.unlink(path.join(this.config.directory, f)))
      );
    } catch {
      // Ignore errors during clear
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { entries: number; size: number; hitRate: number } {
    let totalSize = 0;
    for (const entry of Array.from(this.cache.values())) {
      totalSize += entry.size;
    }

    return {
      entries: this.cache.size,
      size: totalSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }

  /**
   * Evict least recently used entries if needed
   */
  private async evictIfNeeded(): Promise<void> {
    while (this.cache.size >= this.config.maxSize) {
      // Find LRU entry
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
        await this.removeFromDisk(lruKey);
      } else {
        break;
      }
    }
  }

  /**
   * Save entry to disk
   */
  private async saveToDisk(key: string, entry: CacheEntry): Promise<void> {
    try {
      const filePath = path.join(this.config.directory, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
    } catch (error) {
      console.warn(`Failed to save cache entry ${key}:`, error);
    }
  }

  /**
   * Remove entry from disk
   */
  private async removeFromDisk(key: string): Promise<void> {
    try {
      const filePath = path.join(this.config.directory, `${key}.json`);
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Load cache from disk on startup
   */
  private async loadFromDisk(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.directory);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.config.directory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(content);

          // Check TTL
          if (Date.now() - entry.createdAt <= this.config.ttl) {
            this.cache.set(entry.key, entry);
          } else {
            await fs.unlink(filePath);
          }
        } catch {
          // Skip invalid files
        }
      }
    } catch {
      // Directory might not exist yet
    }
  }
}
