import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserWritingSubmissionDto } from './dto/create-user-writing-submission.dto';
import { UpdateUserWritingSubmissionDto } from './dto/update-user-writing-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { RabbitMQService } from 'src/rabbitmq/rabbitmq.service';

@Injectable()
export class UserWritingSubmissionService {
  private readonly logger = new Logger(UserWritingSubmissionService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  //Tạo submission + publish to queue để AI chấm điểm bất đồng bộ
  async createUserWritingSubmission(
    idTestResult: string,
    createUserWritingSubmissionDto: CreateUserWritingSubmissionDto,
  ) {
    const { idUser, idWritingTask, submissionText } =
      createUserWritingSubmissionDto;

    // ✅ Validate data first
    const [user, writingTask, testResult] = await Promise.all([
      this.databaseService.user.findUnique({ where: { idUser } }),
      this.databaseService.writingTask.findUnique({
        where: { idWritingTask },
        include: { test: true },
      }),
      this.databaseService.userTestResult.findUnique({
        where: { idTestResult },
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!writingTask) throw new NotFoundException('Writing task not found');
    if (!testResult) throw new NotFoundException('Test result not found');

    // Validate image URL format if present
    if (writingTask.image) {
      if (
        !writingTask.image.startsWith('http://') &&
        !writingTask.image.startsWith('https://')
      ) {
        this.logger.warn('⚠️ Image URL is not absolute:', writingTask.image);
        throw new BadRequestException(
          'Image URL must be an absolute URL (http:// or https://). Got: ' +
            writingTask.image,
        );
      }
    }

    // ✅ Create submission with PENDING status
    const submission = await this.databaseService.userWritingSubmission.create({
      data: {
        idUser,
        idWritingTask,
        idTestResult: idTestResult,
        submissionText,
        aiGradingStatus: 'PENDING',
      },
    });

    // ✅ Publish to grading queue for async AI processing
    await this.rabbitMQService.publishGradingWrite({
      submissionId: submission.idWritingSubmission,
      userId: submission.idUser,
      type: writingTask.taskType,
      submissionText,
      prompt: writingTask.title,
      imageUrl: writingTask.image,
    });

    return {
      submissionId: submission.idWritingSubmission,
      aiGradingStatus: 'PENDING',
      status: 202,
    };
  }

  // Lấy toàn bộ submissions theo user
  async findAllByIdUser(idUser: string) {
    const submissions =
      await this.databaseService.userWritingSubmission.findMany({
        where: { idUser },
        orderBy: { submittedAt: 'desc' },
        include: {
          writingTask: {
            select: { title: true, taskType: true },
          },
          testResult: {
            select: {
              bandScore: true,
              idTest: true,
            },
          },
        },
      });

    const data = submissions.map((sub) => ({
      idWritingSubmission: sub.idWritingSubmission,
      taskTitle: sub.writingTask?.title,
      submittedAt: sub.submittedAt,
      aiGradingStatus: sub.aiGradingStatus,
      bandScore: sub.testResult?.bandScore ?? 0,
      generalFeedback: (sub.aiDetailedFeedback as { generalFeedback?: string })?.generalFeedback,
    }));

    return {
      message: 'User writing submissions retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idWritingSubmission: string) {
    const submission =
      await this.databaseService.userWritingSubmission.findUnique({
        where: { idWritingSubmission },
        include: {
          writingTask: true,
          user: { select: { idUser: true, nameUser: true, avatar: true } },
          testResult: {
            select: { bandScore: true },
          },
        },
      });

    if (!submission) throw new BadRequestException('Submission not found');

    return {
      message: 'Details retrieved successfully',
      data: {
        ...submission,
        bandScore: submission.testResult?.bandScore ?? 0,
      },
      status: 200,
    };
  }

  // Cập nhật submission (chấm lại nếu cần)
  async update(
    idWritingSubmission: string,
    updateDto: UpdateUserWritingSubmissionDto,
  ) {
    const submission =
      await this.databaseService.userWritingSubmission.findUnique({
        where: { idWritingSubmission },
        include: {
          writingTask: true,
        },
      });

    if (!submission) throw new BadRequestException('Submission not found');

    if (updateDto.regrade) {
      // ✅ Regrade: publish to grading queue for async AI processing
      await this.rabbitMQService.publishGradingWrite({
        submissionId: submission.idWritingSubmission,
        userId: submission.idUser,
        type: submission.writingTask.taskType,
        submissionText: submission.submissionText,
        prompt: submission.writingTask.title,
        imageUrl: submission.writingTask.image,
      });

      // Update status to PENDING
      const updatedSubmission =
        await this.databaseService.userWritingSubmission.update({
          where: { idWritingSubmission },
          data: {
            aiGradingStatus: 'PENDING',
          },
        });

      return {
        message: 'Regrade queued successfully',
        data: updatedSubmission,
        status: 202,
      };
    }

    const updatedSubmission =
      await this.databaseService.userWritingSubmission.update({
        where: { idWritingSubmission },
        data: { ...updateDto },
      });

    return {
      message: 'Submission updated successfully',
      data: updatedSubmission,
      status: 200,
    };
  }

  // Xóa submission
  async remove(idWritingSubmission: string) {
    const existing =
      await this.databaseService.userWritingSubmission.findUnique({
        where: { idWritingSubmission },
      });
    if (!existing)
      throw new BadRequestException('User writing submission not found');

    await this.databaseService.userWritingSubmission.delete({
      where: { idWritingSubmission },
    });

    return {
      message: 'User writing submission deleted successfully',
      status: 200,
    };
  }
}
