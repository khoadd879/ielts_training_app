import { Module } from '@nestjs/common';
import { UserWritingSubmissionService } from './user-writing-submission.service';
import { UserWritingSubmissionController } from './user-writing-submission.controller';
import { DatabaseModule } from 'src/database/database.module';
import { RabbitMQModule } from 'src/rabbitmq/rabbitmq.module';
import { CreditsModule } from 'src/module/credits/credits.module';
import { SubscriptionModule } from 'src/module/subscription/subscription.module';

@Module({
  imports: [
    DatabaseModule,
    RabbitMQModule,
    CreditsModule,
    SubscriptionModule,
  ],
  controllers: [UserWritingSubmissionController],
  providers: [UserWritingSubmissionService],
  exports: [UserWritingSubmissionService],
})
export class UserWritingSubmissionModule {}
