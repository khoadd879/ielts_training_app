import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTypeVocabularyDto } from './dto/create-type_vocabulary.dto';
import { UpdateTypeVocabularyDto } from './dto/update-type_vocabulary.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class TypeVocabularyService {
  constructor(private readonly databaseService: DatabaseService) {}
  //Type Vocabulary
  async createTypeVocabulary(createTypeVocabularyDto: CreateTypeVocabularyDto) {
    return this.databaseService.loaiTuVung.create({
      data: { nameLoaiTuVung: createTypeVocabularyDto.nameLoaiTuVung },
    });
  }

  async updateTypeVocabulary(updateTypeVocabularyDto: UpdateTypeVocabularyDto) {
    return this.databaseService.loaiTuVung.update({
      where: { idLoaiTuVung: updateTypeVocabularyDto.idLoaiTuVung },
      data: { nameLoaiTuVung: updateTypeVocabularyDto.nameLoaiTuVung },
    });
  }

  async findAllTypeVocabulary() {
    return this.databaseService.loaiTuVung.findMany();
  }

  async removeTypeVocabulary(id: string) {
    const existingType = await this.databaseService.loaiTuVung.findUnique({
      where: { idLoaiTuVung: id },
    });
    if (!existingType) {
      throw new BadRequestException('Type vocabulary not found');
    }
    return this.databaseService.loaiTuVung.delete({
      where: { idLoaiTuVung: id },
    });
  }
}
