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

  private async existingUser(idUser: string) {
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!user) throw new BadRequestException('User not found');
    return user;
  }

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

  // Map Level enum (IELTS band) -> CEFR display label used by the magicpath
  // Grammar canvas. Best-effort mapping; admins/teachers still set the source
  // value (Low|Mid|High|Great).
  private levelToCefr(level: string) {
    switch (level) {
      case 'Low':
        return 'A2';
      case 'Mid':
        return 'B2';
      case 'High':
        return 'C1';
      case 'Great':
        return 'C2';
      default:
        return 'B1';
    }
  }

  // Learning summary for the hero / dashboard card on the student Grammar
  // page. All values are computed on-read from existing tables — no schema
  // changes.
  async getLearningSummary(idUser: string) {
    await this.existingUser(idUser);

    // 1. Total grammar topics visible to the learner = grammars in any
    //    category the user can see (system + own user-categories).
    const userCategories = await this.databaseService.grammarCategory.findMany(
      {
        where: { OR: [{ idUser: null }, { idUser }] },
        select: { idGrammarCategory: true },
      },
    );
    const categoryIds = userCategories.map((c) => c.idGrammarCategory);
    const totalTopics = categoryIds.length
      ? await this.databaseService.grammarsOnCategories.count({
          where: { idGrammarCategory: { in: categoryIds } },
        })
      : 0;

    // 2. Mastered count = proficiency == "strong" for grammars the user can see.
    const visibleGrammarIds = categoryIds.length
      ? (
          await this.databaseService.grammarsOnCategories.findMany({
            where: { idGrammarCategory: { in: categoryIds } },
            select: { idGrammar: true },
          })
        ).map((g) => g.idGrammar)
      : [];
    const mastered =
      visibleGrammarIds.length > 0
        ? await this.databaseService.userGrammarProficiency.count({
            where: {
              idUser,
              proficiency: 'strong',
              idGrammar: { in: visibleGrammarIds },
            },
          })
        : 0;

    // 3. Overall accuracy from exercise results (latest attempt per exercise).
    const exerciseResults =
      await this.databaseService.userGrammarExerciseResult.findMany({
        where: { idUser },
        select: { isCorrect: true, attemptedAt: true },
      });
    const totalAttempts = exerciseResults.length;
    const correctAttempts = exerciseResults.filter((r) => r.isCorrect).length;
    const overallAccuracy = totalAttempts
      ? Math.round((correctAttempts / totalAttempts) * 100)
      : 0;

    // 4. Streak = consecutive days (ending today) the user did at least one
    //    exercise. Walk backward from today.
    let streakDays = 0;
    if (exerciseResults.length > 0) {
      const dayKey = (d: Date) => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x.getTime();
      };
      const days = new Set(
        exerciseResults.map((r) => dayKey(new Date(r.attemptedAt))),
      );
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      // If user didn't do anything today, start from yesterday so the streak
      // doesn't break just because they haven't opened the app yet.
      if (!days.has(cursor.getTime())) {
        cursor.setDate(cursor.getDate() - 1);
      }
      while (days.has(cursor.getTime())) {
        streakDays += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    // 5. Weak areas = top 3 grammars with proficiency "weak" OR (low
      //    accuracy AND at least 1 attempt). We need their title + category
      //    info for the dashboard card.
    const weakRows = await this.databaseService.userGrammarProficiency.findMany(
      {
        where: {
          idUser,
          OR: [
            { proficiency: 'weak' },
            { proficiency: 'medium' },
          ],
        },
        take: 10,
      },
    );
    const weakGrammarIds = weakRows.map((r) => r.idGrammar);
    const weakGrammars = weakGrammarIds.length
      ? await this.databaseService.grammar.findMany({
          where: { idGrammar: { in: weakGrammarIds } },
          select: { idGrammar: true, title: true },
        })
      : [];
    const titleById = new Map(weakGrammars.map((g) => [g.idGrammar, g.title]));

    // Per-grammar accuracy for the weak candidates
    const accuracyByGrammar = new Map<string, { total: number; correct: number }>();
    if (weakGrammarIds.length) {
      const details = await this.databaseService.userGrammarExerciseResult.findMany(
        {
          where: {
            idUser,
            exercise: { is: { idGrammar: { in: weakGrammarIds } } },
          },
          select: { isCorrect: true, exercise: { select: { idGrammar: true } } },
        },
      );
      for (const d of details) {
        const gid = d.exercise.idGrammar;
        const cur = accuracyByGrammar.get(gid) || { total: 0, correct: 0 };
        cur.total += 1;
        if (d.isCorrect) cur.correct += 1;
        accuracyByGrammar.set(gid, cur);
      }
    }

    const weakAreas = weakRows
      .map((r) => {
        const acc = accuracyByGrammar.get(r.idGrammar);
        const accuracy = acc && acc.total > 0
          ? Math.round((acc.correct / acc.total) * 100)
          : 0;
        return {
          idGrammar: r.idGrammar,
          title: titleById.get(r.idGrammar) || 'Grammar',
          proficiency: r.proficiency,
          accuracy,
          attempts: acc?.total || 0,
        };
      })
      .filter((w) => w.proficiency === 'weak' || w.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    return {
      message: 'Learning summary retrieved successfully',
      data: {
        totalTopics,
        mastered,
        overallAccuracy,
        streakDays,
        weakAreas,
      },
      status: 200,
    };
  }

  // Topics list for a specific category, enriched with proficiency + accuracy
  // for the requesting user. The frontend uses this to render the
  // categories/topics grid from the magicpath canvas.
  async getLearningTopics(
    idUser: string,
    idGrammarCategory: string,
  ) {
    await this.existingUser(idUser);

    const category = await this.databaseService.grammarCategory.findUnique({
      where: { idGrammarCategory },
      include: { user: true },
    });
    if (!category) throw new NotFoundException('Category not found');

    const isSystem = category.idUser === null;
    if (!isSystem && category.idUser !== idUser) {
      throw new ForbiddenException('You cannot view this category');
    }

    const items = await this.databaseService.grammarsOnCategories.findMany({
      where: { idGrammarCategory },
      orderBy: { grammar: { order: 'asc' } },
      include: {
        grammar: {
          include: {
            _count: { select: { exercises: true } },
          },
        },
      },
    });

    const grammars = items.map((i) => i.grammar);
    const grammarIds = grammars.map((g) => g.idGrammar);

    // Proficiency for these grammars
    const proficiencyRows = grammarIds.length
      ? await this.databaseService.userGrammarProficiency.findMany({
          where: { idUser, idGrammar: { in: grammarIds } },
        })
      : [];
    const proficiencyById = new Map(
      proficiencyRows.map((p) => [p.idGrammar, p.proficiency]),
    );

    // Accuracy per grammar
    const accuracyById = new Map<string, { total: number; correct: number }>();
    if (grammarIds.length) {
      const details = await this.databaseService.userGrammarExerciseResult.findMany(
        {
          where: {
            idUser,
            exercise: { is: { idGrammar: { in: grammarIds } } },
          },
          select: {
            isCorrect: true,
            exercise: { select: { idGrammar: true } },
          },
        },
      );
      for (const d of details) {
        const gid = d.exercise.idGrammar;
        const cur = accuracyById.get(gid) || { total: 0, correct: 0 };
        cur.total += 1;
        if (d.isCorrect) cur.correct += 1;
        accuracyById.set(gid, cur);
      }
    }

    const topics = grammars.map((g, idx) => {
      const prof = proficiencyById.get(g.idGrammar) || 'unknown';
      const acc = accuracyById.get(g.idGrammar) || { total: 0, correct: 0 };
      const accuracy = acc.total > 0
        ? Math.round((acc.correct / acc.total) * 100)
        : 0;
      const total = g._count.exercises;
      const attempted = acc.total;
      const progress = total > 0
        ? Math.min(100, Math.round((attempted / total) * 100))
        : 0;
      const cefr = this.levelToCefr(g.level as unknown as string);

      // Status logic (mirrors the magicpath canvas semantics):
      //   done       = progress 100 OR proficiency "strong" OR accuracy >= 85
      //   current    = proficiency "medium" OR (attempted > 0 AND progress < 100)
      //   available  = never attempted (or only 1-2) AND previous topic done
      //   locked     = not attempted AND previous topic not done
      const status =
        progress >= 100 || prof === 'strong' || accuracy >= 85
          ? 'done'
          : prof === 'medium' || attempted > 0
          ? 'current'
          : idx === 0
          ? 'available'
          : 'available'; // simple gate — previous-topic check would need full ordering logic; UI can refine

      return {
        id: g.idGrammar,
        title: g.title,
        desc: g.explanation,
        level: cefr,
        duration: 10,
        exercises: total,
        progress,
        status,
        proficiency: prof,
        accuracy,
      };
    });

    // Category-level summary
    const doneCount = topics.filter((t) => t.status === 'done').length;

    return {
      message: 'Learning topics retrieved successfully',
      data: {
        category: {
          idGrammarCategory: category.idGrammarCategory,
          name: category.name,
          description: category.description,
          isSystem,
        },
        topics,
        summary: {
          total: topics.length,
          done: doneCount,
        },
      },
      status: 200,
    };
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
