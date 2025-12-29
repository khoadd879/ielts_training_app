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
  ) { }
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

    // ✅ NEW: Validate using actual question count, not hardcoded quantity
    // Get actual question count for all groups in this test
    const existingGroups = await this.databaseService.groupOfQuestions.findMany({
      where: { idTest },
      include: {
        _count: {
          select: { question: true },
        },
      },
    });

    const existingTotal = existingGroups.reduce(
      (sum, g) => sum + g._count.question,
      0,
    );

    if (existingTotal + quantity > existingDe.numberQuestion) {
      throw new BadRequestException(
        `Cannot create group. Current questions: ${existingTotal}, trying to add: ${quantity}, test limit: ${existingDe.numberQuestion}`,
      );
    }

    const data = await this.databaseService.groupOfQuestions.create({
      data: {
        idTest,
        idPart,
        typeQuestion,
        title,
        quantity,
        img: imgUrl,
      },
      include: {
        _count: {
          select: { question: true },
        },
      },
    });

    return {
      message: 'Group of question created successfully',
      data: {
        ...data,
        actualQuestionCount: data._count.question,
      },
      status: 200,
    };
  }

  async findByIdPart(idPart: string) {
    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
      include: {
        groupOfQuestions: {
          include: {
            _count: {
              select: { question: true },
            },
          },
        },
      },
    });

    if (existingPart) {
      // Add actualQuestionCount to each group
      const enhancedGroups = existingPart.groupOfQuestions.map((group) => ({
        ...group,
        actualQuestionCount: group._count.question,
      }));

      return {
        message: 'Group of question retrieved successfully',
        data: {
          ...existingPart,
          groupOfQuestions: enhancedGroups,
        },
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
        _count: {
          select: { question: true },
        },
      },
    });

    // Add actualQuestionCount to response
    const enhancedData = data.map((group) => ({
      ...group,
      actualQuestionCount: group._count.question,
    }));

    return {
      message: 'Group of question retrieved successfully',
      data: enhancedData,
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

    // ✅ NEW: Validate using actual question count for UPDATE
    // Get current group to exclude from total count
    const currentGroup = await this.databaseService.groupOfQuestions.findUnique({
      where: { idGroupOfQuestions },
      include: {
        _count: {
          select: { question: true },
        },
      },
    });

    if (!currentGroup) {
      throw new BadRequestException('Group of questions not found');
    }

    // Get all other groups' actual question counts
    const existingGroups = await this.databaseService.groupOfQuestions.findMany({
      where: {
        idTest,
        idGroupOfQuestions: { not: idGroupOfQuestions }, // Exclude current group
      },
      include: {
        _count: {
          select: { question: true },
        },
      },
    });

    const otherGroupsTotal = existingGroups.reduce(
      (sum, g) => sum + g._count.question,
      0,
    );

    // Check if new quantity + other groups' actual count exceeds test limit
    if (otherGroupsTotal + quantity > existingDe.numberQuestion) {
      throw new BadRequestException(
        `Cannot update. Other groups have ${otherGroupsTotal} questions, trying to set this group to ${quantity}, test limit: ${existingDe.numberQuestion}`,
      );
    }

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
      include: {
        _count: {
          select: { question: true },
        },
      },
    });

    return {
      message: 'Group of question updated successfully',
      data: {
        ...data,
        actualQuestionCount: data._count.question,
      },
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
