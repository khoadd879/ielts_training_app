import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { DatabaseService } from 'src/database/database.service';
@Injectable()
export class VocabularyService {
  constructor(private readonly databaseService: DatabaseService) {}

  //Vocabulary
  async createVocabulary(createVocabularyDto: CreateVocabularyDto) {
    const { idUser, idTopic, word, meaning, phonetic, example, loaiTuVung } =
      createVocabularyDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const data = await this.databaseService.tuVung.create({
      data: {
        idUser,
        idTopic,
        loaiTuVung,
        word,
        meaning,
        phonetic,
        example,
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
    const { idUser, idTopic, word, meaning, phonetic, example, loaiTuVung } =
      updateVocabularyDto;

    const existingVocabulary = this.databaseService.tuVung.findUnique({
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
    const data = await this.databaseService.tuVung.update({
      where: { idTuVung: id },
      data: {
        idTopic,
        word,
        meaning,
        phonetic,
        example,
        loaiTuVung,
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
    const existingVocabulary = this.databaseService.tuVung.findUnique({
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

    const data = await this.databaseService.tuVung.findMany({
      where: {
        word: {
          contains: word,
          mode: 'insensitive', // không phân biệt hoa thường
        },
      },
    });

    return {
      message: 'Vocabularies retrieved successfully',
      data: data,
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
}
