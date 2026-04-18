import http from 'http';
import { setupRabbitMQ, publishMessage } from '@ai-workers/shared/config/rabbitmq';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { processChatbotAsk } from './handlers/ask.handler';
import { ChatbotAskMessage } from '@ai-workers/shared/types/messages';
import { setRabbitMQStatus, getHealthStatus } from '@ai-workers/shared/config/health';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

const PORT = parseInt(process.env.PORT || '3002', 10);

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
  console.log('🚀 Starting Chatbot Worker...');

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

  // Consume chatbot ask queue
  channel.consume(QUEUES.CHATBOT_ASK, async (msg: any) => {
    if (!msg || isShuttingDown) return;

    try {
      const content = JSON.parse(msg.content.toString()) as ChatbotAskMessage;
      console.log(`💬 Processing chatbot message for session: ${content.sessionId}`);

      await processChatbotAsk(content, channel);

      channel.ack(msg);
    } catch (error) {
      console.error('❌ Chatbot processing failed:', error);
      channel.nack(msg, false, false);
    }
  });

  conn.on('close', () => {
    console.error('RabbitMQ connection closed');
    setRabbitMQStatus(false);
    process.exit(1);
  });

  console.log('👂 Waiting for chatbot messages...');
}

main().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});