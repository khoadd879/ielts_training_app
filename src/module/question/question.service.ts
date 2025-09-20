import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class QuestionService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createQuestion(createQuestionDto: CreateQuestionDto) {
    const { idGroupOfQuestions, idPart, numberQuestion, content } =
      createQuestionDto;

    const existingGroupOfQuestions =
      await this.databaseService.nhomCauHoi.findUnique({
        where: {
          idNhomCauHoi: idGroupOfQuestions,
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

    const data = await this.databaseService.cauHoi.create({
      data: {
        idNhomCauHoi: idGroupOfQuestions,
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
      await this.databaseService.nhomCauHoi.findUnique({
        where: {
          idNhomCauHoi: idGroupOfQuestions,
        },
      });

    if (!existingGroupOfQuestions)
      throw new BadRequestException('Group of questions not found');

    const data = await this.databaseService.cauHoi.findMany({
      where: {
        idNhomCauHoi: idGroupOfQuestions,
      },
    });

    return {
      message: 'Question retrieved successfully',
      data,
      status: 200,
    };
  }

  async findById(idQuestion: string) {
    const data = await this.databaseService.cauHoi.findUnique({
      where: {
        idCauHoi: idQuestion,
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
      await this.databaseService.nhomCauHoi.findUnique({
        where: {
          idNhomCauHoi: idGroupOfQuestions,
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

    const data = await this.databaseService.cauHoi.update({
      where: {
        idCauHoi: idQuestion,
      },
      data: {
        idNhomCauHoi: idGroupOfQuestions,
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
    const existingQuestion = await this.databaseService.cauHoi.findUnique({
      where: {
        idCauHoi: idQuestion,
      },
    });

    if (!existingQuestion) {
      throw new BadRequestException('Question not found');
    } else {
      await this.databaseService.cauHoi.delete({
        where: {
          idCauHoi: idQuestion,
        },
      });
    }
    return {
      message: 'Question deleted successfully',
      status: 200,
    };
  }
}
