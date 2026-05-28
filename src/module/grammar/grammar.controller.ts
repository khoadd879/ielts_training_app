import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { GrammarService } from './grammar.service';
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { SubmitGrammarPracticeDto } from './dto/practice-grammar.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/decorator/customize';

@ApiBearerAuth()
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @Post('create-grammar-alone/:idUser')
  createGrammarAlone(
    @Body() createGrammarDto: CreateGrammarDto,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarService.create(createGrammarDto, idUser);
  }

  @Patch('update-grammar/:idGrammar/:idUser')
  update(
    @Param('idGrammar') idGrammar: string,
    @Param('idUser') idUser: string,
    @Body() updateGrammarDto: UpdateGrammarDto,
  ) {
    return this.grammarService.updateGrammar(
      idGrammar,
      updateGrammarDto,
      idUser,
    );
  }

  @Delete('delete-grammar/:idGrammar/:idUser')
  remove(
    @Param('idGrammar') idGrammar: string,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarService.remove(idGrammar, idUser);
  }

  @Get('all-grammar')
  findAll() {
    return this.grammarService.findAll();
  }

  @Get('categories/system')
  findSystemCategories() {
    return this.grammarService.findSystemCategories();
  }

  @Get('grammar-by-user-category/:idGrammarCategory/:idUser')
  findOne(
    @Param('idGrammarCategory') idGrammarCategory: string,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarService.findAllInUserCategory(idGrammarCategory, idUser);
  }

  @Post('add-grammar-to-category/:idGrammarCategory/:idGrammar/:idUser')
  addGrammarToCategory(
    @Param('idGrammarCategory') idGrammarCategory: string,
    @Param('idGrammar') idGrammar: string,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarService.addGrammarToCategory(
      idGrammarCategory,
      idGrammar,
      idUser,
    );
  }

  @Delete('remove-grammar-from-category/:idGrammarCategory/:idGrammar/:idUser')
  removeGrammarFromCategory(
    @Param('idGrammarCategory') idGrammarCategory: string,
    @Param('idGrammar') idGrammar: string,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarService.removeGrammarFromCategory(
      idGrammarCategory,
      idGrammar,
      idUser,
    );
  }

  @Get('practice/random')
  async getPracticeRandom(
    @Query('idUser') idUser: string,
    @Query('count') count: number = 10
  ) {
    const exercises = await this.grammarService.getRandomExercises(idUser, count);
    return { data: exercises };
  }

  @Post('practice/submit')
  async submitPractice(@Body() body: SubmitGrammarPracticeDto) {
    const result = await this.grammarService.submitPractice(body.idUser, body.answers);
    return result;
  }

  @Get('dashboard')
  async getDashboard(@Query('idUser') idUser: string) {
    const result = await this.grammarService.getDashboard(idUser);
    return result.data;
  }

  @Get(':idGrammar/practice')
  async getPracticeByTopic(
    @Param('idGrammar') idGrammar: string,
    @Query('count') count: number = 10
  ) {
    return this.grammarService.getPracticeByTopic(idGrammar, count);
  }

  @Get(':idGrammar/due-reviews')
  async getDueReviews(
    @Param('idGrammar') idGrammar: string,
    @Query('idUser') idUser: string
  ) {
    return this.grammarService.getDueReviews(idUser, idGrammar);
  }

  @Post('violation')
  async saveViolation(@Body() body: {
    idUser: string;
    idGrammar: string;
    source: string;
    userSentence: string;
    correctedSentence: string;
  }) {
    return this.grammarService.saveViolation(body);
  }
}
