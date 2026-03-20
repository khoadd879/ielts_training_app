import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateQuestionGroupDto } from './dto/create-question-group.dto';
import { UpdateQuestionGroupDto } from './dto/update-question-group.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class QuestionGroupService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createQuestionGroup(
    dto: CreateQuestionGroupDto,
    file?: Express.Multer.File,
  ) {
    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart: dto.idPart },
    });
    if (!existingPart) throw new BadRequestException('Part not found');

    let imageUrl = dto.imageUrl;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      imageUrl = uploadResult.secure_url;
    }

    const data = await this.databaseService.questionGroup.create({
      data: {
        idPart: dto.idPart,
        title: dto.title,
        instructions: dto.instructions ?? null,
        questionType: dto.questionType,
        imageUrl: imageUrl ?? null,
        order: dto.order ?? 0,
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return {
      message: 'Question group created successfully',
      data,
      status: 200,
    };
  }

  async findByIdPart(idPart: string) {
    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart },
    });
    if (!existingPart) throw new BadRequestException('Part not found');

    const data = await this.databaseService.questionGroup.findMany({
      where: { idPart },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return {
      message: 'Question groups retrieved successfully',
      data,
      status: 200,
    };
  }

  async findById(idQuestionGroup: string) {
    const data = await this.databaseService.questionGroup.findUnique({
      where: { idQuestionGroup },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { questions: true } },
      },
    });

    if (!data) throw new NotFoundException('Question group not found');

    return {
      message: 'Question group retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateQuestionGroup(
    idQuestionGroup: string,
    dto: UpdateQuestionGroupDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.databaseService.questionGroup.findUnique({
      where: { idQuestionGroup },
    });
    if (!existing) throw new NotFoundException('Question group not found');

    if (dto.idPart) {
      const existingPart = await this.databaseService.part.findUnique({
        where: { idPart: dto.idPart },
      });
      if (!existingPart) throw new BadRequestException('Part not found');
    }

    let imageUrl = dto.imageUrl;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      imageUrl = uploadResult.secure_url;
    }

    const data = await this.databaseService.questionGroup.update({
      where: { idQuestionGroup },
      data: {
        ...(dto.idPart && { idPart: dto.idPart }),
        ...(dto.title && { title: dto.title }),
        ...(dto.instructions !== undefined && {
          instructions: dto.instructions,
        }),
        ...(dto.questionType && { questionType: dto.questionType }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return {
      message: 'Question group updated successfully',
      data,
      status: 200,
    };
  }

  async removeQuestionGroup(idQuestionGroup: string) {
    const existing = await this.databaseService.questionGroup.findUnique({
      where: { idQuestionGroup },
    });
    if (!existing) throw new NotFoundException('Question group not found');

    // Cascade delete handles questions automatically via schema
    await this.databaseService.questionGroup.delete({
      where: { idQuestionGroup },
    });

    return {
      message: 'Question group deleted successfully',
      status: 200,
    };
  }
}
