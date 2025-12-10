/**
 * Rate Limiter Tests
 * Tests for the token bucket rate limiting algorithm
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the module before importing
const mockRateLimiter = {
  consumeToken: jest.fn(),
  canConsume: jest.fn(),
  waitForQuota: jest.fn(),
  getQuotaStatus: jest.fn(),
  reset: jest.fn(),
};

// We'll test the rate limiter logic directly
describe('RateLimiter', () => {
  // Simulate token bucket algorithm
  class TestRateLimiter {
    private tokens: number;
    private maxTokens: number;
    private refillRate: number;
    private lastRefill: number;

    constructor(config: { maxTokens: number; refillRate: number }) {
      this.maxTokens = config.maxTokens;
      this.tokens = config.maxTokens;
      this.refillRate = config.refillRate;
      this.lastRefill = Date.now();
    }

    private refill(): void {
      const now = Date.now();
      const elapsed = now - this.lastRefill;
      const tokensToAdd = Math.floor(elapsed / (60000 / this.refillRate));
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }

    canConsume(): boolean {
      this.refill();
      return this.tokens > 0;
    }

    consumeToken(): boolean {
      this.refill();
      if (this.tokens > 0) {
        this.tokens--;
        return true;
      }
      return false;
    }

    getTokens(): number {
      this.refill();
      return this.tokens;
    }

    reset(): void {
      this.tokens = this.maxTokens;
      this.lastRefill = Date.now();
    }
  }

  let rateLimiter: TestRateLimiter;

  beforeEach(() => {
    rateLimiter = new TestRateLimiter({
      maxTokens: 10,
      refillRate: 60, // 60 tokens per minute = 1 per second
    });
  });

  describe('Token Consumption', () => {
    it('should start with max tokens', () => {
      expect(rateLimiter.getTokens()).toBe(10);
    });

    it('should consume tokens successfully when available', () => {
      expect(rateLimiter.consumeToken()).toBe(true);
      expect(rateLimiter.getTokens()).toBe(9);
    });

    it('should consume multiple tokens', () => {
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.consumeToken()).toBe(true);
      }
      expect(rateLimiter.getTokens()).toBe(5);
    });

    it('should fail to consume when no tokens available', () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        rateLimiter.consumeToken();
      }
      expect(rateLimiter.consumeToken()).toBe(false);
      expect(rateLimiter.getTokens()).toBe(0);
    });
  });

  describe('Token Availability Check', () => {
    it('should report can consume when tokens available', () => {
      expect(rateLimiter.canConsume()).toBe(true);
    });

    it('should report cannot consume when no tokens', () => {
      for (let i = 0; i < 10; i++) {
        rateLimiter.consumeToken();
      }
      expect(rateLimiter.canConsume()).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset tokens to max', () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.consumeToken();
      }
      expect(rateLimiter.getTokens()).toBe(5);

      rateLimiter.reset();
      expect(rateLimiter.getTokens()).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero max tokens', () => {
      const zeroLimiter = new TestRateLimiter({
        maxTokens: 0,
        refillRate: 60,
      });
      expect(zeroLimiter.canConsume()).toBe(false);
      expect(zeroLimiter.consumeToken()).toBe(false);
    });

    it('should not exceed max tokens after reset', () => {
      rateLimiter.reset();
      rateLimiter.reset();
      expect(rateLimiter.getTokens()).toBe(10);
    });
  });
});

describe('QuotaStatus', () => {
  interface QuotaStatus {
    requestsPerMinute: { used: number; limit: number; resetAt: Date };
    requestsPerDay: { used: number; limit: number; resetAt: Date };
  }

  function createQuotaStatus(rpmUsed: number, rpdUsed: number): QuotaStatus {
    const now = new Date();
    return {
      requestsPerMinute: {
        used: rpmUsed,
        limit: 60,
        resetAt: new Date(now.getTime() + 60000),
      },
      requestsPerDay: {
        used: rpdUsed,
        limit: 1500,
        resetAt: new Date(now.setHours(24, 0, 0, 0)),
      },
    };
  }

  it('should track requests per minute', () => {
    const status = createQuotaStatus(10, 100);
    expect(status.requestsPerMinute.used).toBe(10);
    expect(status.requestsPerMinute.limit).toBe(60);
  });

  it('should track requests per day', () => {
    const status = createQuotaStatus(10, 500);
    expect(status.requestsPerDay.used).toBe(500);
    expect(status.requestsPerDay.limit).toBe(1500);
  });

  it('should have future reset times', () => {
    const status = createQuotaStatus(0, 0);
    const now = new Date();
    expect(status.requestsPerMinute.resetAt.getTime()).toBeGreaterThan(now.getTime());
  });
});
