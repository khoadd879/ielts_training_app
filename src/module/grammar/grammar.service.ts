import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { DatabaseService } from 'src/database/database.service';
import { Role } from '@prisma/client';

@Injectable()
export class GrammarService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createGrammarDto: CreateGrammarDto, idUser: string) {
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.GIAOVIEN)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    const { title, explanation, commonMistakes, examples, level, order } =
      createGrammarDto;

    const newGrammar = await this.databaseService.grammar.create({
      data: {
        title,
        explanation,
        commonMistakes,
        examples,
        level,
        order,
      },
    });

    return {
      message: 'Grammar created successfully',
      data: newGrammar,
      status: 201,
    };
  }

  async updateGrammar(
    idGrammar: string,
    updateGrammarDto: UpdateGrammarDto,
    idUser: string,
  ) {
    const existingGrammar = await this.databaseService.grammar.findUnique({
      where: { idGrammar },
    });

    if (!existingGrammar) {
      throw new BadRequestException('Grammar not found.');
    }

    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.GIAOVIEN)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    const { title, explanation, commonMistakes, examples, level, order } =
      updateGrammarDto;

    const data = await this.databaseService.grammar.update({
      where: { idGrammar },
      data: {
        title,
        explanation,
        commonMistakes,
        examples,
        level,
        order,
      },
    });

    return {
      message: 'Grammar updated successfully',
      data,
      status: 200,
    };
  }

  async remove(idGrammar: string, idUser: string) {
    const existingGrammar = await this.databaseService.grammar.findUnique({
      where: { idGrammar },
    });
    if (!existingGrammar) {
      throw new BadRequestException('Grammar not found.');
    }
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.GIAOVIEN)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    await this.databaseService.grammar.delete({
      where: { idGrammar },
    });

    return {
      message: 'Grammar deleted successfully',
      status: 200,
    };
  }

  async findAll() {
    const data = await this.databaseService.grammar.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return {
      message: 'Grammars retrieved successfully',
      data,
      status: 200,
    };
  }

  async findSystemCategories() {
    const data = await this.databaseService.grammarCategory.findMany({
      where: { idUser: null },
      include: {
        grammars: {
          include: { grammar: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    return {
      message: 'System categories retrieved successfully',
      data,
      status: 200
    };
  }

  // Calculate proficiency level based on violations and exercise results
  private calculateProficiency(violations: number, correctCount: number, totalAttempts: number, consecutiveCorrect: number): string {
    if (violations === 0 && (totalAttempts === 0 || correctCount === 0)) {
      return 'unknown';
    }
    const exerciseScore = totalAttempts > 0 ? (correctCount / totalAttempts) * 0.3 : 0;
    const violationScore = violations * 0.7;
    const consecutiveBonus = Math.min(consecutiveCorrect * 0.05, 0.2);
    const totalScore = violationScore + exerciseScore - consecutiveBonus;

    if (totalScore > 0.5) return 'weak';
    if (totalScore > 0.2) return 'medium';
    return 'strong';
  }

  async getDashboard(idUser: string) {
    // Get all grammar topics
    const allTopics = await this.databaseService.grammar.findMany({
      select: {
        idGrammar: true,
        title: true,
        level: true
      }
    });

    // Get proficiency data for user
    const proficiencies = await this.databaseService.userGrammarProficiency.findMany({
      where: { idUser }
    });

    // Get violations count for user
    const violations = await this.databaseService.userGrammarViolation.groupBy({
      by: ['idGrammar'],
      where: { idUser },
      _count: { id: true }
    });

    const violationsMap = new Map(violations.map(v => [v.idGrammar, v._count.id]));
    const profMap = new Map(proficiencies.map(p => [p.idGrammar, p]));

    // Build all topics with proficiency
    const topicsWithProficiency = allTopics.map(topic => {
      const prof = profMap.get(topic.idGrammar);
      const violationCount = violationsMap.get(topic.idGrammar) || 0;
      const proficiency = this.calculateProficiency(
        violationCount,
        prof?.correctCount || 0,
        prof?.totalAttempts || 0,
        prof?.consecutiveCorrect || 0
      );
      return {
        idGrammar: topic.idGrammar,
        title: topic.title,
        level: topic.level,
        proficiency,
        violations: violationCount,
        exercisesWrong: prof?.wrongCount || 0,
        exercisesCorrect: prof?.correctCount || 0
      };
    });

    // Weak areas = top 3 by violations
    const weakAreas = topicsWithProficiency
      .filter(t => t.violations > 0 || t.exercisesWrong > 0)
      .sort((a, b) => (b.violations + b.exercisesWrong) - (a.violations + a.exercisesWrong))
      .slice(0, 3);

    // Calculate overall progress
    const total = allTopics.length;
    const mastered = topicsWithProficiency.filter(t => t.proficiency === 'strong').length;
    const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return {
      message: 'Dashboard retrieved successfully',
      data: {
        weakAreas,
        allTopics: topicsWithProficiency,
        overallProgress: {
          percentage,
          mastered,
          total
        }
      },
      status: 200
    };
  }

  async getPracticeByTopic(idGrammar: string, count: number = 10) {
    const grammar = await this.databaseService.grammar.findUnique({
      where: { idGrammar }
    });

    if (!grammar) {
      throw new NotFoundException('Grammar topic not found');
    }

    const exercises = await this.databaseService.grammarExercise.findMany({
      where: { idGrammar },
      take: count,
      orderBy: { order: 'asc' }
    });

    return {
      data: exercises.map(ex => ({
        id: ex.id,
        idGrammar: ex.idGrammar,
        type: ex.type,
        content: ex.content,
        title: grammar.title
      }))
    };
  }

  async getDueReviews(idUser: string, idGrammar: string) {
    const now = new Date();

    // Get exercises due for review
    const srRecords = await this.databaseService.userGrammarExerciseSR.findMany({
      where: {
        idUser,
        idExercise: {
          startsWith: idGrammar
        },
        nextReviewAt: { lte: now }
      }
    });

    if (srRecords.length === 0) {
      return { data: [] };
    }

    const exerciseIds = srRecords.map(r => r.idExercise);
    const exercises = await this.databaseService.grammarExercise.findMany({
      where: { id: { in: exerciseIds } }
    });

    return {
      data: exercises.map(ex => ({
        id: ex.id,
        idGrammar: ex.idGrammar,
        type: ex.type,
        content: ex.content
      }))
    };
  }

  async saveViolation(data: {
    idUser: string;
    idGrammar: string;
    source: string;
    userSentence: string;
    correctedSentence: string;
  }) {
    // Save violation
    const violation = await this.databaseService.userGrammarViolation.create({
      data: {
        idUser: data.idUser,
        idGrammar: data.idGrammar,
        source: data.source,
        userSentence: data.userSentence,
        correctedSentence: data.correctedSentence,
        submissionId: 'manual'
      }
    });

    // Update proficiency violations count
    await this.databaseService.userGrammarProficiency.upsert({
      where: {
        idUser_idGrammar: { idUser: data.idUser, idGrammar: data.idGrammar }
      },
      update: {
        violations: { increment: 1 }
      },
      create: {
        idUser: data.idUser,
        idGrammar: data.idGrammar,
        violations: 1,
        proficiency: 'unknown'
      }
    });

    return {
      message: 'Violation saved successfully',
      data: violation,
      status: 201
    };
  }

  async getRandomExercises(idUser: string, count: number = 10) {
    const exercises = await this.databaseService.grammarExercise.findMany({
      take: count,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        grammar: true
      }
    });

    // Shuffle and limit to count
    return exercises.sort(() => Math.random() - 0.5).slice(0, count).map(ex => ({
      id: ex.id,
      idGrammar: ex.idGrammar,
      type: ex.type,
      content: ex.content,
      title: ex.grammar.title
    }));
  }

  async submitPractice(idUser: string, answers: any[]) {
    const results: { exerciseId: string; isCorrect: boolean; nextReviewAt: Date }[] = [];

    for (const answer of answers) {
      const exercise = await this.databaseService.grammarExercise.findUnique({
        where: { id: answer.exerciseId }
      });

      if (!exercise) continue;

      // 1. Save to UserGrammarExerciseResult
      await this.databaseService.userGrammarExerciseResult.create({
        data: {
          idUser,
          idExercise: answer.exerciseId,
          answer: answer.userAnswer || '',
          isCorrect: answer.isCorrect
        }
      });

      // 2. Update SR (Spaced Repetition)
      const currentSR = await this.databaseService.userGrammarExerciseSR.findUnique({
        where: { idUser_idExercise: { idUser, idExercise: answer.exerciseId } }
      });

      const currentInterval = currentSR?.interval || 1;
      const currentEase = currentSR?.easeFactor || 2.5;

      let newInterval: number;
      let newEase: number;

      if (answer.isCorrect) {
        newInterval = Math.min(30, currentInterval * 2);
        newEase = Math.min(2.5, currentEase + 0.1);
      } else {
        newInterval = Math.max(1, Math.floor(currentInterval / 2));
        newEase = Math.max(1.3, currentEase - 0.2);
      }

      const nextReviewAt = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);

      await this.databaseService.userGrammarExerciseSR.upsert({
        where: { idUser_idExercise: { idUser, idExercise: answer.exerciseId } },
        update: { interval: newInterval, easeFactor: newEase, nextReviewAt },
        create: { idUser, idExercise: answer.exerciseId, interval: newInterval, easeFactor: newEase, nextReviewAt }
      });

      // 3. Update proficiency counts
      await this.databaseService.userGrammarProficiency.upsert({
        where: { idUser_idGrammar: { idUser, idGrammar: exercise.idGrammar } },
        update: {
          totalAttempts: { increment: 1 },
          correctCount: answer.isCorrect ? { increment: 1 } : undefined,
          wrongCount: answer.isCorrect ? undefined : { increment: 1 }
        },
        create: {
          idUser, idGrammar: exercise.idGrammar, totalAttempts: 1,
          correctCount: answer.isCorrect ? 1 : 0, wrongCount: answer.isCorrect ? 0 : 1, proficiency: 'unknown'
        }
      });

      results.push({ exerciseId: answer.exerciseId, isCorrect: answer.isCorrect, nextReviewAt });
    }

    const correct = results.filter(r => r.isCorrect).length;
    return {
      summary: { correct, incorrect: results.length - correct, total: results.length },
      updatedSR: results.map(r => ({ exerciseId: r.exerciseId, nextReviewAt: r.nextReviewAt }))
    };
  }

  async submitExercise(idUser: string, idGrammar: string, isCorrect: boolean) {
    const data = isCorrect
      ? { correctCount: { increment: 1 }, consecutiveCorrect: { increment: 1 }, totalAttempts: { increment: 1 } }
      : { wrongCount: { increment: 1 }, violations: { increment: 1 }, consecutiveCorrect: 0, totalAttempts: { increment: 1 } };

    await this.databaseService.userGrammarProficiency.update({
      where: { idUser_idGrammar: { idUser, idGrammar } },
      data
    });

    await this.recalculateProficiency(idUser, idGrammar);
  }

  async recalculateProficiency(idUser: string, idGrammar: string) {
    const prof = await this.databaseService.userGrammarProficiency.findUnique({
      where: { idUser_idGrammar: { idUser, idGrammar } }
    });
    if (!prof) return;

    const level = this.calculateProficiency(
      prof.violations,
      prof.correctCount,
      prof.totalAttempts,
      prof.consecutiveCorrect
    );

    await this.databaseService.userGrammarProficiency.update({
      where: { idUser_idGrammar: { idUser, idGrammar } },
      data: { proficiency: level }
    });
  }

  async findAllInUserCategory(idGrammarCategory: string, idUser: string) {
    const category = await this.databaseService.grammarCategory.findFirst({
      where: { idGrammarCategory, idUser },
    });
    if (!category) {
      throw new ForbiddenException('Category not found or access denied.');
    }

    const data = await this.databaseService.grammarsOnCategories.findMany({
      where: { idGrammarCategory },
      include: {
        grammar: true,
      },
    });

    const grammars = data.map((item) => item.grammar);

    return {
      message: 'Grammar in category retrieved successfully',
      data: grammars,
      status: 200,
    };
  }

  async addGrammarToCategory(
    idGrammarCategory: string,
    idGrammar: string,
    idUser: string,
  ) {
    const category = await this.databaseService.grammarCategory.findUnique({
      where: { idGrammarCategory },
    });

    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }
    if (!user) {
      throw new ForbiddenException('User performing the action not found.');
    }

    const isSystemCategory = category.idUser === null;
    const isOwner = category.idUser === user.idUser;
    const isAdminOrTeacher =
      user.role === Role.ADMIN || user.role === Role.GIAOVIEN;

    if (!((isSystemCategory && isAdminOrTeacher) || isOwner)) {
      throw new ForbiddenException(
        'You do not have permission to add grammar to this category.',
      );
    }

    const grammar = await this.databaseService.grammar.findUnique({
      where: { idGrammar },
    });
    if (!grammar) {
      throw new NotFoundException('Grammar not found.');
    }

    const existingRelation =
      await this.databaseService.grammarsOnCategories.findUnique({
        where: {
          idGrammarCategory_idGrammar: {
            idGrammarCategory,
            idGrammar,
          },
        },
      });

    if (existingRelation) {
      throw new BadRequestException('This grammar is already in the category.');
    }

    const data = await this.databaseService.grammarsOnCategories.create({
      data: {
        idGrammarCategory,
        idGrammar,
        assignedBy: idUser,
      },
    });

    return {
      message: 'Grammar added to category successfully',
      data,
      status: 200,
    };
  }

  async removeGrammarFromCategory(
    idGrammarCategory: string,
    idGrammar: string,
    idUser: string,
  ) {
    const category = await this.databaseService.grammarCategory.findUnique({
      where: { idGrammarCategory },
    });

    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }
    if (!user) {
      throw new ForbiddenException('User performing the action not found.');
    }

    const isSystemCategory = category.idUser === null;
    const isOwner = category.idUser === user.idUser;
    const isAdminOrTeacher =
      user.role === Role.ADMIN || user.role === Role.GIAOVIEN;

    if (!((isSystemCategory && isAdminOrTeacher) || isOwner)) {
      throw new ForbiddenException(
        'You do not have permission to remove grammar from this category.',
      );
    }

    await this.databaseService.grammarsOnCategories.delete({
      where: {
        idGrammarCategory_idGrammar: {
          idGrammarCategory,
          idGrammar,
        },
      },
    });

    return {
      message: 'Grammar removed from category successfully',
      status: 200,
    };
  }
}
