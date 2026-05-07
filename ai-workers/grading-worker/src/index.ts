import http from 'http';
import { setupRabbitMQ, publishMessage } from '@ai-workers/shared';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { processWriteGrading } from './handlers/write.handler';
import { processSpeakGrading } from './handlers/speak.handler';
import { processWriteGradingWithPool, processSpeakGradingWithPool, initializeGradingPool, getGradingPoolStats, isGradingPoolInitialized } from './handlers/grading-pool.handler';
import { GradingWriteMessage, GradingSpeakMessage } from '@ai-workers/shared/types/messages';
import { setRabbitMQStatus, getHealthStatus, getUptime, calculatePoolHealthSummary, getPoolRecommendations } from '@ai-workers/shared';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const USE_POOL = process.env.USE_GRADING_POOL === 'true';

const PORT = parseInt(process.env.PORT || '3001', 10);

let isShuttingDown = false;

const healthServer = http.createServer((req, res) => {
  const url = req.url || '';

  if (url === '/health' && req.method === 'GET') {
    const health = getHealthStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...health,
      uptime: getUptime(),
    }));
    return;
  }

  if (url === '/ready' && req.method === 'GET') {
    const health = getHealthStatus();
    const isReady = health.rabbitmq === 'connected';

    if (USE_POOL && isGradingPoolInitialized()) {
      const poolStats = getGradingPoolStats();
      res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });

      if (poolStats) {
        const summary = calculatePoolHealthSummary('grading', poolStats, poolStats.keysHealth);
        const recommendations = getPoolRecommendations(poolStats);
        res.end(JSON.stringify({
          ready: isReady,
          status: summary.isHealthy ? 'ok' : 'degraded',
          pool: summary,
          recommendations,
          timestamp: new Date().toISOString(),
        }));
      } else {
        res.end(JSON.stringify({
          ready: isReady,
          status: isReady ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
        }));
      }
    } else {
      res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ready: isReady,
        status: isReady ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
      }));
    }
    return;
  }

  if (url === '/metrics' && req.method === 'GET') {
    const health = getHealthStatus();

    if (USE_POOL && isGradingPoolInitialized()) {
      const poolStats = getGradingPoolStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });

      if (poolStats) {
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          uptime: getUptime(),
          rabbitmq: health.rabbitmq,
          pool: {
            totalKeys: poolStats.totalKeys,
            healthyKeys: poolStats.healthyKeys,
            disabledKeys: poolStats.disabledKeys,
            quotaUsedPercent: poolStats.totalQuotaLimit > 0
              ? Math.round((poolStats.totalQuotaUsed / poolStats.totalQuotaLimit) * 100)
              : 0,
            keysHealth: poolStats.keysHealth.map(k => ({
              name: k.name,
              isHealthy: k.isHealthy,
              quotaRemainingPercent: k.quotaRemainingPercent,
              consecutiveFailures: k.consecutiveFailures,
            })),
          },
        }));
      } else {
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          uptime: getUptime(),
          rabbitmq: health.rabbitmq,
          pool: null,
        }));
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        uptime: getUptime(),
        rabbitmq: health.rabbitmq,
        pool: null,
      }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

healthServer.listen(PORT, () => {
  console.log(`Health server listening on port ${PORT}`);
});

async function main() {
  console.log('🚀 Starting Grading Worker...');
  console.log(`USE_GRADING_POOL: ${USE_POOL}`);

  if (USE_POOL) {
    const apiKeys = [
      { apiKey: process.env.GROQ_API_KEY_4 || process.env.GROQ_API_KEY || '', name: 'grading-key-1' },
      { apiKey: process.env.GROQ_API_KEY_5 || '', name: 'grading-key-2' },
      { apiKey: process.env.GROQ_API_KEY_6 || '', name: 'grading-key-3' },
    ].filter(k => k.apiKey);

    if (apiKeys.length > 0) {
      initializeGradingPool({ apiKeys });
      console.log('✅ Grading AI Pool initialized');
    } else {
      console.warn('⚠️ USE_GRADING_POOL=true but no API keys found, falling back to legacy mode');
    }
  }

  const { conn, channel } = await setupRabbitMQ(RABBITMQ_URL);
  console.log('✅ Connected to RabbitMQ');

  conn.on('ready', () => setRabbitMQStatus(true));

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n${signal} received. Finishing current task...`);

    try {
      await channel.close();
      await conn.close();
      console.log('RabbitMQ connection closed gracefully');
    } catch (err) {
      console.error('Error closing RabbitMQ:', err);
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  const writeHandler = USE_POOL && isGradingPoolInitialized() ? processWriteGradingWithPool : processWriteGrading;
  const speakHandler = USE_POOL && isGradingPoolInitialized() ? processSpeakGradingWithPool : processSpeakGrading;

  channel.consume(QUEUES.GRADING_WRITE, async (msg) => {
    if (!msg || isShuttingDown) return;

    try {
      const content = JSON.parse(msg.content.toString()) as GradingWriteMessage;
      console.log(`📝 Processing writing submission: ${content.submissionId}`);

      await writeHandler(content, channel);

      channel.ack(msg);
      console.log(`✅ Write grading completed: ${content.submissionId}`);
    } catch (error) {
      console.error('❌ Write grading failed:', error);
      channel.nack(msg, false, false);
    }
  });

  channel.consume(QUEUES.GRADING_SPEAK, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as GradingSpeakMessage;
      console.log(`🎤 Processing speaking submission: ${content.submissionId}`);

      await speakHandler(content, channel);

      channel.ack(msg);
      console.log(`✅ Speak grading completed: ${content.submissionId}`);
    } catch (error) {
      console.error('❌ Speak grading failed:', error);
      channel.nack(msg, false, false);
    }
  });

  conn.on('close', () => {
    console.error('RabbitMQ connection closed');
    setRabbitMQStatus(false);
    process.exit(1);
  });

  console.log('👂 Waiting for grading tasks...');
}

main().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
