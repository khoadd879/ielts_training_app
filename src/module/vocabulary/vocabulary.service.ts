import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { DatabaseService } from 'src/database/database.service';
import axios from 'axios';
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
  async suggest(word: string) {
    const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    let phonetic = null;
    let meaning = null;
    let example = null;

    try {
      const { data } = await axios.get(apiUrl);
      const entry = data[0];

      phonetic = (entry.phonetic || entry.phonetics?.[0]?.text) ?? null;
      meaning =
        entry.meanings?.[0]?.definitions?.[0]?.definition ?? 'No definition';
      example = entry.meanings?.[0]?.definitions?.[0]?.example ?? null;
    } catch (err) {
      console.warn('Không tìm được dữ liệu từ API ngoài:', err.message);
    }

    return {
      word,
      phonetic,
      meaning,
      example,
    };
  }
}
