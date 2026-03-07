import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateManyUserAnswerDto } from './dto/create-many-user-answer.dto';

@Injectable()
export class UserAnswerService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createManyUserAnswers(
    idUser: string,
    idTestResult: string,
    dto: CreateManyUserAnswerDto,
  ) {
    const testResult = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
    });
    if (!testResult) throw new NotFoundException('Test result not found');

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new NotFoundException('User not found');

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
      message: 'All answers submitted successfully',
      count: result.length,
      data: result,
      status: 200,
    };
  }
}
