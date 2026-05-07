import Groq from 'groq-sdk';

export interface AIKeyConfig {
  apiKey: string;
  name: string;
  isDisabled: boolean;
  dailyQuotaUsed: number;
  dailyQuotaLimit: number;
  lastResetAt: Date;
  consecutiveFailures: number;
}

export interface KeyHealth {
  name: string;
  isHealthy: boolean;
  isDisabled: boolean;
  quotaRemainingPercent: number;
  consecutiveFailures: number;
}

export interface AIMultiKeyConfig {
  keys: AIKeyConfig[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  dailyQuotaLimit: number;
  healthCheckIntervalMs: number;
}

const DEFAULT_CONFIG: AIMultiKeyConfig = {
  keys: [],
  rateLimitWindowMs: 30000,
  rateLimitMaxRequests: 30,
  dailyQuotaLimit: 10000,
  healthCheckIntervalMs: 60000,
};

export class AIKeyPool {
  private keys: AIKeyConfig[] = [];
  private currentIndex: number = 0;
  private rateLimitWindowMs: number;
  private rateLimitMaxRequests: number;
  private dailyQuotaLimit: number;
  private healthCheckIntervalMs: number;
  private requestCounts: Map<string, { count: number; windowStart: number }> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<AIMultiKeyConfig> = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    this.rateLimitWindowMs = finalConfig.rateLimitWindowMs;
    this.rateLimitMaxRequests = finalConfig.rateLimitMaxRequests;
    this.dailyQuotaLimit = finalConfig.dailyQuotaLimit;
    this.healthCheckIntervalMs = finalConfig.healthCheckIntervalMs;

    this.keys = finalConfig.keys.map(k => ({
      ...k,
      isDisabled: k.isDisabled ?? false,
      dailyQuotaUsed: k.dailyQuotaUsed ?? 0,
      dailyQuotaLimit: k.dailyQuotaLimit ?? this.dailyQuotaLimit,
      lastResetAt: k.lastResetAt ?? new Date(),
      consecutiveFailures: k.consecutiveFailures ?? 0,
    }));

    this.startHealthCheck();
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.checkAndResetDailyQuota();
      this.reenableDisabledKeys();
    }, this.healthCheckIntervalMs);
  }

  private checkAndResetDailyQuota(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const key of this.keys) {
      const keyDate = new Date(key.lastResetAt.getFullYear(), key.lastResetAt.getMonth(), key.lastResetAt.getDate());

      if (today > keyDate) {
        key.dailyQuotaUsed = 0;
        key.lastResetAt = now;
      }
    }
  }

  private reenableDisabledKeys(): void {
    for (const key of this.keys) {
      if (key.isDisabled && key.consecutiveFailures < 3) {
        key.isDisabled = false;
      }
    }
  }

  private getCurrentIndex(): number {
    return this.currentIndex % this.keys.length;
  }

  private incrementIndex(): void {
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
  }

  private isRateLimited(keyName: string): boolean {
    const now = Date.now();
    const keyData = this.requestCounts.get(keyName);

    if (!keyData || now - keyData.windowStart > this.rateLimitWindowMs) {
      this.requestCounts.set(keyName, { count: 1, windowStart: now });
      return false;
    }

    if (keyData.count >= this.rateLimitMaxRequests) {
      return true;
    }

    keyData.count++;
    return false;
  }

  private isQuotaExhausted(key: AIKeyConfig): boolean {
    return key.dailyQuotaUsed >= key.dailyQuotaLimit;
  }

  private isKeyHealthy(key: AIKeyConfig): boolean {
    if (key.isDisabled) return false;
    if (this.isRateLimited(key.name)) return false;
    if (this.isQuotaExhausted(key)) return false;
    if (key.consecutiveFailures >= 3) return false;
    return true;
  }

  getHealthyKey(): AIKeyConfig | null {
    const startIndex = this.getCurrentIndex();

    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[this.getCurrentIndex()];

      if (this.isKeyHealthy(key)) {
        const healthyKey = key;
        this.incrementIndex();
        return healthyKey;
      }

      this.incrementIndex();
    }

    return null;
  }

  getGroqClient(): { client: Groq; key: AIKeyConfig } | null {
    const key = this.getHealthyKey();
    if (!key) return null;

    return {
      client: new Groq({ apiKey: key.apiKey }),
      key,
    };
  }

  recordSuccess(keyName: string): void {
    const key = this.keys.find(k => k.name === keyName);
    if (key) {
      key.consecutiveFailures = 0;
      key.dailyQuotaUsed++;
    }
  }

  recordRateLimitError(keyName: string): void {
    const key = this.keys.find(k => k.name === keyName);
    if (key) {
      key.consecutiveFailures++;
      if (key.consecutiveFailures >= 3) {
        key.isDisabled = true;
      }
    }
  }

  recordQuotaExhausted(keyName: string): void {
    const key = this.keys.find(k => k.name === keyName);
    if (key) {
      key.isDisabled = true;
      key.consecutiveFailures++;
    }
  }

  recordFailure(keyName: string): void {
    const key = this.keys.find(k => k.name === keyName);
    if (key) {
      key.consecutiveFailures++;
      if (key.consecutiveFailures >= 3) {
        key.isDisabled = true;
      }
    }
  }

  getAllKeyHealth(): KeyHealth[] {
    return this.keys.map(key => ({
      name: key.name,
      isHealthy: this.isKeyHealthy(key),
      isDisabled: key.isDisabled,
      quotaRemainingPercent: Math.max(0, 100 - (key.dailyQuotaUsed / key.dailyQuotaLimit) * 100),
      consecutiveFailures: key.consecutiveFailures,
    }));
  }

  getPoolStats(): {
    totalKeys: number;
    healthyKeys: number;
    disabledKeys: number;
    totalQuotaUsed: number;
    totalQuotaLimit: number;
  } {
    const stats = {
      totalKeys: this.keys.length,
      healthyKeys: 0,
      disabledKeys: 0,
      totalQuotaUsed: 0,
      totalQuotaLimit: 0,
    };

    for (const key of this.keys) {
      if (key.isDisabled) {
        stats.disabledKeys++;
      } else {
        stats.healthyKeys++;
      }
      stats.totalQuotaUsed += key.dailyQuotaUsed;
      stats.totalQuotaLimit += key.dailyQuotaLimit;
    }

    return stats;
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.requestCounts.clear();
  }
}

export interface PoolStats {
  totalKeys: number;
  healthyKeys: number;
  disabledKeys: number;
  totalQuotaUsed: number;
  totalQuotaLimit: number;
  keysHealth: KeyHealth[];
}
