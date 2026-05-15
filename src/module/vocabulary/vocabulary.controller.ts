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
import { SubmitReviewDto, GetDueReviewDto, GetTierRecommendationDto } from './dto/review.dto';

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

  @Patch('update-vocabulary/:idVocab')
  update(
    @Param('idVocab') idVocab: string,
    @Body() updateVocabularyDto: UpdateVocabularyDto,
  ) {
    return this.vocabularyService.update(idVocab, updateVocabularyDto);
  }

  @Delete('delete-vocabulary-by-id-user/:idVocab/:idUser')
  remove(@Param('idVocab') idVocab: string, @Param('idUser') idUser: string) {
    return this.vocabularyService.remove(idVocab, idUser);
  }

  @Post('add-vocabulary-to-topic')
  @ApiBody({ type: AddVocabularyToTopicDto })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addVocabularyToTopic(@Body() body: AddVocabularyToTopicDto) {
    return this.vocabularyService.addVocabularyToTopic(
      body.idVocab,
      body.idTopic,
    );
  }

  @Get('suggest/:word')
  suggest(@Param('word') word: string) {
    return this.vocabularyService.suggest(word);
  }

  // SM-2 Spaced Repetition Endpoints
  @Get('due-review')
  getDueReview(@Query() query: GetDueReviewDto) {
    return this.vocabularyService.getDueReview(query);
  }

  @Post('review')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  submitReview(@Body() body: SubmitReviewDto) {
    return this.vocabularyService.submitReview(body);
  }

  @Get('tier-recommendation')
  getTierRecommendation(@Query() query: GetTierRecommendationDto) {
    return this.vocabularyService.getTierRecommendation(query);
  }
}
