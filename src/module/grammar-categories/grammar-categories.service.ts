import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateGrammarCategoryDto } from './dto/create-grammar-category.dto';
import { UpdateGrammarCategoryDto } from './dto/update-grammar-category.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class GrammarCategoriesService {
  constructor(private readonly databaseService: DatabaseService) {}
  async create(
    createGrammarCategoryDto: CreateGrammarCategoryDto,
    idUser: string,
  ) {
    const { name, description } = createGrammarCategoryDto;
    const existingCategory =
      await this.databaseService.grammarCategory.findUnique({
        where: {
          idUser_name: {
            idUser: idUser,
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
            idUser: idUser, // Lấy TẤT CẢ danh mục của RIÊNG người dùng này
          },
          {
            idUser: null, // VÀ TẤT CẢ danh mục của HỆ THỐNG
          },
        ],
      },
      orderBy: {
        createdAt: 'asc', // Sắp xếp cho nhất quán
      },
      include: {
        // Tùy chọn: Lấy thêm số lượng bài học trong mỗi danh mục
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

  async findOne(id: string) {
    const category = await this.databaseService.grammarCategory.findUnique({
      where: { idGrammarCategory: id },
    });
    if (!category) {
      throw new BadRequestException('Grammar category not found');
    }
    return category;
  }

  async update(
    id: string,
    updateGrammarCategoryDto: UpdateGrammarCategoryDto,
    idUser,
  ) {
    const { name, description } = updateGrammarCategoryDto;
    const existingCategory =
      await this.databaseService.grammarCategory.findUnique({
        where: {
          idUser_name: {
            idUser: idUser,
            name,
          },
        },
      });

    if (existingCategory) {
      throw new BadRequestException(
        'A category with this name already exists.',
      );
    }

    const data = await this.databaseService.grammarCategory.update({
      where: {
        idGrammarCategory: id,
      },
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

  async remove(id: string) {
    const data = await this.databaseService.grammarCategory.delete({
      where: {
        idGrammarCategory: id,
      },
    });

    if (!data) throw new BadRequestException('Grammar category not found');

    return {
      message: 'Grammar category deleted successfully',
      status: 200,
    };
  }
}
