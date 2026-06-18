import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

const GRAMMAR_TOPIC_IDS: Record<string, string> = {
  'subject_verb': 'Subject-Verb Agreement',
  'verb_tenses': 'Verb Tenses',
  'articles': 'Articles (a/an/the)',
  'prepositions': 'Prepositions',
  'conditionals': 'Conditionals',
  'passive_voice': 'Passive Voice',
  'relative_clauses': 'Relative Clauses',
  'sentence_structure': 'Sentence Structure',
  'word_forms': 'Word Forms',
  'connectors': 'Connectors/Coherence',
};

@Injectable()
export class GrammarTrackingService {
  constructor(private readonly db: DatabaseService) {}

  async saveGrammarViolations(
    userId: string,
    source: 'WRITING' | 'SPEAKING',
    submissionId: string,
    aiResponse: any,
  ) {
    // Handle grammar violations
    if (aiResponse.grammarViolations && Array.isArray(aiResponse.grammarViolations)) {
      const violations = aiResponse.grammarViolations;

      for (const v of violations) {
        const topicTitle = GRAMMAR_TOPIC_IDS[v.topicId];
        if (!topicTitle) continue;

        // Find grammar id by title
        const grammar = await this.db.grammar.findFirst({
          where: { title: { contains: topicTitle.split(' ')[0] } },
        });

        if (!grammar) continue;

        // Create violation record
        await this.db.userGrammarViolation.create({
          data: {
            idUser: userId,
            source,
            idGrammar: grammar.idGrammar,
            submissionId,
            userSentence: v.userSentence,
            correctedSentence: v.correctedSentence,
          },
        });

        // Update proficiency: increment violations, wrongCount, reset streak
        await this.db.userGrammarProficiency.upsert({
          where: { idUser_idGrammar: { idUser: userId, idGrammar: grammar.idGrammar } },
          update: {
            violations: { increment: 1 },
            wrongCount: { increment: 1 },
            consecutiveCorrect: 0,  // Reset streak on violation
          },
          create: {
            idUser: userId,
            idGrammar: grammar.idGrammar,
            proficiency: 'unknown',
            violations: 1,
            wrongCount: 1,
            consecutiveCorrect: 0,
            totalAttempts: 1,
          },
        });
      }
    }

    // Handle correct grammar usages
    if (aiResponse.correctGrammarUsages && Array.isArray(aiResponse.correctGrammarUsages)) {
      const correctUsages = aiResponse.correctGrammarUsages;

      for (const c of correctUsages) {
        const topicTitle = GRAMMAR_TOPIC_IDS[c.topicId];
        if (!topicTitle) continue;

        // Find grammar id by title
        const grammar = await this.db.grammar.findFirst({
          where: { title: { contains: topicTitle.split(' ')[0] } },
        });

        if (!grammar) continue;

        // Update proficiency: increment correctUsages and consecutiveCorrect (streak continues)
        await this.db.userGrammarProficiency.upsert({
          where: { idUser_idGrammar: { idUser: userId, idGrammar: grammar.idGrammar } },
          update: {
            correctUsages: { increment: 1 },
            consecutiveCorrect: { increment: 1 },
          },
          create: {
            idUser: userId,
            idGrammar: grammar.idGrammar,
            proficiency: 'unknown',
            correctUsages: 1,
            consecutiveCorrect: 1,
            totalAttempts: 1,
          },
        });
      }
    }
  }

  async getViolationsByUser(userId: string, limit = 20) {
    const violations = await this.db.userGrammarViolation.findMany({
      where: { idUser: userId },
      include: { grammar: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      violations: violations.map((v) => ({
        topicTitle: v.grammar.title,
        source: v.source,
        userSentence: v.userSentence,
        correctedSentence: v.correctedSentence,
        createdAt: v.createdAt,
      })),
      status: 200,
    };
  }

  async getWeakAreas(userId: string) {
    const proficiencies = await this.db.userGrammarProficiency.findMany({
      where: { idUser: userId, proficiency: 'weak' },
      include: { grammar: true },
    });

    return {
      weakAreas: proficiencies.map((p) => ({
        idGrammar: p.idGrammar,
        title: p.grammar.title,
        wrongCount: p.wrongCount,
        proficiency: p.proficiency,
      })),
      status: 200,
    };
  }
}