import { AIKeyPool, PoolStats } from './ai-pool';

export interface RedisConfig {
  url: string;
  keyPrefix: string;
  ttlSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface UserQuotaResult {
  hasQuota: boolean;
  remaining: number;
  isUnlimited: boolean;
}

const DEFAULT_REDIS_CONFIG: RedisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  keyPrefix: 'ielts:ai:',
  ttlSeconds: 86400,
};

export class RateLimiter {
  private redis: any;
  private redisConfig: RedisConfig;
  private isConnected: boolean = false;

  constructor(redisClient: any, config: Partial<RedisConfig> = {}) {
    this.redis = redisClient;
    this.redisConfig = { ...DEFAULT_REDIS_CONFIG, ...config };
    this.isConnected = redisClient !== null;
  }

  static async create(config: Partial<RedisConfig> = {}): Promise<RateLimiter> {
    const finalConfig = { ...DEFAULT_REDIS_CONFIG, ...config };
    const Redis = await import('ioredis');
    const redis = new Redis.default(finalConfig.url);
    return new RateLimiter(redis, finalConfig);
  }

  private getKey(type: string, identifier: string): string {
    return `${this.redisConfig.keyPrefix}${type}:${identifier}`;
  }

  async checkRateLimit(
    keyName: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    if (!this.isConnected) {
      return { allowed: true, remaining: maxRequests, resetAt: 0 };
    }

    const key = this.getKey('ratelimit', keyName);
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      await this.redis.zremrangebyscore(key, 0, windowStart);

      const count = await this.redis.zcard(key);

      if (count >= maxRequests) {
        const oldestEntry = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetAt = oldestEntry.length >= 2
          ? parseInt(oldestEntry[1]) + windowMs
          : now + windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      await this.redis.zadd(key, now, `${now}:${Math.random()}`);
      await this.redis.expire(key, Math.ceil(windowMs / 1000));

      return {
        allowed: true,
        remaining: maxRequests - count - 1,
        resetAt: now + windowMs,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true, remaining: maxRequests, resetAt: 0 };
    }
  }

  async checkDailyQuota(
    keyName: string,
    maxQuota: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.isConnected) {
      return { allowed: true, remaining: maxQuota };
    }

    const key = this.getKey('dailyquota', keyName);
    const today = new Date().toISOString().split('T')[0];

    try {
      const result = await this.redis.hget(key, today);
      const used = parseInt(result || '0');

      if (used >= maxQuota) {
        return { allowed: false, remaining: 0 };
      }

      return {
        allowed: true,
        remaining: maxQuota - used,
      };
    } catch (error) {
      console.error('Daily quota check failed:', error);
      return { allowed: true, remaining: maxQuota };
    }
  }

  async incrementDailyQuota(keyName: string, amount: number = 1): Promise<void> {
    if (!this.isConnected) return;

    const key = this.getKey('dailyquota', keyName);
    const today = new Date().toISOString().split('T')[0];

    try {
      await this.redis.hincrby(key, today, amount);
      await this.redis.expire(key, this.redisConfig.ttlSeconds);
    } catch (error) {
      console.error('Daily quota increment failed:', error);
    }
  }

  async getUserDailyUsage(userId: string): Promise<number> {
    if (!this.isConnected) return 0;

    const key = this.getKey('dailyquota', `user:${userId}`);
    const today = new Date().toISOString().split('T')[0];

    try {
      const result = await this.redis.hget(key, today);
      return parseInt(result || '0');
    } catch (error) {
      console.error('Get user daily usage failed:', error);
      return 0;
    }
  }

  async resetDailyQuota(keyName: string): Promise<void> {
    if (!this.isConnected) return;

    const key = this.getKey('dailyquota', keyName);

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Reset daily quota failed:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.redis) {
      await this.redis.quit();
      this.isConnected = false;
    }
  }
}

export interface CacheEntry {
  answer: string;
  keywords: string[];
  createdAt: number;
  similarity?: number;
}

export class AICache {
  private redis: any;
  private redisConfig: RedisConfig;
  private isConnected: boolean = false;
  private similarityThreshold: number = 0.85;

  constructor(redisClient: any, config: Partial<RedisConfig> = {}) {
    this.redis = redisClient;
    this.redisConfig = { ...DEFAULT_REDIS_CONFIG, ...config };
    this.isConnected = redisClient !== null;
  }

  static async create(config: Partial<RedisConfig> = {}): Promise<AICache> {
    const finalConfig = { ...DEFAULT_REDIS_CONFIG, ...config };
    const Redis = await import('ioredis');
    const redis = new Redis.default(finalConfig.url);
    return new AICache(redis, finalConfig);
  }

  private getCacheKey(query: string): string {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    const hash = this.hashString(normalized);
    return `${this.redisConfig.keyPrefix}cache:${hash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
      'who', 'how', 'when', 'where', 'why', 'all', 'some', 'any', 'each',
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    return [...new Set(words)];
  }

  async get(query: string): Promise<string | null> {
    if (!this.isConnected) return null;

    const key = this.getCacheKey(query);

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000;

        if (now - entry.createdAt < maxAge) {
          return entry.answer;
        }
      }
    } catch (error) {
      console.error('Cache get failed:', error);
    }

    return null;
  }

  async set(query: string, answer: string): Promise<void> {
    if (!this.isConnected) return;

    const key = this.getCacheKey(query);
    const keywords = this.extractKeywords(query);

    const entry: CacheEntry = {
      answer,
      keywords,
      createdAt: Date.now(),
    };

    try {
      await this.redis.setex(key, this.redisConfig.ttlSeconds, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache set failed:', error);
    }
  }

  async invalidate(pattern?: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      if (pattern) {
        const keys = await this.redis.keys(`${this.redisConfig.keyPrefix}cache:${pattern}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        const keys = await this.redis.keys(`${this.redisConfig.keyPrefix}cache:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('Cache invalidation failed:', error);
    }
  }

  async getStats(): Promise<{ size: number; keys: string[] }> {
    if (!this.isConnected) return { size: 0, keys: [] };

    try {
      const keys = await this.redis.keys(`${this.redisConfig.keyPrefix}cache:*`);
      return { size: keys.length, keys };
    } catch (error) {
      console.error('Cache stats failed:', error);
      return { size: 0, keys: [] };
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.redis) {
      await this.redis.quit();
      this.isConnected = false;
    }
  }
}

export class ChatbotLimitService {
  private rateLimiter: RateLimiter;
  private cache: AICache;
  private freeTierLimit: number;
  private aiPool: AIKeyPool;

  constructor(
    rateLimiter: RateLimiter,
    cache: AICache,
    aiPool: AIKeyPool,
    freeTierLimit: number = 10,
  ) {
    this.rateLimiter = rateLimiter;
    this.cache = cache;
    this.aiPool = aiPool;
    this.freeTierLimit = freeTierLimit;
  }

  async checkUserAccess(userId: string): Promise<{
    canAccess: boolean;
    isFreeTier: boolean;
    remaining: number;
    reason?: string;
  }> {
    const dailyUsage = await this.rateLimiter.getUserDailyUsage(userId);

    if (dailyUsage < this.freeTierLimit) {
      return {
        canAccess: true,
        isFreeTier: true,
        remaining: this.freeTierLimit - dailyUsage,
      };
    }

    return {
      canAccess: true,
      isFreeTier: false,
      remaining: 0,
    };
  }

  async recordUsage(userId: string, isFreeTier: boolean): Promise<void> {
    if (isFreeTier) {
      await this.rateLimiter.incrementDailyQuota(`user:${userId}`, 1);
    }
  }

  async getCachedResponse(query: string): Promise<string | null> {
    return this.cache.get(query);
  }

  async cacheResponse(query: string, response: string): Promise<void> {
    await this.cache.set(query, response);
  }

  async getAIKey(): Promise<{ client: any; key: any } | null> {
    return this.aiPool.getGroqClient();
  }

  async recordAIError(keyName: string, errorType: 'rate_limit' | 'quota' | 'generic'): Promise<void> {
    switch (errorType) {
      case 'rate_limit':
        this.aiPool.recordRateLimitError(keyName);
        break;
      case 'quota':
        this.aiPool.recordQuotaExhausted(keyName);
        break;
      default:
        this.aiPool.recordFailure(keyName);
    }
  }

  async recordAISuccess(keyName: string): Promise<void> {
    this.aiPool.recordSuccess(keyName);
  }

  getPoolStats(): PoolStats {
    return {
      ...this.aiPool.getPoolStats(),
      keysHealth: this.aiPool.getAllKeyHealth(),
    };
  }
}
