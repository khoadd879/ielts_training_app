import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class WeaknessService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getGrammarWeakness(idUser: string) {
    const violations = await this.databaseService.userGrammarViolation.findMany(
      {
        where: { idUser },
        include: { grammar: true },
      },
    );

    // Group by grammar topic
    const grouped: Record<string, any> = {};
    for (const v of violations) {
      if (!grouped[v.idGrammar]) {
        grouped[v.idGrammar] = {
          idGrammar: v.idGrammar,
          title: v.grammar.title,
          wrongCount: 0,
        };
      }
      grouped[v.idGrammar].wrongCount++;
    }

    // Sort by wrongCount descending, take top 3
    return Object.values(grouped)
      .sort((a: any, b: any) => b.wrongCount - a.wrongCount)
      .slice(0, 3);
  }

  async getQuestionTypeWeakness(idUser: string) {
    const performances =
      await this.databaseService.questionTypePerformance.findMany({
        where: {
          idUser,
          totalAttempts: { gte: 3 },
          errorRate: { gte: 0.3 },
        },
        orderBy: { errorRate: 'desc' },
        take: 3,
      });

    return performances.map((p) => ({
      questionType: p.questionType,
      skillType: p.skillType,
      errorRate: p.errorRate,
      totalAttempts: p.totalAttempts,
    }));
  }
}
