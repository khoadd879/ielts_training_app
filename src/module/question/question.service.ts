import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { DatabaseService } from 'src/database/database.service';
import {
  assertPartQuestionCount,
  assertTotalQuestionCount,
  getSkillLimits,
} from 'src/helpers/ielts-test-limits';
import { TestType } from '@prisma/client';

@Injectable()
export class QuestionService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Resolve the parent test's `testType` for a given part.
   * Returns null if the part doesn't exist.
   */
  private async getTestTypeForPart(idPart: string): Promise<TestType | null> {
    const part = await this.databaseService.part.findUnique({
      where: { idPart },
      select: { test: { select: { testType: true } } },
    });
    return part?.test?.testType ?? null;
  }

  /**
   * Current question count for a part (across all groups).
   */
  private async getPartQuestionCount(idPart: string): Promise<number> {
    return this.databaseService.question.count({ where: { idPart } });
  }

  async createQuestion(dto: CreateQuestionDto) {
    const existingGroup = await this.databaseService.questionGroup.findUnique({
      where: { idQuestionGroup: dto.idQuestionGroup },
    });
    if (!existingGroup)
      throw new BadRequestException('Question group not found');

    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart: dto.idPart },
    });
    if (!existingPart) throw new BadRequestException('Part not found');

    // IELTS per-part question cap (Listening 5–10, Reading 5–14).
    const testType = await this.getTestTypeForPart(dto.idPart);
    if (testType) {
      const currentCount = await this.getPartQuestionCount(dto.idPart);
      assertPartQuestionCount(testType, currentCount, currentCount + 1);
    }

    const data = await this.databaseService.question.create({
      data: {
        idQuestionGroup: dto.idQuestionGroup,
        idPart: dto.idPart,
        questionNumber: dto.questionNumber,
        content: dto.content,
        questionType: dto.questionType,
        metadata: dto.metadata,
        order: dto.order ?? 0,
      },
    });

    return {
      message: 'Question created successfully',
      data,
      status: 200,
    };
  }

  async findByQuestionGroup(idQuestionGroup: string) {
    const existingGroup = await this.databaseService.questionGroup.findUnique({
      where: { idQuestionGroup },
    });
    if (!existingGroup)
      throw new BadRequestException('Question group not found');

    const data = await this.databaseService.question.findMany({
      where: { idQuestionGroup },
      orderBy: { order: 'asc' },
    });

    return {
      message: 'Questions retrieved successfully',
      data,
      status: 200,
    };
  }

  async findById(idQuestion: string) {
    const data = await this.databaseService.question.findUnique({
      where: { idQuestion },
    });
    if (!data) throw new NotFoundException('Question not found');

    return {
      message: 'Question retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateQuestion(idQuestion: string, dto: UpdateQuestionDto) {
    const existing = await this.databaseService.question.findUnique({
      where: { idQuestion },
    });
    if (!existing) throw new NotFoundException('Question not found');

    if (dto.idQuestionGroup) {
      const group = await this.databaseService.questionGroup.findUnique({
        where: { idQuestionGroup: dto.idQuestionGroup },
      });
      if (!group) throw new BadRequestException('Question group not found');
    }

    if (dto.idPart) {
      const part = await this.databaseService.part.findUnique({
        where: { idPart: dto.idPart },
      });
      if (!part) throw new BadRequestException('Part not found');
    }

    const data = await this.databaseService.question.update({
      where: { idQuestion },
      data: {
        ...(dto.idQuestionGroup && { idQuestionGroup: dto.idQuestionGroup }),
        ...(dto.idPart && { idPart: dto.idPart }),
        ...(dto.questionNumber !== undefined && {
          questionNumber: dto.questionNumber,
        }),
        ...(dto.content && { content: dto.content }),
        ...(dto.questionType && { questionType: dto.questionType }),
        ...(dto.metadata && { metadata: dto.metadata }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });

    return {
      message: 'Question updated successfully',
      data,
      status: 200,
    };
  }

  async removeQuestion(idQuestion: string) {
    const existing = await this.databaseService.question.findUnique({
      where: { idQuestion },
    });
    if (!existing) throw new NotFoundException('Question not found');

    await this.databaseService.question.delete({ where: { idQuestion } });

    return {
      message: 'Question deleted successfully',
      status: 200,
    };
  }

  async createManyQuestions(questions: CreateQuestionDto[]) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new BadRequestException(
        'Payload must be a non-empty array of questions',
      );
    }

    // Validate unique references
    const groupIds = [...new Set(questions.map((q) => q.idQuestionGroup))];
    const partIds = [...new Set(questions.map((q) => q.idPart))];

    const groups = await this.databaseService.questionGroup.findMany({
      where: { idQuestionGroup: { in: groupIds } },
      select: { idQuestionGroup: true },
    });
    const foundGroupIds = new Set(groups.map((g) => g.idQuestionGroup));
    const missingGroup = groupIds.find((id) => !foundGroupIds.has(id));
    if (missingGroup) {
      throw new BadRequestException(
        `Question group not found: ${missingGroup}`,
      );
    }

    const parts = await this.databaseService.part.findMany({
      where: { idPart: { in: partIds } },
      select: { idPart: true, test: { select: { testType: true } } },
    });
    const foundPartIds = new Set(parts.map((p) => p.idPart));
    const missingPart = partIds.find((id) => !foundPartIds.has(id));
    if (missingPart) {
      throw new BadRequestException(`Part not found: ${missingPart}`);
    }

    // Map idPart -> testType (every part on a single test shares one testType,
    // but be defensive in case the DB ever allows it to differ).
    const partTypeMap = new Map<string, TestType>();
    for (const p of parts) {
      if (p.test?.testType) partTypeMap.set(p.idPart, p.test.testType);
    }

    // IELTS per-part + per-test question caps (Listening 5–10×4, Reading 5–14×3).
    // Validate BEFORE writing so we fail fast and never leave the DB half-populated.
    const partCurrentCounts = new Map<string, number>();
    const perPartNewCounts = new Map<string, number>();
    for (const q of questions) {
      perPartNewCounts.set(q.idPart, (perPartNewCounts.get(q.idPart) ?? 0) + 1);
    }
    for (const [idPart, addCount] of perPartNewCounts.entries()) {
      const testType = partTypeMap.get(idPart);
      if (!testType) continue;
      const current = await this.getPartQuestionCount(idPart);
      partCurrentCounts.set(idPart, current);
      assertPartQuestionCount(testType, current, current + addCount);
    }

    // Total-question cap (test-level): sum(currentPartCounts) + sum(perPartNewCounts)
    // cannot exceed the per-skill total (40 for L/R; 0 for W/S = no cap).
    if (partTypeMap.size > 0) {
      const firstType = partTypeMap.values().next().value as TestType;
      const lim = getSkillLimits(firstType);
      if (lim.totalQuestions > 0) {
        const allPartIds = Array.from(partTypeMap.keys());
        // Question count for any part NOT in this batch:
        const otherPartIds = allPartIds.filter(
          (id) => !perPartNewCounts.has(id),
        );
        let otherTotal = 0;
        if (otherPartIds.length > 0) {
          otherTotal = await this.databaseService.question.count({
            where: { idPart: { in: otherPartIds } },
          });
        }
        const batchTotal = Array.from(perPartNewCounts.values()).reduce(
          (a, b) => a + b,
          0,
        );
        assertTotalQuestionCount(firstType, otherTotal + batchTotal);
      }
    }

    // Check duplicate questionNumber within each group
    const seen = new Set<string>();
    for (const q of questions) {
      const key = `${q.idQuestionGroup}:${q.questionNumber}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate questionNumber ${q.questionNumber} in group ${q.idQuestionGroup}`,
        );
      }
      seen.add(key);
    }

    // Create all questions in a transaction
    const createOps = questions.map((q) =>
      this.databaseService.question.create({
        data: {
          idQuestionGroup: q.idQuestionGroup,
          idPart: q.idPart,
          questionNumber: q.questionNumber,
          content: q.content,
          questionType: q.questionType,
          metadata: q.metadata,
          order: q.order ?? 0,
        },
      }),
    );

    const createdRecords = await this.databaseService.$transaction(createOps);

    return {
      message: 'Questions created successfully',
      data: createdRecords,
      status: 200,
    };
  }
}
