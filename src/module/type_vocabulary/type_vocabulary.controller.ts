import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TypeVocabularyService } from './type_vocabulary.service';
import { CreateTypeVocabularyDto } from './dto/create-type_vocabulary.dto';
import { UpdateTypeVocabularyDto } from './dto/update-type_vocabulary.dto';

@Controller('type-vocabulary')
export class TypeVocabularyController {
  constructor(private readonly typeVocabularyService: TypeVocabularyService) {}

  //Type Vocabulary
  @Post('create-type-vocabulary')
  createTypeVocabulary(@Body() nameLoaiTuVung: CreateTypeVocabularyDto) {
    return this.typeVocabularyService.createTypeVocabulary(nameLoaiTuVung);
  }

  @Patch('update-type-vocabulary/:id')
  updateTypeVocabulary(
    @Param('id') id: string,
    @Body() updateTypeVocabulary: UpdateTypeVocabularyDto,
  ) {
    return this.typeVocabularyService.updateTypeVocabulary(
      updateTypeVocabulary,
    );
  }

  @Get('get-all-type-vocabulary')
  findAllTypeVocabulary() {
    return this.typeVocabularyService.findAllTypeVocabulary();
  }

  @Delete('delete-type-vocabulary/:id')
  removeTypeVocabulary(@Param('id') id: string) {
    return this.typeVocabularyService.removeTypeVocabulary(id);
  }
}
