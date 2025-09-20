import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CreateGroupOfQuestionDto } from './dto/create-group-of-question.dto';
import { UpdateGroupOfQuestionDto } from './dto/update-group-of-question.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class GroupOfQuestionsService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createGroupOfQuestions(
    createGroupOfQuestionDto: CreateGroupOfQuestionDto,
  ) {
    const { idDe, idPart, typeQuestion, title, startingOrder, endingOrder } =
      createGroupOfQuestionDto;
    const existingDe = await this.databaseService.de.findUnique({
      where: {
        idDe,
      },
    });

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (!existingDe) throw new BadRequestException('Test not found');
    if (!existingPart) throw new BadRequestException('Part not found');

    const data = await this.databaseService.nhomCauHoi.create({
      data: {
        idDe,
        idPart,
        typeQuestion,
        title,
        startingOrder,
        endingOrder,
      },
    });

    return {
      message: 'Group of question created successfully',
      data,
      status: 200,
    };
  }

  async findByIdPart(idPart: string) {
    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (existingPart) {
      return {
        message: 'Group of question retrieved successfully',
        data: existingPart,
        status: 200,
      };
    } else {
      throw new BadRequestException('Part not found');
    }
  }

  async findById(idGroupOfQuestions: string) {
    const data = await this.databaseService.nhomCauHoi.findMany({
      where: {
        idNhomCauHoi: idGroupOfQuestions,
      },
      include: {
        cauHois: true,
      },
    });

    return {
      message: 'Group of question retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateGroupOfQuestion(
    id: string,
    updateGroupOfQuestionDto: UpdateGroupOfQuestionDto,
  ) {
    const { idDe, idPart, typeQuestion, title, startingOrder, endingOrder } =
      updateGroupOfQuestionDto;
    const existingDe = await this.databaseService.de.findUnique({
      where: {
        idDe,
      },
    });

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (!existingDe) throw new BadRequestException('Test not found');
    if (!existingPart) throw new BadRequestException('Part not found');

    const data = await this.databaseService.nhomCauHoi.update({
      where: {
        idNhomCauHoi: id,
      },
      data: {
        idDe,
        idPart,
        typeQuestion,
        title,
        startingOrder,
        endingOrder,
      },
    });

    return {
      message: 'Group of question updated successfully',
      data,
      status: 200,
    };
  }

  async removeGroupOfQuestions(id: string) {
    const existingGroupOfQuestions =
      await this.databaseService.nhomCauHoi.findUnique({
        where: {
          idNhomCauHoi: id,
        },
      });

    if (!existingGroupOfQuestions)
      throw new BadGatewayException('Group of question not found');

    await this.databaseService.nhomCauHoi.delete({
      where: {
        idNhomCauHoi: id,
      },
    });

    return {
      message: 'Group of question deleted successfully',
      status: 200,
    };
  }
}
