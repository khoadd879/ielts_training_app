import { Module } from '@nestjs/common';
import { GrammarCategoriesService } from './grammar-categories.service';
import { GrammarCategoriesController } from './grammar-categories.controller';

@Module({
  controllers: [GrammarCategoriesController],
  providers: [GrammarCategoriesService],
})
export class GrammarCategoriesModule {}
