import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.$on('query' as never, (e: any) => {
      if (e.duration > 1000) {
        this.logger.warn(
          ` Slow query detected (${e.duration}ms): ${e.query.substring(0, 100)}...`,
        );
      }
    });

    this.$on('error' as never, (e: any) => {
      this.logger.error('Database error:', e);
    });
  }

  async onModuleInit() {
    await this.connectWithRetry(5, 3000);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Connect with retry logic for handling transient connection failures
   */
  private async connectWithRetry(
    maxRetries: number,
    delayMs: number,
  ): Promise<void> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected successfully');
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Database connection attempt ${attempt}/${maxRetries} failed: ${lastError.message}`,
        );

        if (attempt < maxRetries) {
          const backoff = delayMs * Math.pow(1.5, attempt - 1);
          this.logger.log(`Retrying in ${backoff}ms...`);
          await this.sleep(backoff);
        }
      }
    }

    this.logger.error(
      `Failed to connect to database after ${maxRetries} attempts`,
    );
    throw lastError!;
  }

  /**
   * Ensure connection is healthy, reconnect if needed
   */
  async ensureConnection(): Promise<void> {
    try {
      await this.$executeRaw`SELECT 1`;
    } catch (error) {
      this.logger.warn('Connection check failed, reconnecting...');
      await this.$disconnect();
      await this.$connect();
      this.logger.log('Database reconnected successfully');
    }
  }

  /**
   * Execute transaction with automatic reconnection on connection closed errors
   */
  async $transactionWithRetry<T>(
    fn: (prisma: this) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T> {
    try {
      return await this.$transaction(fn as any, options);
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const isConnectionClosed =
        errorMessage.includes('Closed') ||
        errorMessage.includes('Connection terminated') ||
        errorMessage.includes('Connection refused');

      if (isConnectionClosed) {
        this.logger.warn(
          'Transaction failed due to closed connection, retrying...',
        );
        await this.$disconnect();
        await this.$connect();
        return this.$transaction(fn as any, options);
      }

      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
