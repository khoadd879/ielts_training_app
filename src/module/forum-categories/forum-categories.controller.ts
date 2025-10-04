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

@Controller('forum-categories')
export class ForumCategoriesController {
  constructor(
    private readonly forumCategoriesService: ForumCategoriesService,
  ) {}

  @Post()
  create(@Body() createForumCategoryDto: CreateForumCategoryDto) {
    return this.forumCategoriesService.createForumCategories(
      createForumCategoryDto,
    );
  }

  @Get()
  findAll() {
    return this.forumCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.forumCategoriesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateForumCategoryDto: UpdateForumCategoryDto,
  ) {
    return this.forumCategoriesService.update(+id, updateForumCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.forumCategoriesService.remove(+id);
  }
}
