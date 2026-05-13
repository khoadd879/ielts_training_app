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

    // Get user's target band (default to 5.5 if not set)
    const targetBand = user.targetBandScore || 5.5;

    // Determine tier based on band target
    let recommendedTier: number;
    if (targetBand < 5.5) {
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

    const masteredCount = masteredByTier.find(t => t.tier === recommendedTier)?._count || 0;

    // Get total in recommended tier
    const totalInTier = await this.databaseService.vocabulary.count({
      where: { idUser, tier: recommendedTier },
    });

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

    // Determine tier based on user's target band
    const targetBand = existingUser.targetBandScore || 5.5;
    let tier = 1;
    if (targetBand >= 6.5) {
      tier = 2; // AWL for academic users
    } else if (targetBand >= 5.5) {
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
}