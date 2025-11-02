import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSpeakingTaskDto } from './dto/create-speaking-task.dto';
import { UpdateSpeakingTaskDto } from './dto/update-speaking-task.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class SpeakingTaskService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createSpeakingTaskDto: CreateSpeakingTaskDto,
    file?: Express.Multer.File,
  ) {
    const { idTest, title, audioPromptUrl } = createSpeakingTaskDto;

    const existingTest = await this.databaseService.test.findUnique({
      where: {
        idTest,
      },
    });

    if (!existingTest) throw new BadRequestException('Test not found');

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      createSpeakingTaskDto.audioPromptUrl = uploadResult.secure_url;
    }

    const data = await this.databaseService.speakingTask.create({
      data: {
        idTest,
        title,
        audioPromptUrl: createSpeakingTaskDto.audioPromptUrl ?? null,
      },
    });

    return {
      message: 'Speaking task created successfully',
      data,
      status: 200,
    };
  }

  async findAll() {
    const data = await this.databaseService.speakingTask.findMany();

    return {
      message: 'Speaking tasks retrieved successfully',
      data,
      status: 200,
    };
  }

  async update(
    idSpeakingTask: string,
    updateSpeakingTaskDto: UpdateSpeakingTaskDto,
    file?: Express.Multer.File,
  ) {
    const { idTest, title, audioPromptUrl } = updateSpeakingTaskDto;

    const existingTest = await this.databaseService.test.findUnique({
      where: {
        idTest,
      },
    });

    if (!existingTest) throw new BadRequestException('Test not found');

    const existingSpeakingTask =
      await this.databaseService.speakingTask.findUnique({
        where: {
          idSpeakingTask,
        },
      });

    if (!existingSpeakingTask)
      throw new BadRequestException('Speaking task not found');

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      updateSpeakingTaskDto.audioPromptUrl = uploadResult.secure_url;
    }

    const data = await this.databaseService.speakingTask.update({
      where: {
        idSpeakingTask,
      },
      data: {
        idTest,
        title,
        audioPromptUrl:
          updateSpeakingTaskDto.audioPromptUrl ??
          existingSpeakingTask.audioPromptUrl,
      },
    });

    return {
      message: 'Speaking task updated successfully',
      data,
      status: 200,
    };
  }

  async remove(id: string) {
    const existingSpeakingTask =
      await this.databaseService.speakingTask.findUnique({
        where: {
          idSpeakingTask: id,
        },
      });

    if (!existingSpeakingTask)
      throw new BadRequestException('Speaking task not found');

    await this.databaseService.speakingTask.delete({
      where: {
        idSpeakingTask: id,
      },
    });

    return {
      message: 'Speaking task removed successfully',
      status: 200,
    };
  }
}
