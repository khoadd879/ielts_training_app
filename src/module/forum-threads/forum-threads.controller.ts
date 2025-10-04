import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ForumThreadsService } from './forum-threads.service';
import { CreateForumThreadDto } from './dto/create-forum-thread.dto';
import { UpdateForumThreadDto } from './dto/update-forum-thread.dto';

@Controller('forum-threads')
export class ForumThreadsController {
  constructor(private readonly forumThreadsService: ForumThreadsService) {}

  @Post()
  create(@Body() createForumThreadDto: CreateForumThreadDto) {
    return this.forumThreadsService.create(createForumThreadDto);
  }

  @Get()
  findAll() {
    return this.forumThreadsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.forumThreadsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateForumThreadDto: UpdateForumThreadDto) {
    return this.forumThreadsService.update(+id, updateForumThreadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.forumThreadsService.remove(+id);
  }
}
