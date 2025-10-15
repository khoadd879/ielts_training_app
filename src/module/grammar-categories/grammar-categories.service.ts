import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGrammarCategoryDto } from './dto/create-grammar-category.dto';
import { UpdateGrammarCategoryDto } from './dto/update-grammar-category.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class GrammarCategoriesService {
  constructor(private readonly databaseService: DatabaseService) {}
  async create(createGrammarCategoryDto: CreateGrammarCategoryDto) {
    const { idUser, name, description } = createGrammarCategoryDto;
    const existingCategory =
      await this.databaseService.grammarCategory.findUnique({
        where: {
          idUser_name: {
            idUser,
            name,
          },
        },
      });

    if (existingCategory) {
      throw new BadRequestException(
        'A category with this name already exists.',
      );
    }

    const data = await this.databaseService.grammarCategory.create({
      data: {
        name,
        description,
        idUser,
      },
    });

    return {
      message: 'Grammar category created successfully',
      data,
      status: 200,
    };
  }

  async findAll(idUser: string) {
    const categories = await this.databaseService.grammarCategory.findMany({
      where: {
        OR: [
          {
            idUser: idUser,
          },
          {
            idUser: null,
          },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        _count: {
          select: { grammars: true },
        },
      },
    });

    return {
      message: 'Grammar categories retrieved successfully',
      data: categories,
      status: 200,
    };
  }

  async findOne(idGrammarCategories: string) {
    const category = await this.databaseService.grammarCategory.findUnique({
      where: { idGrammarCategory: idGrammarCategories },
      include: {
        grammars: {
          include: {
            grammar: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Grammar category not found');
    }

    const grammarsData = category.grammars.map((item) => item.grammar);

    return {
      message: 'Grammar category retrieved successfully',
      data: {
        ...category,
        grammars: grammarsData,
      },
      status: 200,
    };
  }

  async update(
    id: string,
    updateGrammarCategoryDto: UpdateGrammarCategoryDto,
    idUser: string,
  ) {
    const { name, description } = updateGrammarCategoryDto;

    const categoryToUpdate =
      await this.databaseService.grammarCategory.findUnique({
        where: { idGrammarCategory: id },
      });

    if (!categoryToUpdate) {
      throw new BadRequestException('Grammar category not found');
    }

    if (categoryToUpdate.idUser !== idUser) {
      throw new ForbiddenException('You are not allowed to edit this category');
    }

    if (name && name !== categoryToUpdate.name) {
      const existingCategory =
        await this.databaseService.grammarCategory.findUnique({
          where: {
            idUser_name: { idUser, name },
          },
        });

      if (existingCategory) {
        throw new BadRequestException(
          'A category with this name already exists.',
        );
      }
    }

    const data = await this.databaseService.grammarCategory.update({
      where: {
        idGrammarCategory: id,
        idUser: idUser,
      },
      data: {
        name,
        description,
      },
    });

    return {
      message: 'Grammar category updated successfully',
      data,
      status: 200,
    };
  }

  async remove(id: string, idUser: string) {
    const categoryToDelete =
      await this.databaseService.grammarCategory.findUnique({
        where: { idGrammarCategory: id },
      });

    if (!categoryToDelete) {
      throw new BadRequestException('Grammar category not found');
    }

    if (categoryToDelete.idUser === null) {
      throw new ForbiddenException('You cannot delete a system category.');
    }

    if (categoryToDelete.idUser !== idUser) {
      throw new ForbiddenException(
        'You are not allowed to delete this category.',
      );
    }

    await this.databaseService.grammarCategory.delete({
      where: {
        idGrammarCategory: id,
        idUser: idUser,
      },
    });

    return {
      message: 'Grammar category deleted successfully',
      status: 200,
    };
  }
}
