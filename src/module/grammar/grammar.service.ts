import { BadGatewayException, Injectable } from '@nestjs/common';
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class GrammarService {
  constructor(private readonly databaseService: DatabaseService) {}

  async existingGrammarCategory(idGrammarCategory: string) {
    const data = await this.databaseService.grammarCategory.findUnique({
      where: {
        idGrammarCategory,
      },
    });

    return data;
  }
  async create(createGrammarDto: CreateGrammarDto) {
    const { idGrammarCategory, title, explanation, commonMistakes, examples } =
      createGrammarDto;

    await this.existingGrammarCategory(idGrammarCategory);

    const data = await this.databaseService.grammar.create({
      data: {
        idGrammarCategory,
        title,
        explanation,
        commonMistakes,
        examples,
      },
    });

    return {
      message: 'Grammar created succesfully',
      data,
      statsu: 200,
    };
  }

  async findAllInGrammarCategories(idGrammarCategory: string) {
    const data = await this.databaseService.grammar.findMany({
      where: {
        idGrammarCategory,
      },
    });

    return {
      message: 'Grammar retrieved succesfully',
      data,
      statsu: 200,
    };
  }

  async findOne(id: string) {
    const data = await this.databaseService.grammar.findUnique({
      where: {
        idGrammar: id,
      },
    });

    if (!data) throw new BadGatewayException('Grammar not found');

    return {
      message: 'Grammar retrieved succesfully',
      data,
      statsu: 200,
    };
  }

  async update(id: string, updateGrammarDto: UpdateGrammarDto) {
    const { idGrammarCategory, title, explanation, commonMistakes, examples } =
      updateGrammarDto;

    await this.existingGrammarCategory(idGrammarCategory);

    const data = await this.databaseService.grammar.update({
      where: {
        idGrammar: id,
      },
      data: {
        idGrammarCategory,
        title,
        explanation,
        commonMistakes,
        examples,
      },
    });

    return {
      message: 'Grammar updated succesfully',
      data,
      statsu: 200,
    };
  }

  async remove(id: string) {
    const data = await this.databaseService.grammar.delete({
      where: {
        idGrammar: id,
      },
    });

    if (!data) throw new BadGatewayException('Grammar not found');

    return {
      message: 'Grammar deleted succesfully',
      statsu: 200,
    };
  }
}
