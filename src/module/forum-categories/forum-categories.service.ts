import { Injectable } from '@nestjs/common';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { UpdateForumCategoryDto } from './dto/update-forum-category.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ForumCategoriesService {
  constructor(databaseService: DatabaseService) {}
  create(createForumCategoryDto: CreateForumCategoryDto) {}

  findAll() {
    return `This action returns all forumCategories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} forumCategory`;
  }

  update(id: number, updateForumCategoryDto: UpdateForumCategoryDto) {
    return `This action updates a #${id} forumCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} forumCategory`;
  }
}
