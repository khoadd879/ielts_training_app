import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ForumCommentLikesService } from './forum-comment-likes.service';
import { CreateForumCommentLikeDto } from './dto/create-forum-comment-like.dto';
import { UpdateForumCommentLikeDto } from './dto/update-forum-comment-like.dto';

@Controller('forum-comment-likes')
export class ForumCommentLikesController {
  constructor(private readonly forumCommentLikesService: ForumCommentLikesService) {}

  @Post()
  create(@Body() createForumCommentLikeDto: CreateForumCommentLikeDto) {
    return this.forumCommentLikesService.create(createForumCommentLikeDto);
  }

  @Get()
  findAll() {
    return this.forumCommentLikesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.forumCommentLikesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateForumCommentLikeDto: UpdateForumCommentLikeDto) {
    return this.forumCommentLikesService.update(+id, updateForumCommentLikeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.forumCommentLikesService.remove(+id);
  }
}
