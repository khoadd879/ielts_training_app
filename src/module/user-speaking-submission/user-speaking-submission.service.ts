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

    await this.rabbitMQService.publishGradingSpeak({
      submissionId: submission.idUserSpeakingSubmission,
      userId: idUser,
      audioUrl: audioUrl,
      transcript: transcript || undefined,
      taskTitle: `${speakingTask.title} - ${currentPart}`,
      questionsText: questionsText,
    });

    return {
      message: 'Submission received and queued for grading',
      data: { id: submission.idUserSpeakingSubmission },
      status: 202,
    };
  }
}
