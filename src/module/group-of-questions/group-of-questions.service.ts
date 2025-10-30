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

    if (startingOrder > endingOrder)
      throw new BadRequestException(
        'startingOrder must be less than or equal to endingOrder',
      );

    const previousEndingOrder = await this.databaseService.nhomCauHoi.findFirst(
      {
        where: { idPart },
        orderBy: { endingOrder: 'desc' },
        take: 1,
      },
    );

    if (
      previousEndingOrder &&
      startingOrder <= previousEndingOrder.endingOrder
    ) {
      throw new BadRequestException(
        `startingOrder must be greater than previous endingOrder (${previousEndingOrder.endingOrder})`,
      );
    }

    if (
      previousEndingOrder &&
      previousEndingOrder.endingOrder == existingDe.numberQuestion
    ) {
      throw new BadRequestException(
        `Can't create more questions because you have reached the limit of questions : (${existingDe.numberQuestion})`,
      );
    }

    if (endingOrder >= existingDe.numberQuestion) {
      throw new BadRequestException(
        `endingOrder must be smaller or equal to numberQuestion of Test: (${existingDe.numberQuestion})`,
      );
    }

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
      include: {
        nhomCauHois: true,
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

    if (startingOrder > endingOrder)
      throw new BadRequestException(
        'startingOrder must be less than or equal to endingOrder',
      );

    const overlapping = await this.databaseService.nhomCauHoi.findFirst({
      where: {
        idPart,
        //lọc ra phần không phải id của nhóm câu hỏi đang update
        NOT: { idNhomCauHoi: id },
        AND: [
          //startingOrder <= other.endingOrder
          { startingOrder: { lte: endingOrder } },
          // endingOrder >= other.startingOrder
          { endingOrder: { gte: startingOrder } },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        `Order range overlaps with existing group (id: ${overlapping.idNhomCauHoi}, ${overlapping.startingOrder}-${overlapping.endingOrder})`,
      );
    }

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

    await this.databaseService.$transaction([
      this.databaseService.cauHoi.deleteMany({
        where: {
          idNhomCauHoi: id,
        },
      }),
      this.databaseService.nhomCauHoi.delete({ where: { idNhomCauHoi: id } }),
    ]);

    return {
      message: 'Group of question deleted successfully',
      status: 200,
    };
  }
}
