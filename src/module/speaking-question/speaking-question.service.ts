import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSpeakingQuestionDto } from './dto/create-speaking-question.dto';
import { UpdateSpeakingQuestionDto } from './dto/update-speaking-question.dto';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from '@prisma/client';
import { CreateBulkSpeakingQuestionDto } from './dto/create-bulk-speaking.dto';

@Injectable()
export class SpeakingQuestionService {
  constructor(private readonly databaseService: DatabaseService) {}

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

  async createBulk(dto: CreateBulkSpeakingQuestionDto) {
  const { idSpeakingTask, topic, preparationTime, questions } = dto;

  const existingTask = await this.databaseService.speakingTask.findUnique({
    where: { idSpeakingTask },
  });

  if (!existingTask) {
    throw new BadRequestException('Speaking task not found');
  }

  const dataToInsert = questions.map((q) => ({
    idSpeakingTask,
    topic,
    prompt: q.prompt,
    subPrompts: q.subPrompts || [],
    preparationTime: preparationTime ?? 0,
    speakingTime: q.speakingTime ?? 60,
    order: q.order,
  }));

  const createdQuestions = await this.databaseService.speakingQuestion.createManyAndReturn({
    data: dataToInsert,
  });

  return {
    message: `Successfully created ${createdQuestions.length} questions for topic: ${topic}`,
    data: createdQuestions, // Trả về mảng các bản ghi đã tạo
    status: 200,
  };
}
}
