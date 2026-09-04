import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from './rabbitmq.constants';
import type {
  ModerationForumMessage,
  VocabSuggestMessage,
} from './types';

interface ChatbotReplyMessage {
  sessionId: string;
  userId: string;
  reply: string;
  error?: string;
}

const DEFAULT_FALLBACK_URLS = [
  'amqp://guest:guest@127.0.0.1:5672',
  'amqp://guest:guest@rabbitmq:5672',
];

const PER_URL_RETRIES = 3;
const PER_URL_BACKOFF_MS = [1000, 2000, 4000];

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly chatbotReplyHandlers = new Set<
    (message: ChatbotReplyMessage) => Promise<void> | void
  >();
  private chatbotReplyConsumerStarted = false;
  private reconnecting = false;
  private currentUrl: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const urls = this.resolveCandidateUrls();
    if (urls.length === 0) {
      this.logger.warn('RABBITMQ_URL(S) not configured - RabbitMQ disabled');
      return;
    }
    await this.connectWithFallback(urls);
  }

  async onModuleDestroy() {
    if (this.channel) {
      try {
        await this.channel.close();
      } catch (error) {
        this.logger.warn('Error closing channel:', error);
      }
    }
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (error) {
        this.logger.warn('Error closing connection:', error);
      }
    }
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: object,
  ): Promise<boolean> {
    if (!this.channel) {
      // Give the reconnect path one chance to recover before failing the caller.
      await this.waitForChannel(500);
      if (!this.channel) {
        this.logger.error('RabbitMQ channel not available');
        return false;
      }
    }

    const content = Buffer.from(JSON.stringify(message));
    return this.channel.publish(exchange, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
    });
  }

  async subscribeChatbotReply(
    handler: (message: ChatbotReplyMessage) => Promise<void> | void,
  ): Promise<void> {
    this.chatbotReplyHandlers.add(handler);
    await this.ensureChatbotReplyConsumer();
  }

  async publishGradingWrite(message: object): Promise<boolean> {
    return this.publish(EXCHANGES.GRADING, ROUTING_KEYS.WRITE, message);
  }

  async publishGradingSpeak(message: object): Promise<boolean> {
    return this.publish(EXCHANGES.GRADING, ROUTING_KEYS.SPEAK, message);
  }

  async publishChatbotAsk(message: object): Promise<boolean> {
    return this.publish(EXCHANGES.CHATBOT, ROUTING_KEYS.ASK, message);
  }

  async publishChatbotEmbed(message: object): Promise<boolean> {
    return this.publish(EXCHANGES.CHATBOT, ROUTING_KEYS.EMBED, message);
  }

  async publishModerationForum(
    payload: ModerationForumMessage,
  ): Promise<boolean> {
    return this.publish(
      EXCHANGES.MODERATION,
      ROUTING_KEYS.MODERATION_FORUM,
      payload,
    );
  }

  async publishVocabSuggest(payload: VocabSuggestMessage): Promise<boolean> {
    return this.publish(EXCHANGES.VOCAB, ROUTING_KEYS.VOCAB_SUGGEST, payload);
  }

  /**
   * Build the candidate URL list. RABBITMQ_URLS (comma-separated) takes
   * precedence, then RABBITMQ_URL, then DEFAULT_FALLBACK_URLS. Order is
   * preserved: first URL is tried first.
   */
  private resolveCandidateUrls(): string[] {
    const urlsEnv = this.configService.get<string>('RABBITMQ_URLS');
    if (urlsEnv && urlsEnv.trim().length > 0) {
      return urlsEnv
        .split(',')
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
    }
    const url = this.configService.get<string>('RABBITMQ_URL');
    if (url && url.trim().length > 0) {
      return [url.trim()];
    }
    return [...DEFAULT_FALLBACK_URLS];
  }

  /**
   * Try each URL in order. For each URL, retry PER_URL_RETRIES times with
   * exponential backoff before falling through to the next URL.
   */
  private async connectWithFallback(urls: string[]): Promise<void> {
    const attempts: string[] = [];
    for (const url of urls) {
      for (let attempt = 0; attempt < PER_URL_RETRIES; attempt++) {
        try {
          const conn = await amqp.connect(url);
          this.connection = conn;
          this.currentUrl = url;
          this.channel = await conn.createChannel();
          await this.setupExchanges();
          await this.ensureChatbotReplyConsumer();
          this.attachReconnectHandlers(conn, urls);
          this.logger.log(`Connected to RabbitMQ via ${url}`);
          return;
        } catch (error) {
          attempts.push(`${url} attempt ${attempt + 1}: ${(error as Error).message}`);
          if (attempt < PER_URL_RETRIES - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, PER_URL_BACKOFF_MS[attempt]),
            );
          }
        }
      }
    }
    this.logger.error(
      `Failed to connect to RabbitMQ after ${attempts.length} attempts across ${urls.length} URL(s):`,
      attempts,
    );
  }

  /**
   * On unexpected close/error, kick off a background reconnect that walks
   * the same fallback list. Existing channel reference is cleared so callers
   * see the gap and either retry or surface the failure.
   */
  private attachReconnectHandlers(
    connection: amqp.Connection,
    urls: string[],
  ): void {
    const onClose = async () => {
      this.logger.warn('RabbitMQ connection closed; scheduling reconnect');
      this.connection = null;
      this.channel = null;
      this.chatbotReplyConsumerStarted = false;
      if (this.reconnecting) return;
      this.reconnecting = true;
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.connectWithFallback(urls);
      } finally {
        this.reconnecting = false;
      }
    };
    const onError = (error: unknown) => {
      this.logger.error('RabbitMQ connection error:', error);
    };
    connection.on('close', onClose);
    connection.on('error', onError);
  }

  /**
   * Wait up to `timeoutMs` for the channel to become available again. Used
   * by publish() to give the reconnect path a brief chance to recover before
   * failing the caller.
   */
  private async waitForChannel(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.channel) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private async setupExchanges(): Promise<void> {
    if (!this.channel) {
      return;
    }

    await this.channel.assertExchange(EXCHANGES.GRADING, 'direct', {
      durable: true,
    });
    await this.channel.assertExchange(EXCHANGES.CHATBOT, 'direct', {
      durable: true,
    });
  }

  private async ensureChatbotReplyConsumer(): Promise<void> {
    if (!this.channel) {
      this.logger.warn('RabbitMQ channel not available');
      return;
    }

    if (this.chatbotReplyConsumerStarted) {
      return;
    }

    if (this.chatbotReplyHandlers.size === 0) {
      this.logger.debug(
        'No chatbot reply handlers yet, skipping consumer setup',
      );
      return;
    }

    try {
      await this.channel.assertQueue(QUEUES.CHATBOT_REPLY, { durable: true });
      await this.channel.bindQueue(
        QUEUES.CHATBOT_REPLY,
        EXCHANGES.CHATBOT,
        ROUTING_KEYS.REPLY,
      );

      const channel = this.channel;
      await channel.consume(QUEUES.CHATBOT_REPLY, async (msg) => {
        if (!msg) {
          return;
        }

        try {
          const payload = JSON.parse(
            msg.content.toString(),
          ) as ChatbotReplyMessage;

          this.logger.debug(
            `Received chatbot reply for session: ${payload.sessionId}`,
          );

          for (const handler of this.chatbotReplyHandlers) {
            await handler(payload);
          }

          channel.ack(msg);
        } catch (error) {
          this.logger.error('Failed to process chatbot reply:', error);
          channel.nack(msg, false, false);
        }
      });

      this.chatbotReplyConsumerStarted = true;
      this.logger.log('Chatbot reply consumer started');
    } catch (error) {
      this.logger.error('Failed to start chatbot reply consumer:', error);
    }
  }
}
