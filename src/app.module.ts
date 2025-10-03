import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './module/users/users.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/passport/jwt-auth.guard';
import { MailerModule } from '@nestjs-modules/mailer';
import { VocabularyModule } from './module/vocabulary/vocabulary.module';

import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { TestModule } from './module/test/test.module';
import { TopicModule } from './module/topic/topic.module';
import { PartModule } from './module/part/part.module';
import { PassageModule } from './module/passage/passage.module';
import { GroupOfQuestionsModule } from './module/group-of-questions/group-of-questions.module';
import { QuestionModule } from './module/question/question.module';
import { OptionModule } from './module/option/option.module';

import { AnswerModule } from './module/answer/answer.module';
import { UserAnswerModule } from './module/user-answer/user-answer.module';
import { UserTestResultModule } from './module/user-test-result/user-test-result.module';
import { CacheModule } from '@nestjs/cache-manager';
import { WritingTaskModule } from './module/writing-task/writing-task.module';
import { UserWritingSubmissionModule } from './module/user-writing-submission/user-writing-submission.module';
import { GeminiModule } from './gemini/gemini.module';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    VocabularyModule,
    CloudinaryModule,
    TestModule,
    TopicModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          // ignoreTLS: true,
          //secure: true,
          auth: {
            user: configService.get<string>('MAILER_USER'), // generated ethereal user
            pass: configService.get<string>('MAILER_PASSWORD'), // generated ethereal password
          },
        },
        defaults: {
          from: '"No Reply" <no-reply@localhost>',
        },
        // preview: true,
        // template: {
        //   dir: process.cwd() + '/template/',
        //   adapter: new HandlebarsAdapter(), // or new PugAdapter() or new EjsAdapter()
        //   options: {
        //     strict: true,
        //   },
        // },
      }),
      inject: [ConfigService],
    }),
    PartModule,
    PassageModule,
    GroupOfQuestionsModule,
    QuestionModule,
    OptionModule,
    AnswerModule,
    UserAnswerModule,
    UserTestResultModule,
    CacheModule.register(),
    WritingTaskModule,
    UserWritingSubmissionModule,
    GeminiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
