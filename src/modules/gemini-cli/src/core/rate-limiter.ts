/**
 * Gemini CLI Module - Rate Limiter
 * Token bucket algorithm implementation
 */

import { GeminiRateLimitError } from './errors.js';
import type { RateLimitConfig, QuotaStatus } from './types.js';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per ms
}

export class RateLimiter {
  private minuteBucket: TokenBucket;
  private dayBucket: TokenBucket;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Initialize minute bucket
    this.minuteBucket = {
      tokens: config.requestsPerMinute,
      lastRefill: Date.now(),
      capacity: config.requestsPerMinute,
      refillRate: config.requestsPerMinute / 60000, // per ms
    };

    // Initialize day bucket
    this.dayBucket = {
      tokens: config.requestsPerDay,
      lastRefill: Date.now(),
      capacity: config.requestsPerDay,
      refillRate: config.requestsPerDay / 86400000, // per ms
    };
  }

  /**
   * Check if a request can be made
   */
  canMakeRequest(): boolean {
    if (!this.config.enabled) return true;

    this.refillBuckets();
    return this.minuteBucket.tokens >= 1 && this.dayBucket.tokens >= 1;
  }

  /**
   * Consume a token (call after successful request)
   */
  consumeToken(): void {
    if (!this.config.enabled) return;

    this.refillBuckets();

    if (this.minuteBucket.tokens < 1 || this.dayBucket.tokens < 1) {
      const retryAfter = this.getRetryAfter();
      throw new GeminiRateLimitError(
        'Rate limit exceeded',
        retryAfter,
        { quota: this.getQuotaStatus() }
      );
    }

    this.minuteBucket.tokens -= 1;
    this.dayBucket.tokens -= 1;
  }

  /**
   * Wait until a request can be made
   */
  async waitForQuota(): Promise<void> {
    if (!this.config.enabled) return;

    while (!this.canMakeRequest()) {
      const waitTime = Math.min(this.getRetryAfter(), 60000); // Max 1 minute wait
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get current quota status
   */
  getQuotaStatus(): QuotaStatus {
    this.refillBuckets();

    const minuteResetAt = new Date(this.minuteBucket.lastRefill + 60000);
    const dayResetAt = new Date(this.getDayResetTime());

    return {
      requestsPerMinute: {
        used: Math.floor(this.minuteBucket.capacity - this.minuteBucket.tokens),
        limit: this.minuteBucket.capacity,
        resetAt: minuteResetAt,
      },
      requestsPerDay: {
        used: Math.floor(this.dayBucket.capacity - this.dayBucket.tokens),
        limit: this.dayBucket.capacity,
        resetAt: dayResetAt,
      },
    };
  }

  /**
   * Get time until next available request (ms)
   */
  getRetryAfter(): number {
    this.refillBuckets();

    if (this.minuteBucket.tokens < 1) {
      // Time until minute bucket has 1 token
      const tokensNeeded = 1 - this.minuteBucket.tokens;
      return Math.ceil(tokensNeeded / this.minuteBucket.refillRate);
    }

    if (this.dayBucket.tokens < 1) {
      // Time until day bucket has 1 token
      const tokensNeeded = 1 - this.dayBucket.tokens;
      return Math.ceil(tokensNeeded / this.dayBucket.refillRate);
    }

    return 0;
  }

  /**
   * Refill token buckets based on elapsed time
   */
  private refillBuckets(): void {
    const now = Date.now();

    // Refill minute bucket
    const minuteElapsed = now - this.minuteBucket.lastRefill;
    const minuteTokensToAdd = minuteElapsed * this.minuteBucket.refillRate;
    this.minuteBucket.tokens = Math.min(
      this.minuteBucket.capacity,
      this.minuteBucket.tokens + minuteTokensToAdd
    );
    this.minuteBucket.lastRefill = now;

    // Refill day bucket
    const dayElapsed = now - this.dayBucket.lastRefill;
    const dayTokensToAdd = dayElapsed * this.dayBucket.refillRate;
    this.dayBucket.tokens = Math.min(
      this.dayBucket.capacity,
      this.dayBucket.tokens + dayTokensToAdd
    );
    this.dayBucket.lastRefill = now;
  }

  /**
   * Get the next day reset time (midnight UTC)
   */
  private getDayResetTime(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Reset rate limits (for testing or manual reset)
   */
  reset(): void {
    this.minuteBucket.tokens = this.minuteBucket.capacity;
    this.minuteBucket.lastRefill = Date.now();
    this.dayBucket.tokens = this.dayBucket.capacity;
    this.dayBucket.lastRefill = Date.now();
  }
}
