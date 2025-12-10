import { GeminiRateLimitError } from './errors.js';
export class RateLimiter {
    minuteBucket;
    dayBucket;
    config;
    constructor(config){
        this.config = config;
        this.minuteBucket = {
            tokens: config.requestsPerMinute,
            lastRefill: Date.now(),
            capacity: config.requestsPerMinute,
            refillRate: config.requestsPerMinute / 60000
        };
        this.dayBucket = {
            tokens: config.requestsPerDay,
            lastRefill: Date.now(),
            capacity: config.requestsPerDay,
            refillRate: config.requestsPerDay / 86400000
        };
    }
    canMakeRequest() {
        if (!this.config.enabled) return true;
        this.refillBuckets();
        return this.minuteBucket.tokens >= 1 && this.dayBucket.tokens >= 1;
    }
    consumeToken() {
        if (!this.config.enabled) return;
        this.refillBuckets();
        if (this.minuteBucket.tokens < 1 || this.dayBucket.tokens < 1) {
            const retryAfter = this.getRetryAfter();
            throw new GeminiRateLimitError('Rate limit exceeded', retryAfter, {
                quota: this.getQuotaStatus()
            });
        }
        this.minuteBucket.tokens -= 1;
        this.dayBucket.tokens -= 1;
    }
    async waitForQuota() {
        if (!this.config.enabled) return;
        while(!this.canMakeRequest()){
            const waitTime = Math.min(this.getRetryAfter(), 60000);
            await new Promise((resolve)=>setTimeout(resolve, waitTime));
        }
    }
    getQuotaStatus() {
        this.refillBuckets();
        const minuteResetAt = new Date(this.minuteBucket.lastRefill + 60000);
        const dayResetAt = new Date(this.getDayResetTime());
        return {
            requestsPerMinute: {
                used: Math.floor(this.minuteBucket.capacity - this.minuteBucket.tokens),
                limit: this.minuteBucket.capacity,
                resetAt: minuteResetAt
            },
            requestsPerDay: {
                used: Math.floor(this.dayBucket.capacity - this.dayBucket.tokens),
                limit: this.dayBucket.capacity,
                resetAt: dayResetAt
            }
        };
    }
    getRetryAfter() {
        this.refillBuckets();
        if (this.minuteBucket.tokens < 1) {
            const tokensNeeded = 1 - this.minuteBucket.tokens;
            return Math.ceil(tokensNeeded / this.minuteBucket.refillRate);
        }
        if (this.dayBucket.tokens < 1) {
            const tokensNeeded = 1 - this.dayBucket.tokens;
            return Math.ceil(tokensNeeded / this.dayBucket.refillRate);
        }
        return 0;
    }
    refillBuckets() {
        const now = Date.now();
        const minuteElapsed = now - this.minuteBucket.lastRefill;
        const minuteTokensToAdd = minuteElapsed * this.minuteBucket.refillRate;
        this.minuteBucket.tokens = Math.min(this.minuteBucket.capacity, this.minuteBucket.tokens + minuteTokensToAdd);
        this.minuteBucket.lastRefill = now;
        const dayElapsed = now - this.dayBucket.lastRefill;
        const dayTokensToAdd = dayElapsed * this.dayBucket.refillRate;
        this.dayBucket.tokens = Math.min(this.dayBucket.capacity, this.dayBucket.tokens + dayTokensToAdd);
        this.dayBucket.lastRefill = now;
    }
    getDayResetTime() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }
    reset() {
        this.minuteBucket.tokens = this.minuteBucket.capacity;
        this.minuteBucket.lastRefill = Date.now();
        this.dayBucket.tokens = this.dayBucket.capacity;
        this.dayBucket.lastRefill = Date.now();
    }
}

//# sourceMappingURL=rate-limiter.js.map