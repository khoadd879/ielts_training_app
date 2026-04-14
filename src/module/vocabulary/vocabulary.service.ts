import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { DatabaseService } from 'src/database/database.service';
import axios, { AxiosError } from 'axios';
import { GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from '@nestjs/cache-manager';

interface VocabCacheEntry {
  word: string;
  phonetic: string | null;
  meaning: string | null;
  example: string | null;
  loaiTuVung: string | null;
  level: string | null;
}

const VOCAB_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

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