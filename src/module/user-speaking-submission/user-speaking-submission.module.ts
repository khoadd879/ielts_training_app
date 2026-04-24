import { Module } from '@nestjs/common';
import { UserSpeakingSubmissionService } from './user-speaking-submission.service';
import { UserSpeakingSubmissionController } from './user-speaking-submission.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { RabbitMQModule } from 'src/rabbitmq/rabbitmq.module';
import { CreditsModule } from 'src/module/credits/credits.module';
import { SubscriptionModule } from 'src/module/subscription/subscription.module';

@Module({
  imports: [
    DatabaseModule,
    CloudinaryModule,
    RabbitMQModule,
    CreditsModule,
    SubscriptionModule,
  ],
  controllers: [UserSpeakingSubmissionController],
  providers: [UserSpeakingSubmissionService],
  exports: [UserSpeakingSubmissionService],
})
export class UserSpeakingSubmissionModule {}
