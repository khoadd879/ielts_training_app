import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CreateGroupOfQuestionDto } from './dto/create-group-of-question.dto';
import { UpdateGroupOfQuestionDto } from './dto/update-group-of-question.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class GroupOfQuestionsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async createGroupOfQuestions(
    createGroupOfQuestionDto: CreateGroupOfQuestionDto,
    file?: Express.Multer.File,
  ) {
    const { idTest, idPart, typeQuestion, title, quantity, img } =
      createGroupOfQuestionDto;
    const existingDe = await this.databaseService.test.findUnique({
      where: {
        idTest,
      },
    });

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (!existingDe) throw new BadRequestException('Test not found');
    if (!existingPart) throw new BadRequestException('Part not found');

    let imgUrl = img;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      imgUrl = uploadResult.secure_url;
    }

    // kiểm tra quantity không lớn hơn số câu của test và không quá 40
    if (quantity > existingDe.numberQuestion)
      throw new BadRequestException(
        'Quantity cant be greater than  numberQuestion test ',
      );

    if (quantity > 40)
      throw new BadRequestException('The maximum numberQuestion is 40');

    // kiểm tra tổng quantity các nhóm hiện có trong test (đã sử dụng) + quantity mới không vượt quá số câu của test
    const sumResult = await this.databaseService.groupOfQuestions.aggregate({
      _sum: { quantity: true },
      where: { idTest },
    });
    const existingTotal = sumResult._sum.quantity ?? 0;
    if (existingTotal + quantity > existingDe.numberQuestion)
      throw new BadRequestException(
        'Sum of questions cant be greater than numberQuestion test',
      );

    const data = await this.databaseService.groupOfQuestions.create({
      data: {
        idTest,
        idPart,
        typeQuestion,
        title,
        quantity,
        img: imgUrl,
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
        groupOfQuestions: true,
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
    const data = await this.databaseService.groupOfQuestions.findMany({
      where: {
        idGroupOfQuestions: idGroupOfQuestions,
      },
      include: {
        question: true,
      },
    });

    return {
      message: 'Group of question retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateGroupOfQuestion(
    idGroupOfQuestions: string,
    updateGroupOfQuestionDto: UpdateGroupOfQuestionDto,
    file?: Express.Multer.File,
  ) {
    const { idTest, idPart, typeQuestion, title, quantity, img } =
      updateGroupOfQuestionDto;
    const existingDe = await this.databaseService.test.findUnique({
      where: {
        idTest,
      },
    });

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (!existingDe) throw new BadRequestException('Test not found');
    if (!existingPart) throw new BadRequestException('Part not found');

    // kiểm tra quantity không lớn hơn số câu của test và không quá 40
    if (quantity > existingDe.numberQuestion)
      throw new BadRequestException(
        'Quantity cant be greater than  numberQuestion test ',
      );

    if (quantity > 40)
      throw new BadRequestException('The maximum numberQuestion is 40');

    let imgUrl = img;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      imgUrl = uploadResult.secure_url;
    }

    // kiểm tra tổng quantity các nhóm hiện có trong test (đã sử dụng) + quantity mới không vượt quá số câu của test
    const sumResult = await this.databaseService.groupOfQuestions.aggregate({
      _sum: { quantity: true },
      where: { idTest },
    });
    const existingTotal = sumResult._sum.quantity ?? 0;
    if (existingTotal + quantity > existingDe.numberQuestion)
      throw new BadRequestException(
        'Sum of questions cant be greater than numberQuestion test',
      );

    const data = await this.databaseService.groupOfQuestions.update({
      where: {
        idGroupOfQuestions,
      },
      data: {
        idTest,
        idPart,
        typeQuestion,
        title,
        quantity,
        img: imgUrl,
      },
    });

    return {
      message: 'Group of question updated successfully',
      data,
      status: 200,
    };
  }

  async removeGroupOfQuestions(idGroupOfQuestions: string) {
    const existingGroupOfQuestions =
      await this.databaseService.groupOfQuestions.findUnique({
        where: {
          idGroupOfQuestions,
        },
      });

    if (!existingGroupOfQuestions)
      throw new BadGatewayException('Group of question not found');

    await this.databaseService.$transaction([
      this.databaseService.question.deleteMany({
        where: {
          idGroupOfQuestions,
        },
      }),
      this.databaseService.groupOfQuestions.delete({
        where: { idGroupOfQuestions },
      }),
    ]);

    return {
      message: 'Group of question deleted successfully',
      status: 200,
    };
  }
}
