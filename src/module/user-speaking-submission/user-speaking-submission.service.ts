import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateUserSpeakingSubmissionDto } from './dto/create-user-speaking-submission.dto';
import { UpdateUserSpeakingSubmissionDto } from './dto/update-user-speaking-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { RabbitMQService } from 'src/rabbitmq/rabbitmq.service';

@Injectable()
export class UserSpeakingSubmissionService {
  private readonly logger = new Logger(UserSpeakingSubmissionService.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly databaseService: DatabaseService,
    private readonly rabbitMQService: RabbitMQService,
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

    // NOTE: Quota/credit check removed — submissions are free for educational use.

    let audioUrl = createUserSpeakingSubmissionDto.audioUrl;
    const transcript = createUserSpeakingSubmissionDto.transcript || '';

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

    // ✅ UPSERT submission by (idTestResult, idSpeakingTask) — autosave or
    // finishTestSpeaking retry should not create duplicate rows. Mirror of
    // writing's pattern (user-writing-submission.service.ts:68-92). Race
    // window between findFirst and create is acceptable since FE debounces
    // autosave 2s and finishTestSpeaking is single-call per part.
    let submission;
    if (idTestResult) {
      const existing = await this.databaseService.userSpeakingSubmission.findFirst({
        where: { idTestResult, idSpeakingTask },
        select: { idSpeakingSubmission: true },
      });
      submission = existing
        ? await this.databaseService.userSpeakingSubmission.update({
            where: { idSpeakingSubmission: existing.idSpeakingSubmission },
            data: {
              audioUrl,
              transcript: transcript || null,
              aiGradingStatus: 'PENDING',
              aiOverallScore: null,
              aiDetailedFeedback: Prisma.DbNull,
              gradedAt: null,
            },
          })
        : await this.databaseService.userSpeakingSubmission.create({
            data: {
              idUser,
              idSpeakingTask,
              idTestResult,
              audioUrl,
              transcript: transcript || null,
              aiGradingStatus: 'PENDING',
            },
          });
    } else {
      submission = await this.databaseService.userSpeakingSubmission.create({
        data: {
          idUser,
          idSpeakingTask,
          idTestResult: null,
          audioUrl,
          transcript: transcript || null,
          aiGradingStatus: 'PENDING',
        },
      });
    }

    // NOTE: Credit deduction removed — submissions are free for educational use.

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
      paymentMethod: 'free',
      status: 202,
    };
  }

  async findOne(idSpeakingSubmission: string) {
    const submission =
      await this.databaseService.userSpeakingSubmission.findUnique({
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
