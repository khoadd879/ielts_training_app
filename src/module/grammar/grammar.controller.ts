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

  @Post('create-grammar')
  create(@Body() createGrammarDto: CreateGrammarDto) {
    return this.grammarService.create(createGrammarDto);
  }

  @Get('get-all-grammar/:idGrammarCategory')
  findAll(@Param('idGrammarCategory') idGrammarCategory: string) {
    return this.grammarService.findAllInGrammarCategories(idGrammarCategory);
  }

  @Get('get-grammar/:idGrammar')
  findOne(@Param('idGrammar') idGrammar: string) {
    return this.grammarService.findOne(idGrammar);
  }

  @Patch('update-grammar/:idGrammar')
  update(
    @Param('idGrammar') idGrammar: string,
    @Body() updateGrammarDto: UpdateGrammarDto,
  ) {
    return this.grammarService.update(idGrammar, updateGrammarDto);
  }

  @Delete('delete-grammar/:idGrammar')
  remove(@Param('idGrammar') idGrammar: string) {
    return this.grammarService.remove(idGrammar);
  }
}
