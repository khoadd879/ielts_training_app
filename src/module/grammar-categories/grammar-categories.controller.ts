import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GrammarCategoriesService } from './grammar-categories.service';
import { CreateGrammarCategoryDto } from './dto/create-grammar-category.dto';
import { UpdateGrammarCategoryDto } from './dto/update-grammar-category.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('grammar-categories')
export class GrammarCategoriesController {
  constructor(
    private readonly grammarCategoriesService: GrammarCategoriesService,
  ) {}

  @Post('create-grammar-categories')
  create(@Body() createGrammarCategoryDto: CreateGrammarCategoryDto) {
    return this.grammarCategoriesService.create(createGrammarCategoryDto);
  }

  @Get('get-user-grammar-categories/:idUser')
  findAll(@Param(`idUser`) idUser: string) {
    return this.grammarCategoriesService.findAll(idUser);
  }

  @Get('get-grammar-category/:idGrammarCategories')
  findOne(@Param('idGrammarCategories') idGrammarCategories: string) {
    return this.grammarCategoriesService.findOne(idGrammarCategories);
  }

  @Patch('update-grammar-category/:idGrammarCategories/:idUser')
  update(
    @Param('idGrammarCategories') idGrammarCategories: string,
    @Body() updateGrammarCategoryDto: UpdateGrammarCategoryDto,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarCategoriesService.update(
      idGrammarCategories,
      updateGrammarCategoryDto,
      idUser,
    );
  }

  @Delete('delete-grammar-category/:idGrammarCategories/:idUser')
  remove(
    @Param('idGrammarCategories') idGrammarCategories: string,
    @Param('idUser') idUser: string,
  ) {
    return this.grammarCategoriesService.remove(idGrammarCategories, idUser);
  }
}
