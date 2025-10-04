import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ForumPostService } from './forum-post.service';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { UpdateForumPostDto } from './dto/update-forum-post.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('forum-post')
export class ForumPostController {
  constructor(private readonly forumPostService: ForumPostService) {}

  @Post('create-forum-post')
  create(@Body() createForumPostDto: CreateForumPostDto) {
    return this.forumPostService.createForumPost(createForumPostDto);
  }

  @Get('get-all-forum-post-byIdForumThread/:idForumThreads')
  findAll(@Param('idForumThreads') idForumThreads: string) {
    return this.forumPostService.findAllByIdForumThread(idForumThreads);
  }

  @Get('get-forum-post/:idForumPost')
  findOne(@Param('idForumPost') idForumPost: string) {
    return this.forumPostService.findForumPost(idForumPost);
  }

  @Patch('update-forum-post/:idForumPost')
  update(
    @Param('idForumPost') idForumPost: string,
    @Body() updateForumPostDto: UpdateForumPostDto,
  ) {
    return this.forumPostService.updateForumPost(
      idForumPost,
      updateForumPostDto,
    );
  }

  @Delete('delete-forum-post/:idForumPost')
  remove(@Param('idForumPost') idForumPost: string) {
    return this.forumPostService.removeForumPost(idForumPost);
  }
}
