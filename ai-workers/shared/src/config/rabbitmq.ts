import * as amqp from 'amqplib';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '../types/messages';

export interface RabbitMQConfig {
  url: string;
  exchange: string;
  queue: string;
  routingKey: string;
}

export async function setupRabbitMQ(connectionUrl: string) {
  const conn = await amqp.connect(connectionUrl);
  const channel = await conn.createChannel();

  // Setup exchanges
  await channel.assertExchange(EXCHANGES.GRADING, 'direct', { durable: true });
  await channel.assertExchange(EXCHANGES.CHATBOT, 'direct', { durable: true });

  // Setup queues with dead letter exchange
  await channel.assertExchange('dlx.exchange', 'direct', { durable: true });

  // Grading queues
  await channel.assertQueue(QUEUES.GRADING_WRITE, {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: ROUTING_KEYS.FAILED,
  });
  await channel.assertQueue(QUEUES.GRADING_SPEAK, {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: ROUTING_KEYS.FAILED,
  });
  await channel.assertQueue(QUEUES.GRADING_FAILED, { durable: true });

  // Chatbot queues
  await channel.assertQueue(QUEUES.CHATBOT_ASK, { durable: true });
  await channel.assertQueue(QUEUES.CHATBOT_EMBED, { durable: true });
  await channel.assertQueue(QUEUES.CHATBOT_REPLY, { durable: true });

  // Bind queues to exchanges
  channel.bindQueue(QUEUES.GRADING_WRITE, EXCHANGES.GRADING, ROUTING_KEYS.WRITE);
  channel.bindQueue(QUEUES.GRADING_SPEAK, EXCHANGES.GRADING, ROUTING_KEYS.SPEAK);
  channel.bindQueue(QUEUES.GRADING_FAILED, 'dlx.exchange', ROUTING_KEYS.FAILED);
  channel.bindQueue(QUEUES.CHATBOT_ASK, EXCHANGES.CHATBOT, ROUTING_KEYS.ASK);
  channel.bindQueue(QUEUES.CHATBOT_EMBED, EXCHANGES.CHATBOT, ROUTING_KEYS.EMBED);
  channel.bindQueue(QUEUES.CHATBOT_REPLY, EXCHANGES.CHATBOT, ROUTING_KEYS.REPLY);

  return { conn, channel };
}

export async function publishMessage(
  channel: amqp.Channel,
  exchange: string,
  routingKey: string,
  message: object,
): Promise<boolean> {
  const content = Buffer.from(JSON.stringify(message));
  return channel.publish(exchange, routingKey, content, {
    persistent: true,
    contentType: 'application/json',
  });
}