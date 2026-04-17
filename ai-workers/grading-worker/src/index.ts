import http from 'http';
import { setupRabbitMQ, publishMessage } from '@ai-workers/shared';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { processWriteGrading } from './handlers/write.handler';
import { processSpeakGrading } from './handlers/speak.handler';
import { GradingWriteMessage, GradingSpeakMessage } from '@ai-workers/shared/types/messages';
import { setRabbitMQStatus, getHealthStatus } from '@ai-workers/shared/config/health';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

const PORT = parseInt(process.env.PORT || '3001', 10);

let isShuttingDown = false;

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getHealthStatus()));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(PORT, () => {
  console.log(`Health server listening on port ${PORT}`);
});

async function main() {
  console.log('🚀 Starting Grading Worker...');

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

  // Consume write grading queue
  channel.consume(QUEUES.GRADING_WRITE, async (msg) => {
    if (!msg || isShuttingDown) return;

    try {
      const content = JSON.parse(msg.content.toString()) as GradingWriteMessage;
      console.log(`📝 Processing writing submission: ${content.submissionId}`);

      await processWriteGrading(content, channel);

      channel.ack(msg);
      console.log(`✅ Write grading completed: ${content.submissionId}`);
    } catch (error) {
      console.error('❌ Write grading failed:', error);
      // Nack without requeue - will go to DLQ
      channel.nack(msg, false, false);
    }
  });

  // Consume speak grading queue
  channel.consume(QUEUES.GRADING_SPEAK, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as GradingSpeakMessage;
      console.log(`🎤 Processing speaking submission: ${content.submissionId}`);

      await processSpeakGrading(content, channel);

      channel.ack(msg);
      console.log(`✅ Speak grading completed: ${content.submissionId}`);
    } catch (error) {
      console.error('❌ Speak grading failed:', error);
      channel.nack(msg, false, false);
    }
  });

  // Handle connection close
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
