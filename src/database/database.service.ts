import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
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

    // ✅ Log errors
    this.$on('error' as never, (e: any) => {
      this.logger.error('Database error:', e);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected with optimized pooling');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
