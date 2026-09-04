import 'dotenv/config';
import 'dotenv/config';
import { connect } from 'amqplib';

const EXCHANGES = {
  MODERATION: 'moderation.exchange',
  VOCAB: 'vocab.exchange',
} as const;

const QUEUES = {
  MODERATION_FORUM: 'moderation.forum',
  VOCAB_SUGGEST: 'vocab.suggest',
} as const;

const ROUTING_KEYS = {
  MODERATION_FORUM: 'moderation.forum',
  VOCAB_SUGGEST: 'vocab.suggest',
  FAILED: 'failed',
} as const;

import { handleModerationForum } from './handlers/forum.handler';
import { handleVocabSuggest } from './handlers/vocab.handler';
import { ensureRedis } from './redis.client';

const RABBITMQ_URL = process.env.RABBITMQ_URL!;

async function main() {
  await ensureRedis();

  const conn = await connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.prefetch(4);

  await ch.assertExchange(EXCHANGES.MODERATION, 'direct', { durable: true });
  await ch.assertExchange(EXCHANGES.VOCAB, 'direct', { durable: true });
  await ch.assertQueue(QUEUES.MODERATION_FORUM, {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: ROUTING_KEYS.FAILED,
  });
  await ch.assertQueue(QUEUES.VOCAB_SUGGEST, {
    durable: true,
    deadLetterExchange: 'dlx.exchange',
    deadLetterRoutingKey: ROUTING_KEYS.FAILED,
  });
  ch.bindQueue(QUEUES.MODERATION_FORUM, EXCHANGES.MODERATION, ROUTING_KEYS.MODERATION_FORUM);
  ch.bindQueue(QUEUES.VOCAB_SUGGEST, EXCHANGES.VOCAB, ROUTING_KEYS.VOCAB_SUGGEST);

  ch.consume(QUEUES.MODERATION_FORUM, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handleModerationForum(payload);
      ch.ack(msg);
    } catch (err) {
      console.error('moderation.forum failed:', err);
      ch.nack(msg, false, false);
    }
  });

  ch.consume(QUEUES.VOCAB_SUGGEST, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handleVocabSuggest(payload);
      ch.ack(msg);
    } catch (err) {
      console.error('vocab.suggest failed:', err);
      ch.nack(msg, false, false);
    }
  });

  console.log('Moderation worker started, consuming 2 queues');
}

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
