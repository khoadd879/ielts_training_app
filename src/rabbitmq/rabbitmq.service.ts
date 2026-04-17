import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EXCHANGES, ROUTING_KEYS } from './rabbitmq.constants';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

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
}
