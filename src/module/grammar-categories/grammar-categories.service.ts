import { Injectable } from '@nestjs/common';
import { CreateGrammarCategoryDto } from './dto/create-grammar-category.dto';
import { UpdateGrammarCategoryDto } from './dto/update-grammar-category.dto';

@Injectable()
export class GrammarCategoriesService {
  create(createGrammarCategoryDto: CreateGrammarCategoryDto) {
    return 'This action adds a new grammarCategory';
  }

  findAll() {
    return `This action returns all grammarCategories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} grammarCategory`;
  }

  update(id: number, updateGrammarCategoryDto: UpdateGrammarCategoryDto) {
    return `This action updates a #${id} grammarCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} grammarCategory`;
  }
}
