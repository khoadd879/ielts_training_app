import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { DatabaseService } from 'src/database/database.service';
import axios from 'axios';
import { GenerateContentResponse, GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const vocabCache = new Map<
  string,
  {
    word: string;
    phonetic: string | null;
    meaning: string | null;
    example: string | null;
  }
>();

@Injectable()
export class VocabularyService {
  constructor(private readonly databaseService: DatabaseService) {}

  //Vocabulary
  async createVocabulary(createVocabularyDto: CreateVocabularyDto) {
    const {
      idUser,
      idTopic,
      word,
      meaning,
      phonetic,
      example,
      loaiTuVung,
      level,
    } = createVocabularyDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const data = await this.databaseService.tuVung.create({
      data: {
        idUser,
        idTopic: idTopic ? idTopic : null,
        loaiTuVung,
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

  //Tim kiem tat ca tu vung theo idUser
  async findAllByIdUser(idUser: string) {
    return this.databaseService.tuVung.findMany({ where: { idUser } });
  }

  //Cap nhat tu vung
  async update(id: string, updateVocabularyDto: UpdateVocabularyDto) {
    const {
      idUser,
      idTopic,
      word,
      meaning,
      phonetic,
      example,
      loaiTuVung,
      level,
    } = updateVocabularyDto;

    const existingVocabulary = await this.databaseService.tuVung.findUnique({
      where: { idTuVung: id },
    });

    if (!existingVocabulary) {
      throw new BadRequestException('Vocabulary not found');
    }

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }
    const data = await this.databaseService.tuVung.update({
      where: { idTuVung: id },
      data: {
        idTopic,
        word,
        meaning,
        phonetic,
        example,
        loaiTuVung,
        level,
      },
    });
    return {
      message: 'Vocabulary updated successfully',
      data: data,
      status: 200,
    };
  }

  //Xoa tu vung
  async remove(id: string, idUser: string) {
    const existingVocabulary = await this.databaseService.tuVung.findUnique({
      where: { idTuVung: id },
    });

    if (!existingVocabulary) {
      throw new BadRequestException('Vocabulary not found');
    }

    const existingUser = this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }
    const data = await this.databaseService.tuVung.delete({
      where: { idTuVung: id },
    });

    return {
      message: 'Vocabulary deleted successfully',
      data: data,
      status: 200,
    };
  }

  //Tim kiem tu vung theo tu khoa
  async findByWord(word: string, idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    await this.databaseService.tuVung.findMany({
      where: {
        word: {
          contains: word,
          mode: 'insensitive', // không phân biệt hoa thường
        },
      },
    });

    return {
      message: 'Vocabularies retrieved successfully',
      status: 200,
    };
  }

  //Dua tu vung vao topic
  async addVocabularyToTopic(idTuVung: string, idTopic: string) {
    const existingVocabulary = await this.databaseService.tuVung.findUnique({
      where: { idTuVung },
    });
    if (!existingVocabulary) {
      throw new BadRequestException('Vocabulary not found');
    }
    const existingTopic = await this.databaseService.topic.findUnique({
      where: { idTopic },
    });
    if (!existingTopic) {
      throw new BadRequestException('Topic not found');
    }
    const data = await this.databaseService.tuVung.update({
      where: { idTuVung },
      data: { idTopic },
    });

    return {
      message: 'Vocabulary added to topic successfully',
      data: data,
      status: 200,
    };
  }

  //Goi y vocab
  async suggest(word: string): Promise<{
    word: string;
    phonetic: string | null;
    meaning: string | null;
    example: string | null;
  }> {
    const lowerWord = word.toLowerCase().trim();

    // 🟡 0. Kiểm tra cache trước
    if (vocabCache.has(lowerWord)) {
      // console.log(`⚡ Cache hit cho "${lowerWord}"`);
      return vocabCache.get(lowerWord)!;
    }

    let phonetic: string | null = null;
    let example: string | null = null;
    let meaning: string | null = null;

    // 🟡 1. Gọi dictionaryapi.dev trước (chỉ lấy phonetic + example)
    try {
      const dictRes = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lowerWord)}`,
      );
      const entry = dictRes.data[0];

      phonetic = entry.phonetic || entry.phonetics?.[0]?.text || null;
      example = entry.meanings?.[0]?.definitions?.[0]?.example || null;
    } catch (dictErr) {
      console.warn(
        `DictionaryAPI không có dữ liệu cho "${lowerWord}":`,
        dictErr.message,
      );
    }

    // 🧠 2. Gọi Gemini để lấy nghĩa tiếng Việt & bổ sung nếu thiếu
    try {
      const prompt = `
Bạn là một từ điển Anh - Việt.
Chỉ trả về JSON hợp lệ (không markdown, không giải thích), cấu trúc:
{"word":"","phonetic":null,"meaning":"","example":""}
Từ: "${lowerWord}"
`;

      const response: GenerateContentResponse = await ai.models.generateContent(
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

        // Nếu phonetic hoặc example chưa có → dùng từ Gemini
        if (!phonetic && parsed.phonetic) {
          phonetic = parsed.phonetic;
        }
        if (!example && parsed.example) {
          example = parsed.example;
        }

        meaning = parsed.meaning ?? null;
      } catch (parseErr) {
        console.warn('Gemini trả về không phải JSON hợp lệ:', parseErr);
      }
    } catch (err) {
      console.error('Lỗi khi gọi Gemini:', err);
    }

    const result = {
      word: lowerWord,
      phonetic,
      meaning,
      example,
    };

    // 🧠 3. Lưu vào cache để tái sử dụng
    vocabCache.set(lowerWord, result);

    return result;
  }
}
