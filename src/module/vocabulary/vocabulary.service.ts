import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { SubmitReviewDto, GetDueReviewDto, GetTierRecommendationDto } from './dto/review.dto';
import { CompleteDailyVocabDto, VocabAnswerDto, GetDailyVocabDto } from './dto/vocab-daily.dto';
import { DatabaseService } from 'src/database/database.service';
import axios, { AxiosError } from 'axios';
import { GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from '@nestjs/cache-manager';
import { endOfDay, startOfDay } from 'date-fns';

interface VocabCacheEntry {
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

@Injectable()
export class VocabularyService {
  private readonly logger = new Logger(VocabularyService.name);
  private ai: GoogleGenAI | null = null;
  private readonly cachePrefix = 'vocab:';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
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
    // quality: 0-5 (0=wrong, 3=correct with difficulty, 5=perfect)
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
   * Get vocabulary due for review today
   */
  async getDueReview(getDueReviewDto: GetDueReviewDto) {
    const { idUser, limit = 20 } = getDueReviewDto;
    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfToday = endOfDay(now);

    return this.databaseService.vocabulary.findMany({
      where: {
        idUser,
        OR: [
          { nextReviewAt: null }, // New words
          { nextReviewAt: { lte: endOfToday } }, // Due today or overdue
        ],
        status: { not: 'mastered' },
      },
      take: limit,
      orderBy: [
        { nextReviewAt: 'asc' }, // Most overdue first
        { createdAt: 'asc' }, // Then by creation date (newest first)
      ],
    });
  }

  /**
   * Submit a review with quality rating
   */
  async submitReview(submitReviewDto: SubmitReviewDto) {
    const { idVocab, idUser, quality } = submitReviewDto;

    const vocabulary = await this.databaseService.vocabulary.findUnique({
      where: { idVocab },
    });

    if (!vocabulary) {
      throw new BadRequestException('Vocabulary not found');
    }

    if (vocabulary.idUser !== idUser) {
      throw new BadRequestException('Vocabulary does not belong to user');
    }

    // Get current SM-2 values
    const repetitions = vocabulary.timesReviewed || 0;
    const easiness = vocabulary.easinessFactor || 2.5;
    const interval = vocabulary.interval || 1;

    // Calculate new SM-2 values
    const result = this.sm2(quality, repetitions, easiness, interval);

    // Calculate next review date
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + result.interval);

    // Determine new status based on repetitions and quality
    let status = vocabulary.status || 'new';
    if (quality < 3) {
      status = 'learning';
    } else if (result.repetitions >= 5 && result.easiness >= 2.5) {
      status = 'mastered';
    } else if (result.repetitions >= 2) {
      status = 'review';
    } else {
      status = 'learning';
    }

    const updated = await this.databaseService.vocabulary.update({
      where: { idVocab },
      data: {
        timesReviewed: result.repetitions,
        easinessFactor: result.easiness,
        interval: result.interval,
        nextReviewAt,
        status,
        lastReviewed: new Date(),
      },
    });

    return {
      idVocab: updated.idVocab,
      word: updated.word,
      status: updated.status,
      timesReviewed: updated.timesReviewed,
      interval: updated.interval,
      nextReviewAt: updated.nextReviewAt,
      easinessFactor: updated.easinessFactor,
    };
  }

  /**
   * Get tier recommendation based on user's target band
   */
  async getTierRecommendation(getTierRecommendationDto: GetTierRecommendationDto) {
    const { idUser } = getTierRecommendationDto;

    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get user's vocabulary stats
    const vocabCount = await this.databaseService.vocabulary.count({
      where: { idUser },
    });

    // Get user's target band (return null if not set — caller decides whether to recommend a tier)
    const targetBand = user.targetBandScore ?? null;

    // Determine tier based on band target. No target → null tier; FE prompts user to set target.
    let recommendedTier: number | null;
    if (targetBand === null) {
      recommendedTier = null;
    } else if (targetBand < 5.5) {
      recommendedTier = 1; // High frequency words (3k = 90% coverage)
    } else if (targetBand < 6.5) {
      recommendedTier = 2; // Academic Word List (570 words)
    } else {
      recommendedTier = 3; // Specialized/technical vocabulary
    }

    // Count mastered words per tier
    const masteredByTier = await this.databaseService.vocabulary.groupBy({
      by: ['tier'],
      where: { idUser, status: 'mastered' },
      _count: true,
    });

    const masteredCount = recommendedTier !== null
      ? masteredByTier.find(t => t.tier === recommendedTier)?._count || 0
      : 0;

    // Get total in recommended tier
    const totalInTier = recommendedTier !== null
      ? await this.databaseService.vocabulary.count({
          where: { idUser, tier: recommendedTier },
        })
      : 0;

    // Check if should progress to next tier (80% mastery)
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

  async createVocabulary(createVocabularyDto: CreateVocabularyDto) {
    const {
      idUser,
      idTopic,
      word,
      meaning,
      phonetic,
      example,
      VocabType,
      level,
    } = createVocabularyDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    // Determine tier based on user's target band. No target → tier 1 (high-frequency, safe default for new learners).
    const targetBand = existingUser.targetBandScore ?? null;
    let tier = 1;
    if (targetBand !== null && targetBand >= 6.5) {
      tier = 2; // AWL for academic users
    } else if (targetBand !== null && targetBand >= 5.5) {
      tier = 1; // High frequency words
    }

    // Set next review to tomorrow (new words)
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + 1);

    const data = await this.databaseService.vocabulary.create({
      data: {
        idUser,
        idTopic: idTopic ? idTopic : null,
        VocabType,
        word,
        meaning,
        phonetic,
        example,
        level,
        tier,
        nextReviewAt,
        status: 'new',
      },
    });

    return {
      message: 'Vocabulary created successfully',
      data: data,
      status: 200,
    };
  }

  async findAllByIdUser(idUser: string) {
    return this.databaseService.vocabulary.findMany({ where: { idUser } });
  }

  async update(idVocab: string, updateVocabularyDto: UpdateVocabularyDto) {
    const {
      idUser,
      idTopic,
      word,
      meaning,
      phonetic,
      example,
      VocabType,
      level,
    } = updateVocabularyDto;

    const existingVocabulary = await this.databaseService.vocabulary.findUnique(
      {
        where: { idVocab },
      },
    );

    if (!existingVocabulary) {
      throw new BadRequestException('Vocabulary not found');
    }

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const data = await this.databaseService.vocabulary.update({
      where: { idVocab },
      data: {
        idTopic,
        word,
        meaning,
        phonetic,
        example,
        VocabType,
        level,
      },
    });

    return {
      message: 'Vocabulary updated successfully',
      data: data,
      status: 200,
    };
  }

  async remove(idVocab: string, idUser: string) {
    const existingVocabulary = await this.databaseService.vocabulary.findUnique(
      {
        where: { idVocab },
      },
    );

    if (!existingVocabulary) {
      throw new BadRequestException('Vocabulary not found');
    }

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const data = await this.databaseService.vocabulary.delete({
      where: { idVocab },
    });

    return {
      message: 'Vocabulary deleted successfully',
      data: data,
      status: 200,
    };
  }

  async addVocabularyToTopic(idVocab: string, idTopic: string) {
    const existingVocabulary = await this.databaseService.vocabulary.findUnique(
      {
        where: { idVocab },
      },
    );
    if (!existingVocabulary) {
      throw new BadRequestException('Vocabulary not found');
    }

    const existingTopic = await this.databaseService.topic.findUnique({
      where: { idTopic },
    });
    if (!existingTopic) {
      throw new BadRequestException('Topic not found');
    }

    const data = await this.databaseService.vocabulary.update({
      where: { idVocab },
      data: { idTopic },
    });

    return {
      message: 'Vocabulary added to topic successfully',
      data: data,
      status: 200,
    };
  }

  async suggest(word: string): Promise<{
    word: string;
    phonetic: string | null;
    meaning: string | null;
    example: string | null;
  }> {
    const lowerWord = word.toLowerCase().trim();
    const cacheKey = `${this.cachePrefix}${lowerWord}`;

    // Check cache first
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

    let phonetic: string | null = null;
    let example: string | null = null;
    let meaning: string | null = null;
    let loaiTuVung: string | null = null;
    let level: string | null = null;

    // Call dictionaryapi.dev first (phonetic + example)
    try {
      const dictRes = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lowerWord)}`,
      );
      const entry = dictRes.data[0];

      phonetic = entry.phonetic || entry.phonetics?.[0]?.text || null;
      example = entry.meanings?.[0]?.definitions?.[0]?.example || null;
      loaiTuVung = entry.meanings?.[0]?.partOfSpeech?.toUpperCase() ?? null;
    } catch (dictErr) {
      const axiosError = dictErr as AxiosError;
      this.logger.warn(
        `DictionaryAPI no data for "${lowerWord}": ${axiosError.message}`,
      );
    }

    // Call Gemini for Vietnamese meaning and additional data
    if (this.ai) {
      try {
        const prompt = `
Bạn là một hệ thống từ điển Anh - Việt chuyên nghiệp. Không dịch ngược Việt - Anh và không trả về gì khi mà từ không hợp lệ hoặc là không đúng và cả những từ chửi thề nữa.
Hãy trả về kết quả phân tích từ "${lowerWord}" theo đúng định dạng JSON sau (không có markdown, không có giải thích):

{
  "word": "",
  "phonetic": null,
  "meaning": "",
  "example": "",
  "loaiTuVung": "NOUN | VERB | ADJECTIVE | ADVERB | PHRASE | IDIOM | PREPOSITION | CONJUNCTION | INTERJECTION",
  "level": "Low | Mid | High"
}

Yêu cầu:
- "meaning": giải thích nghĩa tiếng Việt ngắn gọn, dễ hiểu.
- "example": 1 câu ví dụ đơn giản minh họa.
- "phonetic": phiên âm theo chuẩn IPA nếu có.
- "loaiTuVung": xác định loại từ tiếng Anh.
- "level": đánh giá độ khó của từ (Low: cơ bản, Mid: trung bình, High: nâng cao).
`;

        const response: GenerateContentResponse = await this.ai.models.generateContent(
          {
            model: 'gemini-2.5-flash',
            contents: prompt,
          },
        );

        const rawText = response.text?.trim() ?? '';
        const cleanedText = rawText
          .replace(/```json/i, '')
          .replace(/```/g, '')
          .trim();

        try {
          const parsed = JSON.parse(cleanedText);

          phonetic = phonetic ?? parsed.phonetic ?? null;
          example = example ?? parsed.example ?? null;
          meaning = parsed.meaning ?? null;
          loaiTuVung = parsed.loaiTuVung?.toUpperCase() ?? loaiTuVung;
          level = parsed.level ?? null;
        } catch (parseErr) {
          this.logger.warn(`Gemini returned invalid JSON: ${parseErr}`);
        }
      } catch (err) {
        this.logger.error(`Gemini API error: ${err}`);
      }
    }

    const result: VocabCacheEntry = {
      word: lowerWord,
      phonetic,
      meaning,
      example,
      loaiTuVung,
      level,
    };

    // Store in cache with TTL
    await this.cache.set(cacheKey, result, VOCAB_CACHE_TTL);

    return {
      word: result.word,
      phonetic: result.phonetic,
      meaning: result.meaning,
      example: result.example,
    };
  }

  /**
   * Get daily vocabulary for exercise
   * Filter: tier 1 or 2, status != 'mastered', idUser IS NULL (system vocab)
   * Priority: lower frequencyRank + not reviewed recently
   */
  async getDailyVocab(getDailyVocabDto: GetDailyVocabDto) {
    const { idUser, limit = 10 } = getDailyVocabDto;

    // Get user's target band to determine preferred tier
    const user = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const targetBand = user.targetBandScore ?? null;
    // No target → both tiers; target ≥ 6.5 prioritizes AWL (tier 2).
    const preferredTiers = targetBand !== null && targetBand >= 6.5 ? [2, 1] : [1, 2];

    // Get random vocab from preferred tiers (NOT filtered by idUser - shared pool)
    let vocabList = await this.databaseService.vocabulary.findMany({
      where: {
        tier: { in: preferredTiers },
      },
      take: limit * 3, // Get more to randomize
    });

    // Shuffle and pick 'limit' items
    vocabList.sort(() => Math.random() - 0.5);
    vocabList = vocabList.slice(0, limit);

    // If not enough, get from any tier
    if (vocabList.length < limit) {
      const existingIds = vocabList.map(v => v.idVocab);
      const moreVocab = await this.databaseService.vocabulary.findMany({
        where: {
          idVocab: { notIn: existingIds },
        },
        take: limit - vocabList.length,
      });
      vocabList.push(...moreVocab);
    }

    // Shuffle for randomness
    vocabList.sort(() => Math.random() - 0.5);

    return vocabList.map(v => ({
      idVocab: v.idVocab,
      word: v.word,
      phonetic: v.phonetic,
      meaning: v.meaning,
      VocabType: v.VocabType,
    }));
  }

  /**
   * Complete daily vocabulary exercise
   * Update SM-2 fields based on correct/incorrect answers
   */
  async completeDailyVocab(completeDailyVocabDto: CompleteDailyVocabDto) {
    const { idUser, answers } = completeDailyVocabDto;

    const results: Array<{ vocabId: string; word: string; status: string; isCorrect: boolean }> = [];
    let correctCount = 0;
    let incorrectCount = 0;

    for (const answer of answers) {
      const { vocabId, isCorrect } = answer;

      // Get vocabulary to find corresponding user vocab or create one
      const systemVocab = await this.databaseService.vocabulary.findUnique({
        where: { idVocab: vocabId },
      });

      if (!systemVocab) {
        continue;
      }

      // Find or create user vocabulary record
      let userVocab = await this.databaseService.vocabulary.findFirst({
        where: {
          idUser,
          word: systemVocab.word,
        },
      });

      if (!userVocab) {
        // Create user vocabulary based on system vocab
        userVocab = await this.databaseService.vocabulary.create({
          data: {
            idUser,
            word: systemVocab.word,
            meaning: systemVocab.meaning,
            phonetic: systemVocab.phonetic,
            VocabType: systemVocab.VocabType,
            tier: systemVocab.tier,
            frequencyRank: systemVocab.frequencyRank,
            status: 'new',
            timesReviewed: 0,
            easinessFactor: 2.5,
            interval: 1,
          },
        });
      }

      // Apply SM-2 algorithm
      let easinessFactor = userVocab.easinessFactor;
      let interval = userVocab.interval;
      let timesReviewed = userVocab.timesReviewed || 0;
      let status = userVocab.status;

      if (isCorrect) {
        easinessFactor = Math.min(2.5, easinessFactor + 0.1);
        interval = Math.round(interval * easinessFactor);
        correctCount++;
      } else {
        easinessFactor = Math.max(1.3, easinessFactor - 0.2);
        interval = 1;
        incorrectCount++;
      }

      // Update status based on interval
      if (interval >= 21) {
        status = 'mastered';
      } else if (interval >= 7) {
        status = 'review';
      } else if (interval >= 1) {
        status = 'learning';
      }

      // Calculate next review date
      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + interval);

      const updated = await this.databaseService.vocabulary.update({
        where: { idVocab: userVocab.idVocab },
        data: {
          timesReviewed: timesReviewed + 1,
          easinessFactor,
          interval,
          nextReviewAt,
          status,
          lastReviewed: new Date(),
        },
      });

      results.push({
        vocabId: updated.idVocab,
        word: updated.word,
        status: updated.status,
        isCorrect,
      });
    }

    return {
      summary: {
        total: answers.length,
        correct: correctCount,
        incorrect: incorrectCount,
      },
      results,
    };
  }

  /**
   * Get vocabulary statistics for a user
   */
  async getVocabStats(idUser: string) {
    // Tier 1: High frequency 3k words
    const tier1Total = await this.databaseService.vocabulary.count({
      where: {
        idUser: '',
        tier: 1,
      },
    });

    const tier1Mastered = await this.databaseService.vocabulary.count({
      where: {
        idUser,
        tier: 1,
        status: 'mastered',
      },
    });

    // Tier 2: AWL 570 words
    const tier2Total = await this.databaseService.vocabulary.count({
      where: {
        idUser: '',
        tier: 2,
      },
    });

    const tier2Mastered = await this.databaseService.vocabulary.count({
      where: {
        idUser,
        tier: 2,
        status: 'mastered',
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

  async getRandomWords(idUser: string, count: number, mode: string) {
    // Get vocabulary words with status != 'mastered' for user
    const words = await this.databaseService.vocabulary.findMany({
      where: {
        idUser,
        status: { not: 'mastered' }
      },
      take: count,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Shuffle the results
    const shuffled = words.sort(() => Math.random() - 0.5).slice(0, count);

    // For multiple mode: add wrong options
    if (mode === 'multiple') {
      for (const word of shuffled) {
        const wrongOptions = await this.databaseService.vocabulary.findMany({
          where: { idVocab: { not: word.idVocab } },
          take: 3,
          orderBy: { createdAt: 'desc' }
        });
        (word as any).options = [word.word, ...wrongOptions.map(w => w.word)].sort(() => Math.random() - 0.5);
      }
    }

    return shuffled;
  }

  async submitPractice(idUser: string, mode: string, answers: any[]) {
    // Update SM-2 for each word based on isCorrect
    for (const answer of answers) {
      const vocab = await this.databaseService.vocabulary.findUnique({
        where: { idVocab: answer.idVocab }
      });

      if (vocab) {
        let easinessFactor = vocab.easinessFactor || 2.5;
        let interval = vocab.interval || 1;
        let timesReviewed = vocab.timesReviewed || 0;

        // SM-2 algorithm
        if (answer.isCorrect) {
          if (interval === 1) interval = 6;
          else if (interval < 30) interval = Math.round(interval * easinessFactor);
          else interval = Math.round(interval * easinessFactor);
          easinessFactor = Math.max(1.3, easinessFactor + 0.1);
        } else {
          interval = 1;
          easinessFactor = Math.max(1.3, easinessFactor - 0.2);
        }

        await this.databaseService.vocabulary.update({
          where: { idVocab: answer.idVocab },
          data: {
            easinessFactor,
            interval,
            timesReviewed: timesReviewed + 1,
            status: interval > 21 ? 'mastered' : interval > 1 ? 'review' : 'learning'
          }
        });
      }
    }

    const correct = answers.filter(a => a.isCorrect).length;
    return { summary: { correct, incorrect: answers.length - correct, total: answers.length } };
  }
}