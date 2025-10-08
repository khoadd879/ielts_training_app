import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AddVocabularyToTopicDto } from './dto/add-vocabulary-to-topic.dto';

@ApiBearerAuth()
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Post('create-vocabulary')
  create(@Body() createVocabularyDto: CreateVocabularyDto) {
    return this.vocabularyService.createVocabulary(createVocabularyDto);
  }

  @Get('get-all-vocabulary-by-id-user/:idUser')
  findAll(@Param('idUser') idUser: string) {
    return this.vocabularyService.findAllByIdUser(idUser);
  }

  // @Get('get-by-name/:idUser')
  // findByName(@Query('word') word: string, @Param('idUser') idUser: string) {
  //   return this.vocabularyService.findByWord(word, idUser);
  // }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVocabularyDto: UpdateVocabularyDto,
  ) {
    return this.vocabularyService.update(id, updateVocabularyDto);
  }

  @Delete(':id/:idUser')
  remove(@Param('id') id: string, @Param('idUser') idUser: string) {
    return this.vocabularyService.remove(id, idUser);
  }

  @Post('add-vocabulary-to-topic')
  @ApiBody({ type: AddVocabularyToTopicDto })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addVocabularyToTopic(@Body() body: AddVocabularyToTopicDto) {
    return this.vocabularyService.addVocabularyToTopic(
      body.idTuVung,
      body.idTopic,
    );
  }

  @Get('suggest/:word')
  suggest(@Param('word') word: string) {
    return this.vocabularyService.suggest(word);
  }
}
