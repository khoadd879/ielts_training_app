import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserAnswerDto } from './dto/create-user-answer.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserAnswerService {
  constructor(private readonly databaseService: DatabaseService) {}

  async UpsertCreateUserAnswer(createUserAnswerDto: CreateUserAnswerDto) {
    const {
      idQuestion,
      idUser,
      idOption,
      answerText,
      userAnswerType,
      matching_key,
      matching_value,
      idTestResult,
    } = createUserAnswerDto;
    const existingQuestion = await this.databaseService.question.findUnique({
      where: {
        idQuestion,
      },
    });

    if (!existingQuestion) throw new BadRequestException('Question not found');

    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    const existingTestResult =
      await this.databaseService.userTestResult.findUnique({
        where: { idTestResult },
      });
    if (!existingTestResult)
      throw new BadRequestException('Test result not found');

    const data = await this.databaseService.userAnswer.upsert({
      where: {
        idQuestion_idUser_idTestResult: {
          idQuestion,
          idUser,
          idTestResult: idTestResult,
        },
      },
      update: {
        idOption: idOption ?? null,
        answerText: answerText ?? null,
        userAnswerType,
        matching_key: matching_key ?? null,
        matching_value: matching_value ?? null,
        submitted_at: new Date(),
      },
      create: {
        ...createUserAnswerDto,
        submitted_at: new Date(),
      },
    });

    return {
      message: 'User answer upserted successfully',
      status: 200,
      data: {
        idCauHoi: data.idQuestion,
        idUser: data.idUser,
        idTestResult: data.idTestResult,
        answerText: data.answerText,
        idOption: data.idOption,
        matching_key: data.matching_key,
        matching_value: data.matching_value,
        submitted_at: data.submitted_at,
      },
    };
  }

  async getAnswers(idTestResult: string) {
    const testResult = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
      include: {
        userAnswer: true, // lấy tất cả UserAnswer liên kết
      },
    });

    if (!testResult) throw new BadRequestException('Test result not found');

    return {
      message: 'Fetched answers successfully',
      status: 200,
      data: testResult.userAnswer,
    };
  }
}
