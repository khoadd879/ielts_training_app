import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from './rabbitmq.constants';

interface ChatbotReplyMessage {
  sessionId: string;
  userId: string;
  reply: string;
  error?: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly chatbotReplyHandlers = new Set<
    (message: ChatbotReplyMessage) => Promise<void> | void
  >();
  private chatbotReplyConsumerStarted = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL not configured - RabbitMQ disabled');
      return;
    }

    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.setupExchanges();
      await this.ensureChatbotReplyConsumer();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
    }
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: object,
  ): Promise<boolean> {
    if (!this.channel) {
      this.logger.error('RabbitMQ channel not available');
      return false;
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
      this.logger.debug('No chatbot reply handlers yet, skipping consumer setup');
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

          this.logger.debug(`Received chatbot reply for session: ${payload.sessionId}`);

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
