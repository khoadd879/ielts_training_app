import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateManyUserAnswerDto } from './dto/create-many-user-answer.dto';

/**
 * UserAnswerService — chỉ phục vụ mục đích LƯU NHÁP (save-progress)
 * khi thí sinh đang làm bài. Luồng chấm điểm chính nằm ở
 * UserTestResultService.submitReadingListeningTest().
 */
@Injectable()
export class UserAnswerService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Lưu hoặc cập nhật câu trả lời nháp (mid-test save-progress).
   * Dùng upsert để không tạo trùng nếu user trả lời lại cùng 1 câu.
   */
  async saveProgress(
    idUser: string,
    idTestResult: string,
    dto: CreateManyUserAnswerDto,
  ) {
    const testResult = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
    });
    if (!testResult) throw new NotFoundException('Test result not found');
    if (testResult.idUser !== idUser) {
      throw new BadRequestException('You do not own this test result');
    }
    if (testResult.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This test has already been submitted');
    }

    const { answers } = dto;
    if (!answers || answers.length === 0) {
      throw new BadRequestException('Answer list is empty');
    }

    const result = await this.databaseService.$transaction(
      answers.map((answer) =>
        this.databaseService.userAnswer.upsert({
          where: {
            idQuestion_idUser_idTestResult: {
              idQuestion: answer.idQuestion,
              idUser,
              idTestResult,
            },
          },
          update: {
            answerType: answer.answerType,
            answerPayload: answer.answerPayload,
            submittedAt: new Date(),
          },
          create: {
            idUser,
            idTestResult,
            idQuestion: answer.idQuestion,
            answerType: answer.answerType,
            answerPayload: answer.answerPayload,
            submittedAt: new Date(),
          },
        }),
      ),
    );

    return {
      message: 'Progress saved successfully',
      count: result.length,
      status: 200,
    };
  }
}
