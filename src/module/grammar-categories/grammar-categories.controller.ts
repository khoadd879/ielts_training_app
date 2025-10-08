import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GrammarCategoriesService } from './grammar-categories.service';
import { CreateGrammarCategoryDto } from './dto/create-grammar-category.dto';
import { UpdateGrammarCategoryDto } from './dto/update-grammar-category.dto';

@Controller('grammar-categories')
export class GrammarCategoriesController {
  constructor(private readonly grammarCategoriesService: GrammarCategoriesService) {}

  @Post()
  create(@Body() createGrammarCategoryDto: CreateGrammarCategoryDto) {
    return this.grammarCategoriesService.create(createGrammarCategoryDto);
  }

  @Get()
  findAll() {
    return this.grammarCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.grammarCategoriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGrammarCategoryDto: UpdateGrammarCategoryDto) {
    return this.grammarCategoriesService.update(+id, updateGrammarCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.grammarCategoriesService.remove(+id);
  }
}
