import { setupRabbitMQ } from '@ai-workers/shared';
import { QUEUES } from '@ai-workers/shared/types/messages';
import { processEmbed } from './handlers/embed.handler';
import { ChatbotEmbedMessage } from '@ai-workers/shared/types/messages';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

async function main() {
  console.log('Starting Embedding Worker...');

  const { conn, channel } = await setupRabbitMQ(RABBITMQ_URL);
  console.log('Connected to RabbitMQ');

  // Consume embed queue
  channel.consume(QUEUES.CHATBOT_EMBED, async (msg) => {
    if (!msg) return;

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
    process.exit(1);
  });

  console.log('Waiting for embedding tasks...');
}

main().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
