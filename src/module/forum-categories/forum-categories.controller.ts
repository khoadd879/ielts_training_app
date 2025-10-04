import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ForumCategoriesService } from './forum-categories.service';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { UpdateForumCategoryDto } from './dto/update-forum-category.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('forum-categories')
export class ForumCategoriesController {
  constructor(
    private readonly forumCategoriesService: ForumCategoriesService,
  ) {}

  @Post('create-forum-category')
  create(@Body() createForumCategoryDto: CreateForumCategoryDto) {
    return this.forumCategoriesService.createForumCategories(
      createForumCategoryDto,
    );
  }

  @Get('get-all-forum-categories')
  findAll() {
    return this.forumCategoriesService.findAllForumCategories();
  }

  @Get('get-forum-category/:idForumCategories')
  findOne(@Param('idForumCategories') idForumCategories: string) {
    return this.forumCategoriesService.findOneForumCategory(idForumCategories);
  }

  @Patch('update-forum-category/:idForumCategories')
  update(
    @Param('idForumCategories') idForumCategories: string,
    @Body() updateForumCategoryDto: UpdateForumCategoryDto,
  ) {
    return this.forumCategoriesService.updateForumCategories(
      idForumCategories,
      updateForumCategoryDto,
    );
  }

  @Delete('delete-forum-category/:idForumCategories')
  remove(@Param('idForumCategories') idForumCategories: string) {
    return this.forumCategoriesService.removeForumCategory(idForumCategories);
  }
}
