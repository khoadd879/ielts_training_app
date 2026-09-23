import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProficiencyLevel } from '@prisma/client';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { SubmitReviewDto, GetDueReviewDto, GetTierRecommendationDto } from './dto/review.dto';
import { CompleteDailyVocabDto, VocabAnswerDto, GetDailyVocabDto } from './dto/vocab-daily.dto';
import { GetDailySessionDto } from './dto/get-daily-session.dto';
import { DatabaseService } from 'src/database/database.service';
import { RabbitMQService } from 'src/rabbitmq/rabbitmq.service';
import { GoogleGenAI } from '@google/genai';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from '@nestjs/cache-manager';
import { endOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export interface VocabCacheEntry {
  word: string;
  phonetic: string | null;
  meaning: string | null;
  example: string | null;
  loaiTuVung: string | null;
  level: string | null;
}

const VOCAB_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface SM2Result {
  repetitions: number;
  interval: number;
  easiness: number;
}

/** Fisher-Yates shuffle (in-place, returns same array). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

@Injectable()
export class VocabularyService {
  private readonly logger = new Logger(VocabularyService.name);
  private ai: GoogleGenAI | null = null;
  private readonly cachePrefix = 'vocab:';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly rabbitMQService: RabbitMQService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * SM-2 Spaced Repetition Algorithm
   * Based on Woźniak (1987)
   */
  sm2(quality: number, repetitions: number, easiness: number, interval: number): SM2Result {
    if (quality < 3) {
      return { repetitions: 0, interval: 1, easiness };
    }
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easiness);

    repetitions++;
    easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    return { repetitions, interval: Math.max(1, interval), easiness: Math.max(1.3, easiness) };
  }

  /**
   * Apply SM-2 for a VocabSeed → user mastery upsert.
   * Used by completeDailyVocab + cloze passage submission (per-blank).
   */
  async applySm2ForSeed(idUser: string, idVocabSeed: string, quality: number) {
    const seed = await this.databaseService.vocabSeed.findUnique({
      where: { idSeed: idVocabSeed },
    });
    if (!seed) {
      throw new BadRequestException('Vocab seed not found');
    }

    // Find-or-create user copy (clone from seed)
    let userVocab = await this.databaseService.vocabulary.findFirst({
      where: { idUser, word: seed.word },
    });
    if (!userVocab) {
      userVocab = await this.databaseService.vocabulary.create({
        data: {
          idUser,
          word: seed.word,
          meaning: seed.meaning,
          phonetic: seed.phonetic,
          VocabType: seed.VocabType,
          sourceSeedId: seed.idSeed,
        },
      });
    }

    // Find-or-create mastery
    let mastery = await this.databaseService.vocabMastery.findUnique({
      where: { idVocab: userVocab.idVocab },
    });
    const repetitions = mastery?.timesReviewed ?? 0;
    const easiness = mastery?.easinessFactor ?? 2.5;
    const interval = mastery?.interval ?? 1;

    const result = this.sm2(quality, repetitions, easiness, interval);
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + result.interval);

    // Proficiency map (independent of SM-2 scheduling)
    let status: ProficiencyLevel = mastery?.status ?? ProficiencyLevel.UNKNOWN;
    if (quality < 3) {
      status = ProficiencyLevel.WEAK;
    } else if (result.repetitions >= 5 && result.easiness >= 2.5) {
      status = ProficiencyLevel.MASTERED;
    } else if (result.repetitions >= 2) {
      status = ProficiencyLevel.STRONG;
    } else {
      status = ProficiencyLevel.MEDIUM;
    }

    const updated = await this.databaseService.vocabMastery.upsert({
      where: { idVocab: userVocab.idVocab },
      update: {
        timesReviewed: result.repetitions,
        easinessFactor: result.easiness,
        interval: result.interval,
        nextReviewAt,
        status,
      },
      create: {
        idVocab: userVocab.idVocab,
        timesReviewed: result.repetitions,
        easinessFactor: result.easiness,
        interval: result.interval,
        nextReviewAt,
        status,
      },
    });

    await this.databaseService.vocabulary.update({
      where: { idVocab: userVocab.idVocab },
      data: { lastReviewed: new Date() },
    });

    return {
      idVocab: userVocab.idVocab,
      idSeed: seed.idSeed,
      word: userVocab.word,
      status: updated.status,
      timesReviewed: updated.timesReviewed,
      interval: updated.interval,
      nextReviewAt: updated.nextReviewAt,
      easinessFactor: updated.easinessFactor,
    };
  }

  /**
   * Get vocabulary due for review today.
   * Filters by VocabMastery.nextReviewAt (scheduling) — proficiency (status) is independent.
   */
  async getDueReview(getDueReviewDto: GetDueReviewDto) {
    const { idUser, limit = 20 } = getDueReviewDto;
    const endOfToday = endOfDay(new Date());

    const list = await this.databaseService.vocabulary.findMany({
      where: {
        idUser,
        mastery: {
          OR: [
            { nextReviewAt: null }, // New words
            { nextReviewAt: { lte: endOfToday } }, // Due today or overdue
          ],
        },
      },
      include: { mastery: true },
      take: limit,
    });

    // Sort in-app by mastery.nextReviewAt, then createdAt
    list.sort((a, b) => {
      const aTime = a.mastery?.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.mastery?.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return list;
  }

  /**
   * Submit a review with quality rating.
   * Ownership check still needed (vocab is per-user); system vocab is gone post-R1.08.
   */
  async submitReview(submitReviewDto: SubmitReviewDto) {
    const { idVocab, idUser, quality } = submitReviewDto;

    const vocabulary = await this.databaseService.vocabulary.findUnique({
      where: { idVocab },
      include: { mastery: true },
    });

    if (!vocabulary) {
      throw new BadRequestException('Vocabulary not found');
    }

    if (vocabulary.idUser !== idUser) {
      throw new BadRequestException('Vocabulary does not belong to user');
    }

    const repetitions = vocabulary.mastery?.timesReviewed ?? 0;
    const easiness = vocabulary.mastery?.easinessFactor ?? 2.5;
    const interval = vocabulary.mastery?.interval ?? 1;

    const result = this.sm2(quality, repetitions, easiness, interval);
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + result.interval);

    let status: ProficiencyLevel = vocabulary.mastery?.status ?? ProficiencyLevel.UNKNOWN;
    if (quality < 3) {
      status = ProficiencyLevel.WEAK;
    } else if (result.repetitions >= 5 && result.easiness >= 2.5) {
      status = ProficiencyLevel.MASTERED;
    } else if (result.repetitions >= 2) {
      status = ProficiencyLevel.STRONG;
    } else {
      status = ProficiencyLevel.MEDIUM;
    }

    const updated = await this.databaseService.vocabMastery.upsert({
      where: { idVocab },
      update: {
        timesReviewed: result.repetitions,
        easinessFactor: result.easiness,
        interval: result.interval,
        nextReviewAt,
        status,
      },
      create: {
        idVocab,
        timesReviewed: result.repetitions,
        easinessFactor: result.easiness,
        interval: result.interval,
        nextReviewAt,
        status,
      },
    });

    await this.databaseService.vocabulary.update({
      where: { idVocab },
      data: { lastReviewed: new Date() },
    });

    return {
      idVocab,
      word: vocabulary.word,
      status: updated.status,
      timesReviewed: updated.timesReviewed,
      interval: updated.interval,
      nextReviewAt: updated.nextReviewAt,
      easinessFactor: updated.easinessFactor,
    };
  }

  /**
   * Get tier recommendation based on user's target band.
   * Tier totals come from VocabSeed (shared pool); mastered counts via Vocabulary.sourceSeed.
   */
  async getTierRecommendation(getTierRecommendationDto: GetTierRecommendationDto) {
    const { idUser } = getTierRecommendationDto;

    const user = await this.databaseService.user.findUnique({ where: { idUser } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const vocabCount = await this.databaseService.vocabulary.count({ where: { idUser } });
    const targetBand = user.targetBandScore ?? null;

    let recommendedTier: number | null;
    if (targetBand === null) recommendedTier = null;
    else if (targetBand < 5.5) recommendedTier = 1;
    else if (targetBand < 6.5) recommendedTier = 2;
    else recommendedTier = 3;

    if (recommendedTier === null) {
      return {
        recommendedTier: null,
        vocabCount,
        masteredCount: 0,
        totalInTier: 0,
        masteryPercentage: 0,
        shouldProgress: false,
        targetBand,
      };
    }

    const totalInTier = await this.databaseService.vocabSeed.count({
      where: { tier: recommendedTier },
    });

    const masteredCount = await this.databaseService.vocabulary.count({
      where: {
        idUser,
        mastery: { status: ProficiencyLevel.MASTERED },
        sourceSeed: { tier: recommendedTier },
      },
    });

    const masteryPercentage = totalInTier > 0 ? (masteredCount / totalInTier) * 100 : 0;
    const shouldProgress = totalInTier > 0 && masteryPercentage >= 80;

    return {
      recommendedTier,
      vocabCount,
      masteredCount,
      totalInTier,
      masteryPercentage: Math.round(masteryPercentage * 10) / 10,
      shouldProgress,
      targetBand,
    };
  }

  /**
   * Create a user-owned custom vocab (no source seed).
   * Transaction: create Vocabulary + VocabMastery.
   */
  async createVocabulary(createVocabularyDto: CreateVocabularyDto) {
    const { idUser, idTopic, word, meaning, phonetic, example, VocabType, level } = createVocabularyDto;

    const existingUser = await this.databaseService.user.findUnique({ where: { idUser } });
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const data = await this.databaseService.$transaction(async (tx) => {
      const vocab = await tx.vocabulary.create({
        data: {
          idUser,
          idTopic: idTopic ?? null,
          word,
          meaning,
          phonetic,
          example,
          VocabType,
          level,
        },
      });
      await tx.vocabMastery.create({
        data: {
          idVocab: vocab.idVocab,
          nextReviewAt: tomorrow,
          status: ProficiencyLevel.UNKNOWN,
        },
      });
      return vocab;
    });

    return {
      message: 'Vocabulary created successfully',
      data,
      status: 200,
    };
  }

  async findAllByIdUser(
    idUser: string,
    pagination: { page: number; limit: number; skip: number },
  ) {
    const { page, limit, skip } = pagination;
    const [data, total] = await this.databaseService.$transaction([
      this.databaseService.vocabulary.findMany({
        where: { idUser },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.databaseService.vocabulary.count({ where: { idUser } }),
    ]);
    return {
      message: 'Vocabulary retrieved',
      data,
      status: 200,
      meta: { page, limit, total },
    };
  }

  async update(idVocab: string, updateVocabularyDto: UpdateVocabularyDto) {
    const { idUser, idTopic, word, meaning, phonetic, example, VocabType, level } = updateVocabularyDto;

    const existingVocabulary = await this.databaseService.vocabulary.findUnique({ where: { idVocab } });
    if (!existingVocabulary) throw new BadRequestException('Vocabulary not found');

    const existingUser = await this.databaseService.user.findUnique({ where: { idUser } });
    if (!existingUser) throw new BadRequestException('User not found');

    const data = await this.databaseService.vocabulary.update({
      where: { idVocab },
      data: { idTopic, word, meaning, phonetic, example, VocabType, level },
    });

    return { message: 'Vocabulary updated successfully', data, status: 200 };
  }

  async remove(idVocab: string, idUser: string) {
    const existingVocabulary = await this.databaseService.vocabulary.findUnique({ where: { idVocab } });
    if (!existingVocabulary) throw new BadRequestException('Vocabulary not found');

    const existingUser = await this.databaseService.user.findUnique({ where: { idUser } });
    if (!existingUser) throw new BadRequestException('User not found');

    const data = await this.databaseService.vocabulary.delete({ where: { idVocab } });
    return { message: 'Vocabulary deleted successfully', data, status: 200 };
  }

  async addVocabularyToTopic(idVocab: string, idTopic: string) {
    const existingVocabulary = await this.databaseService.vocabulary.findUnique({ where: { idVocab } });
    if (!existingVocabulary) throw new BadRequestException('Vocabulary not found');

    const existingTopic = await this.databaseService.topic.findUnique({ where: { idTopic } });
    if (!existingTopic) throw new BadRequestException('Topic not found');

    const data = await this.databaseService.vocabulary.update({
      where: { idVocab },
      data: { idTopic },
    });

    return { message: 'Vocabulary added to topic successfully', data, status: 200 };
  }

  async suggest(word: string): Promise<{
    word: string;
    phonetic: string | null;
    meaning: string | null;
    example: string | null;
  }> {
    const lowerWord = word.toLowerCase().trim();
    const cacheKey = `${this.cachePrefix}${lowerWord}`;
    const cached = await this.cache.get<VocabCacheEntry>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for "${lowerWord}"`);
      return {
        word: cached.word,
        phonetic: cached.phonetic,
        meaning: cached.meaning,
        example: cached.example,
      };
    }
    throw new HttpException(
      { message: 'Use POST /vocabulary/suggest for fresh lookups', status: 410 },
      HttpStatus.GONE,
    );
  }

  async suggestPost(
    dto: { word: string },
    req: any,
  ): Promise<{ status: number; data?: VocabCacheEntry; jobId?: string; message?: string }> {
    const lowerWord = (dto.word ?? '').toLowerCase().trim();
    if (!lowerWord) throw new BadRequestException('word required');

    const cacheKey = `${this.cachePrefix}${lowerWord}`;
    const cached = await this.cache.get<VocabCacheEntry>(cacheKey);
    if (cached) {
      this.logger.debug(`Async suggest cache hit for "${lowerWord}"`);
      return { status: 200, data: cached };
    }

    const existingJob = await this.cache.get<string>(`vocab-job-active:${lowerWord}`);
    if (existingJob) {
      return { status: 202, jobId: existingJob, message: 'Suggestion in progress' };
    }

    const jobId = uuidv4();
    await this.cache.set(`vocab-job-active:${lowerWord}`, jobId, 300);
    const requestedByUserId = req?.user?.idUser ?? null;
    await this.rabbitMQService.publishVocabSuggest({
      jobId,
      word: lowerWord,
      requestedByUserId,
      enqueuedAt: new Date().toISOString(),
    });

    return { status: 202, jobId, message: 'Suggestion queued' };
  }

  async suggestResult(
    jobId: string,
    word: string,
  ): Promise<{ status: number; data?: VocabCacheEntry; message?: string }> {
    const lowerWord = (word ?? '').toLowerCase().trim();
    if (!jobId || !lowerWord) throw new BadRequestException('jobId and word required');

    const jobKey = `vocab-job:${lowerWord}:${jobId}`;
    const result = await this.cache.get<VocabCacheEntry>(jobKey);
    if (result) return { status: 200, data: result };

    const activeJob = await this.cache.get<string>(`vocab-job-active:${lowerWord}`);
    if (activeJob === jobId) return { status: 202, message: 'Still processing' };

    throw new NotFoundException('Job expired or not found');
  }

  /**
   * Get daily vocab from shared VocabSeed pool.
   * Excludes words user already has. Tier from VocabSeed (not Vocabulary).
   */
  async getDailyVocab(getDailyVocabDto: GetDailyVocabDto) {
    const { idUser, limit = 10 } = getDailyVocabDto;

    const user = await this.databaseService.user.findUnique({ where: { idUser } });
    if (!user) throw new BadRequestException('User not found');

    const targetBand = user.targetBandScore ?? null;
    const preferredTiers = targetBand !== null && targetBand >= 6.5 ? [2, 1] : [1, 2];

    const userWordTexts = await this.databaseService.vocabulary.findMany({
      where: { idUser },
      select: { word: true },
    });
    const existingWords = new Set(userWordTexts.map(w => w.word.toLowerCase()));

    let seedList = await this.databaseService.vocabSeed.findMany({
      where: {
        tier: { in: preferredTiers },
        word: { notIn: Array.from(existingWords) },
      },
      take: limit * 3,
    });
    seedList = shuffle(seedList).slice(0, limit);

    if (seedList.length < limit) {
      const existingIds = seedList.map(s => s.idSeed);
      const more = await this.databaseService.vocabSeed.findMany({
        where: {
          idSeed: { notIn: existingIds },
          word: { notIn: Array.from(existingWords) },
        },
        take: limit - seedList.length,
      });
      seedList.push(...more);
    }

    return seedList.map(s => ({
      idSeed: s.idSeed, // expose idSeed for FE compat (treat as idVocab when calling complete)
      idVocab: s.idSeed,
      word: s.word,
      phonetic: s.phonetic,
      meaning: s.meaning,
      VocabType: s.VocabType,
    }));
  }

  /**
   * Complete daily vocab exercise.
   * vocabId from FE is VocabSeed.idSeed (per getDailyVocab).
   * For each answer: find-or-create user copy + upsert mastery with simplified SM-2.
   */
  async completeDailyVocab(completeDailyVocabDto: CompleteDailyVocabDto) {
    const { idUser, answers } = completeDailyVocabDto;

    const results: Array<{ vocabId: string; word: string; status: ProficiencyLevel; isCorrect: boolean }> = [];
    let correctCount = 0;
    let incorrectCount = 0;

    for (const answer of answers) {
      const { vocabId, isCorrect } = answer;

      // vocabId is VocabSeed.idSeed
      const seed = await this.databaseService.vocabSeed.findUnique({ where: { idSeed: vocabId } });
      if (!seed) continue;

      // Find-or-create user copy
      let userVocab = await this.databaseService.vocabulary.findFirst({
        where: { idUser, word: seed.word },
      });
      if (!userVocab) {
        userVocab = await this.databaseService.vocabulary.create({
          data: {
            idUser,
            word: seed.word,
            meaning: seed.meaning,
            phonetic: seed.phonetic,
            VocabType: seed.VocabType,
            sourceSeedId: seed.idSeed,
          },
        });
      }

      // Find-or-create mastery
      let mastery = await this.databaseService.vocabMastery.findUnique({
        where: { idVocab: userVocab.idVocab },
      });
      if (!mastery) {
        mastery = await this.databaseService.vocabMastery.create({
          data: { idVocab: userVocab.idVocab, status: ProficiencyLevel.UNKNOWN },
        });
      }

      // Simplified SM-2 for binary isCorrect
      let easinessFactor = mastery.easinessFactor;
      let interval = mastery.interval;
      if (isCorrect) {
        easinessFactor = Math.min(2.5, easinessFactor + 0.1);
        interval = Math.round(interval * easinessFactor);
        correctCount++;
      } else {
        easinessFactor = Math.max(1.3, easinessFactor - 0.2);
        interval = 1;
        incorrectCount++;
      }

      let status: ProficiencyLevel = mastery.status;
      if (interval >= 21) status = ProficiencyLevel.MASTERED;
      else if (interval >= 7) status = ProficiencyLevel.STRONG;
      else if (interval >= 1) status = ProficiencyLevel.MEDIUM;
      else status = ProficiencyLevel.WEAK;

      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + interval);

      mastery = await this.databaseService.vocabMastery.update({
        where: { idVocab: userVocab.idVocab },
        data: {
          timesReviewed: mastery.timesReviewed + 1,
          easinessFactor,
          interval,
          nextReviewAt,
          status,
        },
      });

      await this.databaseService.vocabulary.update({
        where: { idVocab: userVocab.idVocab },
        data: { lastReviewed: new Date() },
      });

      results.push({
        vocabId: userVocab.idVocab,
        word: userVocab.word,
        status: mastery.status,
        isCorrect,
      });
    }

    return {
      summary: { total: answers.length, correct: correctCount, incorrect: incorrectCount },
      results,
    };
  }

  /**
   * Get vocab stats: tier totals from VocabSeed, mastered count from mastery join.
   * Response shape preserved for FE (vocabulary.jsx:693-694 reads tier1Progress.mastered).
   */
  async getVocabStats(idUser: string) {
    const tier1Total = await this.databaseService.vocabSeed.count({ where: { tier: 1 } });
    const tier1Mastered = await this.databaseService.vocabulary.count({
      where: {
        idUser,
        mastery: { status: ProficiencyLevel.MASTERED },
        sourceSeed: { tier: 1 },
      },
    });

    const tier2Total = await this.databaseService.vocabSeed.count({ where: { tier: 2 } });
    const tier2Mastered = await this.databaseService.vocabulary.count({
      where: {
        idUser,
        mastery: { status: ProficiencyLevel.MASTERED },
        sourceSeed: { tier: 2 },
      },
    });

    return {
      tier1Progress: {
        mastered: tier1Mastered,
        total: tier1Total,
        percentage: tier1Total > 0 ? Math.round((tier1Mastered / tier1Total) * 10000) / 100 : 0,
      },
      tier2Progress: {
        mastered: tier2Mastered,
        total: tier2Total,
        percentage: tier2Total > 0 ? Math.round((tier2Mastered / tier2Total) * 10000) / 100 : 0,
      },
    };
  }

  /**
   * Get random words for practice, excluding mastered.
   */
  async getRandomWords(idUser: string, count: number, mode: string) {
    const masteredIds = (
      await this.databaseService.vocabMastery.findMany({
        where: {
          status: ProficiencyLevel.MASTERED,
          userVocab: { idUser },
        },
        select: { idVocab: true },
      })
    ).map(m => m.idVocab);

    const words = await this.databaseService.vocabulary.findMany({
      where: { idUser, idVocab: { notIn: masteredIds } },
      take: count * 2,
      orderBy: { createdAt: 'desc' },
    });

    const shuffled = shuffle(words).slice(0, count);

    if (mode === 'multiple') {
      for (const word of shuffled) {
        const wrongOptions = await this.databaseService.vocabulary.findMany({
          where: { idVocab: { not: word.idVocab } },
          take: 3,
          orderBy: { createdAt: 'desc' },
        });
        (word as any).options = [word.word, ...wrongOptions.map(w => w.word)].sort(() => Math.random() - 0.5);
      }
    }

    return shuffled;
  }

  /**
   * Submit practice results. Update mastery (simplified SM-2 for binary input).
   */
  async submitPractice(idUser: string, mode: string, answers: any[]) {
    for (const answer of answers) {
      const vocab = await this.databaseService.vocabulary.findUnique({
        where: { idVocab: answer.idVocab },
        include: { mastery: true },
      });

      if (vocab && vocab.mastery) {
        let easinessFactor = vocab.mastery.easinessFactor || 2.5;
        let interval = vocab.mastery.interval || 1;

        if (answer.isCorrect) {
          if (interval === 1) interval = 6;
          else if (interval < 30) interval = Math.round(interval * easinessFactor);
          else interval = Math.round(interval * easinessFactor);
          easinessFactor = Math.max(1.3, easinessFactor + 0.1);
        } else {
          interval = 1;
          easinessFactor = Math.max(1.3, easinessFactor - 0.2);
        }

        let status: ProficiencyLevel = ProficiencyLevel.MEDIUM;
        if (interval > 21) status = ProficiencyLevel.MASTERED;
        else if (interval > 1) status = ProficiencyLevel.STRONG;
        else status = ProficiencyLevel.WEAK;

        await this.databaseService.vocabMastery.update({
          where: { idVocab: vocab.idVocab },
          data: {
            easinessFactor,
            interval,
            timesReviewed: vocab.mastery.timesReviewed + 1,
            status,
          },
        });
      }
    }

    const correct = answers.filter(a => a.isCorrect).length;
    return { summary: { correct, incorrect: answers.length - correct, total: answers.length } };
  }

  /**
   * Get daily session words: due review (user's vocab with mastery.nextReviewAt due) +
   * fill quota with new VocabSeed entries.
   */
  async getDailySessionWords(getDailySessionDto: GetDailySessionDto) {
    const { idUser, quota = 15 } = getDailySessionDto;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueWords = await this.databaseService.vocabulary.findMany({
      where: {
        idUser,
        mastery: {
          OR: [
            { nextReviewAt: { lte: today } },
            { nextReviewAt: null },
          ],
        },
      },
      include: { mastery: true },
      take: quota,
    });

    dueWords.sort((a, b) => {
      const aTime = a.mastery?.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.mastery?.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const dueCount = dueWords.length;

    let newCount = 0;
    let newWords: any[] = [];

    if (dueCount < quota) {
      const slotsNeeded = quota - dueCount;

      const userWordTexts = await this.databaseService.vocabulary.findMany({
        where: { idUser },
        select: { word: true },
      });
      const existingWords = new Set(userWordTexts.map(w => w.word.toLowerCase()));

      newWords = await this.databaseService.vocabSeed.findMany({
        where: {
          word: { notIn: Array.from(existingWords) },
          tier: { in: [1, 2] },
        },
        take: slotsNeeded * 3,
      });

      newWords = shuffle(newWords).slice(0, slotsNeeded).map(v => ({
        idVocab: v.idSeed,
        word: v.word,
        phonetic: v.phonetic,
        meaning: v.meaning,
        VocabType: v.VocabType,
        example: v.example,
        isNew: true,
      }));
      newCount = newWords.length;
    }

    const allWords = [...dueWords.map(w => ({ ...w, isNew: false })), ...newWords];
    const dueOnly = allWords.filter(w => !w.isNew);
    const newOnly = allWords.filter(w => w.isNew);

    const result: any[] = [];
    for (let i = 0; i < Math.max(dueOnly.length, newOnly.length); i++) {
      if (i < dueOnly.length) result.push(dueOnly[i]);
      if (i < newOnly.length) result.push(newOnly[i]);
    }

    return {
      words: result.map(v => ({
        idVocab: v.idVocab,
        word: v.word,
        phonetic: v.phonetic,
        meaning: v.meaning,
        VocabType: v.VocabType,
        example: v.example,
        isNew: v.isNew,
      })),
      dueCount,
      newCount,
      sessionDate: today.toISOString(),
    };
  }

  /**
   * Save a VocabSeed word to user's collection (clone + mastery).
   */
  async saveToCollection(idUser: string, vocabId: string, topicId?: string) {
    // vocabId is VocabSeed.idSeed
    const seed = await this.databaseService.vocabSeed.findUnique({ where: { idSeed: vocabId } });
    if (!seed) throw new BadRequestException('Word not found');

    const existing = await this.databaseService.vocabulary.findFirst({
      where: { idUser, word: { equals: seed.word, mode: 'insensitive' } },
    });

    if (existing) {
      if (topicId) {
        await this.databaseService.vocabulary.update({
          where: { idVocab: existing.idVocab },
          data: { idTopic: topicId },
        });
      }
      return { message: 'Word already in collection', idVocab: existing.idVocab };
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newVocab = await this.databaseService.$transaction(async (tx) => {
      const vocab = await tx.vocabulary.create({
        data: {
          idUser,
          word: seed.word,
          meaning: seed.meaning,
          phonetic: seed.phonetic,
          VocabType: seed.VocabType,
          example: seed.example,
          sourceSeedId: seed.idSeed,
          idTopic: topicId || null,
        },
      });
      await tx.vocabMastery.create({
        data: {
          idVocab: vocab.idVocab,
          nextReviewAt: tomorrow,
          status: ProficiencyLevel.UNKNOWN,
        },
      });
      return vocab;
    });

    return { message: 'Word saved to collection', idVocab: newVocab.idVocab };
  }
}
