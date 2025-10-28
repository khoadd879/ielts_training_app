import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSpeakingQuestionDto } from './dto/create-speaking-question.dto';
import { UpdateSpeakingQuestionDto } from './dto/update-speaking-question.dto';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SpeakingQuestionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createSpeakingQuestionDto: CreateSpeakingQuestionDto) {
    const {
      idSpeakingTask,
      part,
      topic,
      prompt,
      subPrompts,
      preparationTime,
      speakingTime,
      order,
    } = createSpeakingQuestionDto;

    const existingSpeakingTask =
      await this.databaseService.speakingTask.findUnique({
        where: {
          idSpeakingTask,
        },
      });

    if (!existingSpeakingTask) {
      throw new BadRequestException('Speaking task not found');
    }

    const parsedSubPrompts =
      typeof subPrompts === 'string'
        ? JSON.parse(subPrompts)
        : (subPrompts ?? null);

    const data = await this.databaseService.speakingQuestion.create({
      data: {
        idSpeakingTask,
        part,
        topic: topic ?? prompt,
        prompt: prompt ?? null,
        subPrompts: parsedSubPrompts,
        preparationTime: preparationTime ?? 0,
        speakingTime: speakingTime ?? 120,
        order,
      },
    });

    return {
      message: 'Speaking question created successfully',
      data,
      status: 200,
    };
  }

  async findAllbyIdSpeakingTask(idSpeakingTask: string) {
    const existingSpeakingTask =
      await this.databaseService.speakingTask.findUnique({
        where: {
          idSpeakingTask,
        },
      });

    if (!existingSpeakingTask) {
      throw new BadRequestException('Speaking task not found');
    }

    const data = await this.databaseService.speakingQuestion.findMany({
      where: {
        idSpeakingTask,
      },
    });
    return {
      message: 'Speaking questions retrieved successfully',
      data,
      status: 200,
    };
  }

  async update(
    id: string,
    updateSpeakingQuestionDto: UpdateSpeakingQuestionDto,
  ) {
    const existingSpeakingQuestion =
      await this.databaseService.speakingQuestion.findUnique({
        where: {
          idSpeakingQuestion: id,
        },
      });

    if (!existingSpeakingQuestion) {
      throw new BadRequestException('Speaking question not found');
    }

    const parsedSubPrompts =
      typeof updateSpeakingQuestionDto.subPrompts === 'string'
        ? JSON.parse(updateSpeakingQuestionDto.subPrompts)
        : (updateSpeakingQuestionDto.subPrompts ?? null);

    const data = await this.databaseService.speakingQuestion.update({
      where: { idSpeakingQuestion: id },
      data: {
        ...updateSpeakingQuestionDto,
        subPrompts: parsedSubPrompts,
      },
    });

    return {
      message: 'Speaking question updated successfully',
      data,
      status: 200,
    };
  }

  async remove(id: string) {
    const existingSpeakingQuestion =
      await this.databaseService.speakingQuestion.findUnique({
        where: {
          idSpeakingQuestion: id,
        },
      });

    if (!existingSpeakingQuestion) {
      throw new BadRequestException('Speaking question not found');
    }

    await this.databaseService.speakingQuestion.delete({
      where: {
        idSpeakingQuestion: id,
      },
    });

    return {
      message: 'Speaking question removed successfully',
      status: 200,
    };
  }
}
