import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateWritingTaskDto } from './dto/create-writing-task.dto';
import { UpdateWritingTaskDto } from './dto/update-writing-task.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class WritingTaskService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async createWritingTask(
    createWritingTaskDto: CreateWritingTaskDto,
    file?: Express.Multer.File,
  ) {
    const { idTest, task_type, title, time_limit } = createWritingTaskDto;

    const existingTest = await this.databaseService.test.findUnique({
      where: {
        idTest,
      },
    });

    if (!existingTest) throw new BadRequestException('Test not found');

    const numberWritingTasks = await this.databaseService.writingTask.count({
      where: { idTest },
    });

    if (existingTest.numberQuestion < numberWritingTasks + 1) {
      throw new BadRequestException(
        'Cannot add more writing tasks than the number of questions in the test',
      );
    } else if (numberWritingTasks >= 2) {
      throw new BadRequestException(
        'A test can have a maximum of 2 writing tasks',
      );
    }

    let image = createWritingTaskDto.image;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      image = uploadResult.secure_url;
    }

    const data = await this.databaseService.writingTask.create({
      data: {
        idTest,
        task_type,
        title,
        image: image ?? null,
        time_limit: Number(time_limit),
      },
    });

    return {
      message: 'Writing task created successfully',
      data,
      status: 200,
    };
  }

  async findAll(idTest: string) {
    const existingTest = await this.databaseService.test.findUnique({
      where: {
        idTest,
      },
    });

    if (!existingTest) throw new BadRequestException('Test not found');

    const data = await this.databaseService.writingTask.findMany({
      where: {
        idTest,
      },
    });

    return {
      message: 'Writing task retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idWritingTask: string) {
    const data = await this.databaseService.writingTask.findUnique({
      where: {
        idWritingTask,
      },
    });

    return {
      message: 'Writing task retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateWritingTask(
    idWritingTask: string,
    updateWritingTaskDto: UpdateWritingTaskDto,
    file?: Express.Multer.File,
  ) {
    const { idTest, task_type, title, time_limit } = updateWritingTaskDto;

    const existingTest = await this.databaseService.test.findUnique({
      where: {
        idTest,
      },
    });

    if (!existingTest) throw new BadRequestException('Test not found');

    let image = updateWritingTaskDto.image;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      image = uploadResult.secure_url;
    }

    const data = await this.databaseService.writingTask.update({
      where: {
        idWritingTask,
      },
      data: {
        idTest,
        task_type,
        title,
        image: image ?? null,
        time_limit: Number(time_limit),
      },
    });

    return {
      message: 'Writing task updated successfully',
      data,
      status: 200,
    };
  }

  async remove(idWritingTask: string) {
    const existingWritingTask =
      await this.databaseService.writingTask.findUnique({
        where: {
          idWritingTask,
        },
      });

    if (!existingWritingTask)
      throw new BadRequestException('Writing task not found');
    await this.databaseService.$transaction([
      this.databaseService.userWritingSubmission.deleteMany({
        where: {
          idWritingTask,
        },
      }),
      this.databaseService.writingTask.delete({
        where: {
          idWritingTask,
        },
      }),
    ]);
    return {
      message: 'Writing task deleted successfully',
      status: 200,
    };
  }
}
