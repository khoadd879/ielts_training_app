import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ForumPostLikesService } from './forum-post-likes.service';
import { CreateForumPostLikeDto } from './dto/create-forum-post-like.dto';
import { UpdateForumPostLikeDto } from './dto/update-forum-post-like.dto';

@Controller('forum-post-likes')
export class ForumPostLikesController {
  constructor(private readonly forumPostLikesService: ForumPostLikesService) {}

  @Post()
  create(@Body() createForumPostLikeDto: CreateForumPostLikeDto) {
    return this.forumPostLikesService.create(createForumPostLikeDto);
  }

  @Get()
  findAll() {
    return this.forumPostLikesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.forumPostLikesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateForumPostLikeDto: UpdateForumPostLikeDto) {
    return this.forumPostLikesService.update(+id, updateForumPostLikeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.forumPostLikesService.remove(+id);
  }
}
