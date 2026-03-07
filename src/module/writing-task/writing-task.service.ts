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
    const { idTest, taskType, title, timeLimit } = createWritingTaskDto;

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

    // Kiểm tra nếu đã có 1 writing task, task type mới phải khác
    if (numberWritingTasks === 1) {
      const existingWritingTask =
        await this.databaseService.writingTask.findFirst({
          where: { idTest },
          orderBy: { createdAt: 'asc' },
        });

      // Nếu taskType của task mới giống với task cũ thì báo lỗi
      if (existingWritingTask && existingWritingTask.taskType === taskType) {
        throw new BadRequestException(
          `The second writing task must have a different type. First task is ${existingWritingTask.taskType}, cannot create another ${taskType}`,
        );
      }
    }

    const data = await this.databaseService.writingTask.create({
      data: {
        idTest,
        taskType,
        title,
        image: image ?? null,
        timeLimit: Number(timeLimit),
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
    const { idTest, taskType, title, timeLimit } = updateWritingTaskDto;

    const existingWritingTask =
      await this.databaseService.writingTask.findUnique({
        where: {
          idWritingTask,
        },
      });

    if (!existingWritingTask)
      throw new BadRequestException('Writing task not found');

    const existingTest = await this.databaseService.test.findUnique({
      where: {
        idTest,
      },
    });

    if (!existingTest) throw new BadRequestException('Test not found');

    // Kiểm tra nếu taskType thay đổi thì phải khác với task khác trong cùng test
    if (existingWritingTask.taskType !== taskType) {
      // Lấy các writing tasks khác trong cùng test (trừ task đang update)
      const otherWritingTasks = await this.databaseService.writingTask.findMany(
        {
          where: {
            idTest,
            NOT: {
              idWritingTask, // Loại trừ task đang update
            },
          },
        },
      );

      // Kiểm tra xem taskType mới có trùng với task khác không
      const hasSameTaskType = otherWritingTasks.some(
        (task) => task.taskType === taskType,
      );

      if (hasSameTaskType) {
        throw new BadRequestException(
          `Cannot update task type to ${taskType}. Another writing task in this test already has this type`,
        );
      }
    }

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
        taskType,
        title,
        image: image ?? null,
        timeLimit: Number(timeLimit),
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
