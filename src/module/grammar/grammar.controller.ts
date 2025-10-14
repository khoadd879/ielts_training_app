import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GrammarService } from './grammar.service';
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('grammar')
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @Post('create-grammar/:idUser')
  create(
    @Body() createGrammarDto: CreateGrammarDto,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarService.create(createGrammarDto, idUser);
  }

  @Get('get-all-grammar/:idGrammarCategory')
  findAll(@Param('idGrammarCategory') idGrammarCategory: string) {
    return this.grammarService.findAllInGrammarCategories(idGrammarCategory);
  }

  @Get('get-grammar/:idGrammar')
  findOne(@Param('idGrammar') idGrammar: string) {
    return this.grammarService.findOne(idGrammar);
  }

  @Patch('update-grammar/:idGrammar/:idUser')
  update(
    @Param('idGrammar') idGrammar: string,
    @Body() updateGrammarDto: UpdateGrammarDto,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarService.update(idGrammar, updateGrammarDto, idUser);
  }

  @Delete('delete-grammar/:idGrammar/:idUser')
  remove(
    @Param('idGrammar') idGrammar: string,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarService.remove(idGrammar, idUser);
  }
}
