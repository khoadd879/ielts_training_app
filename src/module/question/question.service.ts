import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { DatabaseService } from 'src/database/database.service';
import { AnswerService } from '../answer/answer.service';

@Injectable()
export class QuestionService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createQuestion(createQuestionDto: CreateQuestionDto) {
    const { idGroupOfQuestions, idPart, numberQuestion, content } =
      createQuestionDto;

    const existingGroupOfQuestions =
      await this.databaseService.groupOfQuestions.findUnique({
        where: {
          idGroupOfQuestions,
        },
      });

    if (!existingGroupOfQuestions)
      throw new BadRequestException('Group of questions not found');

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (!existingPart) return new BadRequestException('Part not found');

    const data = await this.databaseService.question.create({
      data: {
        idGroupOfQuestions,
        idPart,
        numberQuestion,
        content,
      },
    });

    return {
      message: 'Question created successfully',
      data,
      status: 200,
    };
  }

  async findByIdGroupOfQuestion(idGroupOfQuestions: string) {
    const existingGroupOfQuestions =
      await this.databaseService.groupOfQuestions.findUnique({
        where: {
          idGroupOfQuestions,
        },
      });

    if (!existingGroupOfQuestions)
      throw new BadRequestException('Group of questions not found');

    const data = await this.databaseService.question.findMany({
      where: {
        idGroupOfQuestions,
      },
      orderBy: {
        numberQuestion: 'asc',
      },
    });

    return {
      message: 'Question retrieved successfully',
      data,
      status: 200,
    };
  }

  async findById(idQuestion: string) {
    const data = await this.databaseService.question.findUnique({
      where: {
        idQuestion,
      },
    });

    return {
      message: 'Question retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateQuestion(
    idQuestion: string,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const { idGroupOfQuestions, idPart, numberQuestion, content } =
      updateQuestionDto;

    const existingGroupOfQuestions =
      await this.databaseService.groupOfQuestions.findUnique({
        where: {
          idGroupOfQuestions,
        },
      });

    if (!existingGroupOfQuestions)
      throw new BadRequestException('Group of questions not found');

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (!existingPart) return new BadRequestException('Part not found');

    const data = await this.databaseService.question.update({
      where: {
        idQuestion,
      },
      data: {
        idGroupOfQuestions,
        idPart,
        numberQuestion,
        content,
      },
    });

    return {
      message: 'Question created successfully',
      data,
      status: 200,
    };
  }

  async removeQuestion(idQuestion: string) {
    const existingQuestion = await this.databaseService.question.findUnique({
      where: {
        idQuestion,
      },
    });

    if (!existingQuestion) {
      throw new BadRequestException('Question not found');
    }

    // khi đã bật cascade ở Prisma, chỉ cần xóa question
    await this.databaseService.question.delete({ where: { idQuestion } });

    return {
      message: 'Question deleted successfully',
      status: 200,
    };
  }

  async createManyQuestions(createQuestionsDto: CreateQuestionDto[]) {
    if (!Array.isArray(createQuestionsDto) || createQuestionsDto.length === 0) {
      throw new BadRequestException(
        'Payload must be a non-empty array of questions',
      );
    }

    // collect unique ids to reduce DB calls
    const groupIds = Array.from(
      new Set(createQuestionsDto.map((q) => q.idGroupOfQuestions)),
    );
    const partIds = Array.from(
      new Set(createQuestionsDto.map((q) => q.idPart)),
    );

    // validate groups
    const groups = await this.databaseService.groupOfQuestions.findMany({
      where: { idGroupOfQuestions: { in: groupIds } },
      select: { idGroupOfQuestions: true },
    });
    const foundGroupIds = new Set(groups.map((g) => g.idGroupOfQuestions));
    const missingGroup = groupIds.find((id) => !foundGroupIds.has(id));
    if (missingGroup) {
      throw new BadRequestException(
        `Group of questions not found: ${missingGroup}`,
      );
    }

    // validate parts
    const parts = await this.databaseService.part.findMany({
      where: { idPart: { in: partIds } },
      select: { idPart: true },
    });
    const foundPartIds = new Set(parts.map((p) => p.idPart));
    const missingPart = partIds.find((id) => !foundPartIds.has(id));
    if (missingPart) {
      throw new BadRequestException(`Part not found: ${missingPart}`);
    }

    // check duplicate numberQuestion within input per group
    const seen = new Set<string>();
    for (const q of createQuestionsDto) {
      const key = `${q.idGroupOfQuestions}:${q.numberQuestion}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate numberQuestion ${q.numberQuestion} in group ${q.idGroupOfQuestions} in payload`,
        );
      }
      seen.add(key);
    }

    // // Optionally: check existing conflicts in DB (same group + numberQuestion)
    // // gather pairs to check
    // const whereChecks = createQuestionsDto.map((q) => ({
    //   idGroupOfQuestions: q.idGroupOfQuestions,
    //   numberQuestion: q.numberQuestion,
    // }));
    // const existingConflicts = await this.databaseService.question.findMany({
    //   where: {
    //     OR: whereChecks,
    //   },
    //   select: {
    //     idQuestion: true,
    //     idGroupOfQuestions: true,
    //     numberQuestion: true,
    //   },
    // });
    // if (existingConflicts.length > 0) {
    //   const conflict = existingConflicts[0];
    //   throw new BadRequestException(
    //     `Conflict: question number ${conflict.numberQuestion} already exists in group ${conflict.idGroupOfQuestions}`,
    //   );
    // }

    // prepare data array for createMany
    const data = createQuestionsDto.map((q) => ({
      idGroupOfQuestions: q.idGroupOfQuestions,
      idPart: q.idPart,
      numberQuestion: q.numberQuestion,
      content: q.content,
    }));

    // createMany returns { count: number } — it does not return created records
    const result = await this.databaseService.question.createMany({
      data,
      skipDuplicates: false, // not skip duplicates
    });

    return {
      message: 'Questions created successfully',
      data: data,
      status: 200,
    };
  }
}
