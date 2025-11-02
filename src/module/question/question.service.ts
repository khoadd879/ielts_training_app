import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { DatabaseService } from 'src/database/database.service';
import { AnswerService } from '../answer/answer.service';

@Injectable()
export class QuestionService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createQuestion(createQuestionDto: CreateQuestionDto) {
    const { idGroupOfQuestions, idPart, numberQuestion, content } =
      createQuestionDto;

    const existingGroupOfQuestions =
      await this.databaseService.groupOfQuestions.findUnique({
        where: {
          idGroupOfQuestions,
        },
      });

    if (!existingGroupOfQuestions)
      throw new BadRequestException('Group of questions not found');

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (!existingPart) return new BadRequestException('Part not found');

    const data = await this.databaseService.question.create({
      data: {
        idGroupOfQuestions,
        idPart,
        numberQuestion,
        content,
      },
    });

    return {
      message: 'Question created successfully',
      data,
      status: 200,
    };
  }

  async findByIdGroupOfQuestion(idGroupOfQuestions: string) {
    const existingGroupOfQuestions =
      await this.databaseService.groupOfQuestions.findUnique({
        where: {
          idGroupOfQuestions,
        },
      });

    if (!existingGroupOfQuestions)
      throw new BadRequestException('Group of questions not found');

    const data = await this.databaseService.question.findMany({
      where: {
        idGroupOfQuestions,
      },
      orderBy: {
        numberQuestion: 'asc',
      },
    });

    return {
      message: 'Question retrieved successfully',
      data,
      status: 200,
    };
  }

  async findById(idQuestion: string) {
    const data = await this.databaseService.question.findUnique({
      where: {
        idQuestion,
      },
    });

    return {
      message: 'Question retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateQuestion(
    idQuestion: string,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const { idGroupOfQuestions, idPart, numberQuestion, content } =
      updateQuestionDto;

    const existingGroupOfQuestions =
      await this.databaseService.groupOfQuestions.findUnique({
        where: {
          idGroupOfQuestions,
        },
      });

    if (!existingGroupOfQuestions)
      throw new BadRequestException('Group of questions not found');

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (!existingPart) return new BadRequestException('Part not found');

    const data = await this.databaseService.question.update({
      where: {
        idQuestion,
      },
      data: {
        idGroupOfQuestions,
        idPart,
        numberQuestion,
        content,
      },
    });

    return {
      message: 'Question created successfully',
      data,
      status: 200,
    };
  }

  async removeQuestion(idQuestion: string) {
    const existingQuestion = await this.databaseService.question.findUnique({
      where: {
        idQuestion,
      },
    });

    if (!existingQuestion) {
      throw new BadRequestException('Question not found');
    } else {
      await this.databaseService.$transaction([
        this.databaseService.option.deleteMany({
          where: {
            idQuestion,
          },
        }),
        this.databaseService.question.delete({ where: { idQuestion } }),
      ]);
    }
    return {
      message: 'Question deleted successfully',
      status: 200,
    };
  }
}
