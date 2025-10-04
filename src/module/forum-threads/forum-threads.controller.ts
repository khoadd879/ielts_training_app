import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ForumThreadsService } from './forum-threads.service';
import { CreateForumThreadDto } from './dto/create-forum-thread.dto';
import { UpdateForumThreadDto } from './dto/update-forum-thread.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('forum-threads')
export class ForumThreadsController {
  constructor(private readonly forumThreadsService: ForumThreadsService) {}

  @Post('create-forum-threads')
  create(@Body() createForumThreadDto: CreateForumThreadDto) {
    return this.forumThreadsService.createForumThread(createForumThreadDto);
  }

  @Get('get-forum-threads-by-idForumCategories/:idForumCategories')
  findAll(@Param('idForumCategories') idForumCategories: string) {
    return this.forumThreadsService.findAllByIdForumCategories(
      idForumCategories,
    );
  }

  @Get('get-forum-thread/:idForumCategories')
  findOne(@Param('idForumCategories') idForumCategories: string) {
    return this.forumThreadsService.findForumThread(idForumCategories);
  }

  @Patch('update-forum-thread/:idForumThreads')
  update(
    @Param('idForumThreads') idForumThreads: string,
    @Body() updateForumThreadDto: UpdateForumThreadDto,
  ) {
    return this.forumThreadsService.updateForumThread(
      idForumThreads,
      updateForumThreadDto,
    );
  }

  @Delete('delete-forum-thread/:idForumThreads')
  remove(@Param('idForumThreads') idForumThreads: string) {
    return this.forumThreadsService.removeForumThread(idForumThreads);
  }
}
