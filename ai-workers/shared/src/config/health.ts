import { PoolStats, KeyHealth } from './ai-pool';

let startTime = Date.now();

export const setStartTime = () => {
  startTime = Date.now();
};

export const getUptime = (): number => {
  return Math.floor((Date.now() - startTime) / 1000);
};

export interface PoolHealthSummary {
  isHealthy: boolean;
  healthScore: number;
  totalKeys: number;
  healthyKeys: number;
  disabledKeys: number;
  quotaUsedPercent: number;
  issues: string[];
}

export const calculatePoolHealthSummary = (
  poolType: string,
  stats: PoolStats,
  keysHealth: KeyHealth[]
): PoolHealthSummary => {
  const issues: string[] = [];
  let healthScore = 100;

  if (stats.totalKeys === 0) {
    issues.push(`No API keys configured for ${poolType} pool`);
    healthScore = 0;
  } else if (stats.healthyKeys === 0) {
    issues.push(`All ${poolType} API keys are unhealthy or disabled`);
    healthScore = 0;
  } else if (stats.disabledKeys > 0) {
    issues.push(`${stats.disabledKeys} of ${stats.totalKeys} ${poolType} keys are disabled`);
    healthScore -= 30;
  }

  const quotaUsedPercent = stats.totalQuotaLimit > 0
    ? Math.round((stats.totalQuotaUsed / stats.totalQuotaLimit) * 100)
    : 0;

  if (quotaUsedPercent > 90) {
    issues.push(`Quota usage is at ${quotaUsedPercent}% - nearing limit`);
    healthScore -= 20;
  } else if (quotaUsedPercent > 75) {
    issues.push(`Quota usage is at ${quotaUsedPercent}%`);
    healthScore -= 10;
  }

  const unhealthyKeys = keysHealth.filter(k => !k.isHealthy);
  if (unhealthyKeys.length > 0) {
    issues.push(`${unhealthyKeys.length} key(s) have consecutive failures`);
    healthScore -= 15;
  }

  return {
    isHealthy: healthScore >= 50 && stats.healthyKeys > 0,
    healthScore: Math.max(0, healthScore),
    totalKeys: stats.totalKeys,
    healthyKeys: stats.healthyKeys,
    disabledKeys: stats.disabledKeys,
    quotaUsedPercent,
    issues,
  };
};

export const isPoolHealthy = (stats: PoolStats): boolean => {
  if (stats.totalKeys === 0 || stats.healthyKeys === 0) return false;
  const quotaUsedPercent = stats.totalQuotaLimit > 0
    ? (stats.totalQuotaUsed / stats.totalQuotaLimit) * 100
    : 0;
  return quotaUsedPercent < 95;
};

export interface PoolRecommendation {
  type: 'warning' | 'critical' | 'info';
  message: string;
  action?: string;
}

export const getPoolRecommendations = (stats: PoolStats): PoolRecommendation[] => {
  const recommendations: PoolRecommendation[] = [];

  if (stats.totalKeys === 0) {
    recommendations.push({
      type: 'critical',
      message: 'No API keys configured',
      action: 'Add at least one API key to enable AI processing',
    });
  } else if (stats.healthyKeys === 0) {
    recommendations.push({
      type: 'critical',
      message: 'All API keys are unhealthy',
      action: 'Check API key validity and quota status',
    });
  }

  const quotaUsedPercent = stats.totalQuotaLimit > 0
    ? Math.round((stats.totalQuotaUsed / stats.totalQuotaLimit) * 100)
    : 0;

  if (quotaUsedPercent > 90) {
    recommendations.push({
      type: 'critical',
      message: `Quota usage critical: ${quotaUsedPercent}%`,
      action: 'Add more API keys or wait for daily reset',
    });
  } else if (quotaUsedPercent > 75) {
    recommendations.push({
      type: 'warning',
      message: `Quota usage high: ${quotaUsedPercent}%`,
      action: 'Consider adding more API keys',
    });
  }

  if (stats.disabledKeys > 0) {
    recommendations.push({
      type: 'warning',
      message: `${stats.disabledKeys} key(s) disabled due to failures`,
      action: 'Keys will auto-reenable after 3 successful requests',
    });
  }

  if (stats.totalKeys === 1 && stats.healthyKeys === 1) {
    recommendations.push({
      type: 'info',
      message: 'Single API key - no redundancy',
      action: 'Consider adding multiple keys for better reliability',
    });
  }

  return recommendations;
};

let isRabbitMQConnected = false;
let isHealthy = true;

export const setRabbitMQStatus = (connected: boolean) => {
  isRabbitMQConnected = connected;
  isHealthy = connected;
};

export const getHealthStatus = () => ({
  status: isHealthy ? 'healthy' : 'unhealthy',
  rabbitmq: isRabbitMQConnected ? 'connected' : 'disconnected',
  timestamp: new Date().toISOString(),
});
