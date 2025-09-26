import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateWritingTaskDto } from './dto/create-writing-task.dto';
import { UpdateWritingTaskDto } from './dto/update-writing-task.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class WritingTaskService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createWritingTask(createWritingTaskDto: CreateWritingTaskDto) {
    const { idDe, task_type, prompt, time_limit, word_limit } =
      createWritingTaskDto;

    const existingTest = await this.databaseService.de.findUnique({
      where: {
        idDe,
      },
    });

    if (!existingTest) throw new BadRequestException('Test not found');

    const data = await this.databaseService.writingTask.create({
      data: {
        idDe,
        task_type,
        prompt,
        time_limit,
        word_limit,
      },
    });

    return {
      message: 'Writing task created successfully',
      data,
      status: 200,
    };
  }

  async findAll() {
    const data = await this.databaseService.writingTask.findMany();

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
  ) {
    const { idDe, task_type, prompt, time_limit, word_limit } =
      updateWritingTaskDto;

    const existingTest = await this.databaseService.de.findUnique({
      where: {
        idDe,
      },
    });

    if (!existingTest) throw new BadRequestException('Test not found');

    const data = await this.databaseService.writingTask.update({
      where: {
        idWritingTask,
      },
      data: {
        idDe,
        task_type,
        prompt,
        time_limit,
        word_limit,
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
