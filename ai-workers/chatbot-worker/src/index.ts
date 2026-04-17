import { setupRabbitMQ, publishMessage } from '@ai-workers/shared';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { processChatbotAsk } from './handlers/ask.handler';
import { ChatbotAskMessage } from '@ai-workers/shared/types/messages';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

async function main() {
  console.log('🚀 Starting Chatbot Worker...');

  const { conn, channel } = await setupRabbitMQ(RABBITMQ_URL);
  console.log('✅ Connected to RabbitMQ');

  // Consume chatbot ask queue
  channel.consume(QUEUES.CHATBOT_ASK, async (msg) => {
    if (!msg) return;

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
    process.exit(1);
  });

  console.log('👂 Waiting for chatbot messages...');
}

main().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});