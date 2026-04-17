import http from 'http';
import { setupRabbitMQ } from '@ai-workers/shared';
import { QUEUES } from '@ai-workers/shared/types/messages';
import { processEmbed } from './handlers/embed.handler';
import { ChatbotEmbedMessage } from '@ai-workers/shared/types/messages';
import { setRabbitMQStatus, getHealthStatus } from '@ai-workers/shared/config/health';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

const PORT = parseInt(process.env.PORT || '3003', 10);

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
  console.log('Starting Embedding Worker...');

  const { conn, channel } = await setupRabbitMQ(RABBITMQ_URL);
  console.log('Connected to RabbitMQ');

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

  // Consume embed queue
  channel.consume(QUEUES.CHATBOT_EMBED, async (msg) => {
    if (!msg || isShuttingDown) return;

    try {
      const content = JSON.parse(msg.content.toString()) as ChatbotEmbedMessage;
      console.log(`Processing embed for document: ${content.documentId}`);

      await processEmbed(content, channel);

      channel.ack(msg);
      console.log(`Embedding completed for document: ${content.documentId}`);
    } catch (error) {
      console.error('Embedding failed:', error);
      channel.nack(msg, false, false);
    }
  });

  conn.on('close', () => {
    console.error('RabbitMQ connection closed');
    setRabbitMQStatus(false);
    process.exit(1);
  });

  console.log('Waiting for embedding tasks...');
}

main().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
