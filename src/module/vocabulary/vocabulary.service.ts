import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { DatabaseService } from 'src/database/database.service';
@Injectable()
export class VocabularyService {
  constructor(private readonly databaseService: DatabaseService) {}

  //Vocabulary
  async createVocabulary(createVocabularyDto: CreateVocabularyDto) {
    const { idUser, word, meaning, phonetic, example, idLoaiTuVung } =
      createVocabularyDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    const typeVocabulary = await this.databaseService.loaiTuVung.findUnique({
      where: { idLoaiTuVung },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    if (!typeVocabulary) {
      throw new BadRequestException('Type vocabulary not found');
    }

    return this.databaseService.tuVung.create({
      data: {
        idUser,
        word,
        meaning,
        phonetic,
        example,
        idLoaiTuVung,
      },
    });
  }

  //Tim kiem tat ca tu vung theo idUser
  async findAllByIdUser(idUser: string) {
    return this.databaseService.tuVung.findMany({ where: { idUser } });
  }

  //Cap nhat tu vung
  update(id: string, updateVocabularyDto: UpdateVocabularyDto) {
    const { idUser, word, meaning, phonetic, example, idLoaiTuVung } =
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
    return this.databaseService.tuVung.update({
      where: { idTuVung: id },
      data: {
        word,
        meaning,
        phonetic,
        example,
        idLoaiTuVung,
      },
    });
  }

  //Xoa tu vung
  remove(id: string, idUser: string) {
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
    return this.databaseService.tuVung.delete({ where: { idTuVung: id } });
  }

  //Tim kiem tu vung theo tu khoa
  async findByWord(word: string, idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    return this.databaseService.tuVung.findMany({
      where: {
        word: {
          equals: word,
          mode: 'insensitive', // không phân biệt hoa thường
        },
      },
      include: { loaiTuVung: true },
    });
  }
}
