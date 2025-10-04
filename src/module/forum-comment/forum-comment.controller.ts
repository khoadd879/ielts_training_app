import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ForumCommentService } from './forum-comment.service';
import { CreateForumCommentDto } from './dto/create-forum-comment.dto';
import { UpdateForumCommentDto } from './dto/update-forum-comment.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('forum-comment')
export class ForumCommentController {
  constructor(private readonly forumCommentService: ForumCommentService) {}

  @Post('create-forum-comment')
  create(@Body() createForumCommentDto: CreateForumCommentDto) {
    return this.forumCommentService.createForumComment(createForumCommentDto);
  }

  @Get('get-all-by-idForumPost/:idForumPost')
  findAll(@Param('idForumPost') idForumPost: string) {
    return this.forumCommentService.findAllByIdPost(idForumPost);
  }

  @Get('get-forum-comment/:idForumComment')
  findOne(@Param('idForumComment') idForumComment: string) {
    return this.forumCommentService.findForumComment(idForumComment);
  }

  @Patch('update-forum-comment/:idForumComment')
  update(
    @Param('idForumComment') idForumComment: string,
    @Body() updateForumCommentDto: UpdateForumCommentDto,
  ) {
    return this.forumCommentService.updateForumcomment(
      idForumComment,
      updateForumCommentDto,
    );
  }

  @Delete('delete-forum-comment/:idForumComment')
  remove(@Param('idForumComment') idForumComment: string) {
    return this.forumCommentService.removeForumComment(idForumComment);
  }
}
