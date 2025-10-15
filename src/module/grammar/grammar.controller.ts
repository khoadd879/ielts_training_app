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
}
