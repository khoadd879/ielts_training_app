import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { DatabaseService } from 'src/database/database.service';
import { timeStamp } from 'console';

@Injectable()
export class AnswerService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createAnswer(createAnswerDto: CreateAnswerDto) {
    const { idCauHoi, idOption, answer_text, matching_key, matching_value } =
      createAnswerDto;
    const existingQuestion = await this.databaseService.cauHoi.findUnique({
      where: {
        idCauHoi,
      },
    });

    if (!existingQuestion) throw new BadRequestException('Question not found');

    const data = await this.databaseService.answer.create({
      data: {
        idCauHoi,
        idOption: idOption ? idOption : null,
        answer_text: answer_text ? answer_text : null,
        matching_key: matching_key ? matching_key : null,
        matching_value: matching_value ? matching_value : null,
      },
    });

    return {
      message: 'Answer created successfully',
      data,
      status: 200,
    };
  }

  async findByIdQuestion(idQuestion: string) {
    const existingQuestion = await this.databaseService.cauHoi.findUnique({
      where: {
        idCauHoi: idQuestion,
      },
    });

    if (!existingQuestion) throw new BadRequestException('Question not found');

    const data = await this.databaseService.answer.findMany({
      where: {
        idCauHoi: idQuestion,
      },
    });

    return {
      message: 'Answer retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idAnswer: string) {
    const data = await this.databaseService.answer.findUnique({
      where: {
        idAnswer,
      },
    });

    return {
      message: 'Answer retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateAnswer(idAnswer: string, updateAnswerDto: UpdateAnswerDto) {
    const { idCauHoi, idOption, answer_text, matching_key, matching_value } =
      updateAnswerDto;
    const existingQuestion = await this.databaseService.cauHoi.findUnique({
      where: {
        idCauHoi,
      },
    });

    const existingAnswer = await this.databaseService.answer.findUnique({
      where: {
        idAnswer,
      },
    });

    if (!existingAnswer) {
      throw new BadRequestException('Answer not found');
    }

    if (!existingQuestion) throw new BadRequestException('Question not found');

    const data = await this.databaseService.answer.update({
      where: {
        idAnswer,
      },
      data: {
        idCauHoi,
        idOption: idOption ? idOption : null,
        answer_text: answer_text ? answer_text : null,
        matching_key: matching_key ? matching_key : null,
        matching_value: matching_value ? matching_value : null,
      },
    });

    return {
      message: 'Answer created successfully',
      data,
      status: 200,
    };
  }

  async removeAnswer(idAnswer: string) {
    const existingAnswer = await this.databaseService.answer.findUnique({
      where: {
        idAnswer,
      },
    });

    if (!existingAnswer) throw new BadRequestException('Answer not found');

    await this.databaseService.answer.delete({
      where: {
        idAnswer,
      },
    });

    return {
      message: 'Answer deleted successfully',
      status: 200,
    };
  }
}
