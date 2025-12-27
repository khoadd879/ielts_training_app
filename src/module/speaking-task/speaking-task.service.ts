import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  ) {
    const { idTest, title, part } = createSpeakingTaskDto;

    const existingTest = await this.databaseService.test.findUnique({
      where: {
        idTest,
      },
    });

    if (!existingTest) throw new BadRequestException('Test not found');


    const data = await this.databaseService.speakingTask.create({
      data: {
        idTest,
        title,
        part
      },
    });

    return {
      message: 'Speaking task created successfully',
      data,
      status: 200,
    };
  }

  async findAllSpeakingTaskInTest(idTest: string) {
    const data = await this.databaseService.speakingTask.findMany({where: {idTest}});

    if(!data) throw new NotFoundException('Test not found')

    return {
      message: 'Speaking tasks retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idSpeakingTask: string){
    const data = await this.databaseService.speakingTask.findUnique({where:{idSpeakingTask}})

     if(!data) throw new NotFoundException('Speaking task not found')

    return {
      message: 'Speaking tasks retrieved successfully',
      data,
      status: 200,
    };
  }

  async update(
    idSpeakingTask: string,
    updateSpeakingTaskDto: UpdateSpeakingTaskDto,
  ) {
    const { idTest, title, part} = updateSpeakingTaskDto;

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

    const data = await this.databaseService.speakingTask.update({
      where: {
        idSpeakingTask,
      },
      data: {
        idTest,
        title,
        part
      }
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
