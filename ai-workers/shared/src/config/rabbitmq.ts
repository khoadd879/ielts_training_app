import * as amqp from 'amqplib';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '../types/messages';

export interface RabbitMQConfig {
  url: string;
  exchange: string;
  queue: string;
  routingKey: string;
}

const DEFAULT_FALLBACK_URLS = [
  'amqp://guest:guest@127.0.0.1:5672',
  'amqp://guest:guest@rabbitmq:5672',
];

const PER_URL_RETRIES = 3;
const PER_URL_BACKOFF_MS = [1000, 2000, 4000];

/**
 * Resolve the candidate URL list. RABBITMQ_URLS (comma-separated) takes
 * precedence, then RABBITMQ_URL, then DEFAULT_FALLBACK_URLS. Order is
 * preserved: first URL is tried first.
 */
function resolveCandidateUrls(): string[] {
  const urlsEnv = process.env.RABBITMQ_URLS;
  if (urlsEnv && urlsEnv.trim().length > 0) {
    return urlsEnv
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
  }
  const url = process.env.RABBITMQ_URL;
  if (url && url.trim().length > 0) {
    return [url.trim()];
  }
  return [...DEFAULT_FALLBACK_URLS];
}

/**
 * Try each candidate URL in order. For each URL, retry PER_URL_RETRIES times
 * with exponential backoff before falling through to the next URL. This is the
 * worker-side mirror of RabbitMQService.connectWithFallback on the BE side, so
 * both can be configured the same way regardless of whether they run on host
 * (where `rabbitmq` hostname may not resolve) or inside Docker (where it does).
 */
async function connectWithFallback(): Promise<{ conn: amqp.Connection; channel: amqp.Channel }> {
  const urls = resolveCandidateUrls();
  const attempts: string[] = [];
  for (const url of urls) {
    for (let attempt = 0; attempt < PER_URL_RETRIES; attempt++) {
      try {
        const conn = await amqp.connect(url);
        const channel = await conn.createChannel();
        console.log(`✅ Connected to RabbitMQ via ${url}`);
        return { conn, channel };
      } catch (error) {
        attempts.push(
          `${url} attempt ${attempt + 1}: ${(error as Error).message}`,
        );
        if (attempt < PER_URL_RETRIES - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, PER_URL_BACKOFF_MS[attempt]),
          );
        }
      }
    }
  }
  throw new Error(
    `Failed to connect to RabbitMQ after ${attempts.length} attempts across ${urls.length} URL(s): ${attempts.join(' | ')}`,
  );
}

export async function setupRabbitMQ(_connectionUrl?: string) {
  // _connectionUrl kept for backward compatibility with existing callers
  // (chatbot/embedding/grading worker index.ts still pass a URL string). The
  // real resolution is now done inside connectWithFallback via env vars.
  void _connectionUrl;

  const { conn, channel } = await connectWithFallback();

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