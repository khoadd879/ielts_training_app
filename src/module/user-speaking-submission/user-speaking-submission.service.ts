import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserSpeakingSubmissionDto } from './dto/create-user-speaking-submission.dto';
import { UpdateUserSpeakingSubmissionDto } from './dto/update-user-speaking-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { RabbitMQService } from 'src/rabbitmq/rabbitmq.service';
import { CreditsService } from 'src/module/credits/credits.service';
import { SubscriptionService } from 'src/module/subscription/subscription.service';

@Injectable()
export class UserSpeakingSubmissionService {
  private readonly logger = new Logger(UserSpeakingSubmissionService.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly databaseService: DatabaseService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly creditsService: CreditsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async create(
    createUserSpeakingSubmissionDto: CreateUserSpeakingSubmissionDto,
    file?: Express.Multer.File,
  ) {
    const { idUser, idSpeakingTask, idTestResult } =
      createUserSpeakingSubmissionDto;

    const [user, speakingTask] = await Promise.all([
      this.databaseService.user.findUnique({ where: { idUser } }),
      this.databaseService.speakingTask.findUnique({
        where: { idSpeakingTask },
        include: { questions: true },
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!speakingTask) throw new NotFoundException('Speaking task not found');
    if (idTestResult) {
      const tr = await this.databaseService.userTestResult.findUnique({
        where: { idTestResult, idUser },
      });
      if (!tr) throw new NotFoundException('Test result not found');
    }

    // ===== Payment Priority =====
    // 1. Check subscription quota first (2 credits for speaking - Whisper + LLM)
    const quota = await this.subscriptionService.checkQuota(idUser);

    let usedSubscriptionQuota = false;

    if (!quota.hasQuota) {
      // 2. Fall back to credits balance (2 credits for speaking)
      const SPEAKING_COST = 2;
      const balance = await this.creditsService.getBalance(idUser);
      if (balance.availableCredits < SPEAKING_COST) {
        throw new BadRequestException('Insufficient credits and no active subscription');
      }
      this.logger.log(`User ${idUser} has ${balance.availableCredits} credits available`);
    } else {
      usedSubscriptionQuota = true;
    }

    let audioUrl = createUserSpeakingSubmissionDto.audioUrl;
    let transcript = createUserSpeakingSubmissionDto.transcript || '';

    if (file) {
      const cloudinaryRes = await this.cloudinaryService.uploadFile(file);
      audioUrl = cloudinaryRes.secure_url;
    }

    if (!audioUrl) {
      throw new BadRequestException('Audio is required');
    }

    const currentPart = speakingTask.part;

    const questionsText = speakingTask.questions
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const subs = q.subPrompts ? JSON.stringify(q.subPrompts, null, 2) : '';
        return `Topic: ${q.topic ?? 'N/A'}\nMain Prompt: ${q.prompt}\nSub Prompts: ${subs}`;
      })
      .join('\n\n');

    const submission = await this.databaseService.userSpeakingSubmission.create({
      data: {
        idUser,
        idSpeakingTask,
        audioUrl: audioUrl,
        idTestResult: idTestResult || null,
        transcript: transcript || null,
        aiGradingStatus: 'PENDING',
      },
    });

    // ===== Deduct payment after submission creation =====
    try {
      if (usedSubscriptionQuota) {
        // Use subscription quota (2 credits for speaking)
        await this.subscriptionService.useQuota(idUser, 2);
        this.logger.log(`User ${idUser} using subscription quota for speaking submission ${submission.idSpeakingSubmission}`);
      } else {
        // Deduct credits (2 credits for speaking - Whisper + LLM)
        const SPEAKING_COST = 2;
        await this.creditsService.deductCredit({
          idUser,
          type: 'SPEAKING',
          submissionId: submission.idSpeakingSubmission,
          creditsCost: SPEAKING_COST,
        });
        this.logger.log(`User ${idUser} deducted ${SPEAKING_COST} credits for speaking submission ${submission.idSpeakingSubmission}`);
      }
    } catch (error) {
      // Rollback: delete the submission if payment deduction fails
      await this.databaseService.userSpeakingSubmission.delete({
        where: { idSpeakingSubmission: submission.idSpeakingSubmission },
      }).catch(e => this.logger.error('Failed to rollback submission', e));
      if (error instanceof BadRequestException) {
        throw new BadRequestException('Insufficient credits and no active subscription');
      }
      throw error;
    }

    await this.rabbitMQService.publishGradingSpeak({
      submissionId: submission.idSpeakingSubmission,
      userId: idUser,
      audioUrl: audioUrl,
      transcript: transcript || undefined,
      taskTitle: `${speakingTask.title} - ${currentPart}`,
      questionsText: questionsText,
    });

    return {
      message: 'Submission received and queued for grading',
      data: { id: submission.idSpeakingSubmission },
      paymentMethod: usedSubscriptionQuota ? 'subscription' : 'credits',
      status: 202,
    };
  }

  async findOne(idSpeakingSubmission: string) {
    const submission = await this.databaseService.userSpeakingSubmission.findUnique({
      where: { idSpeakingSubmission },
      include: { speakingTask: { include: { questions: true } } },
    });

    if (!submission) {
      throw new NotFoundException('Speaking submission not found');
    }

    return {
      data: submission,
    };
  }
}
