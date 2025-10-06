import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ForumPostService } from './forum-post.service';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { UpdateForumPostDto } from './dto/update-forum-post.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@Controller('forum-post')
export class ForumPostController {
  constructor(private readonly forumPostService: ForumPostService) {}

  @Post('create-forum-post')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idForumThreads: { type: 'string', example: '123' },
        idUser: { type: 'string', example: '123' },
        file: { type: 'string', format: 'binary' },
        content: { type: 'string', example: 'content' },
      },
    },
  })
  create(
    @Body() createForumPostDto: CreateForumPostDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.forumPostService.createForumPost(createForumPostDto, file);
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idForumThreads: { type: 'string', example: '123' },
        idUser: { type: 'string', example: '123' },
        file: { type: 'string', format: 'binary' },
        content: { type: 'string', example: 'content' },
      },
    },
  })
  update(
    @Param('idForumPost') idForumPost: string,
    @Body() updateForumPostDto: UpdateForumPostDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.forumPostService.updateForumPost(
      idForumPost,
      updateForumPostDto,
      file,
    );
  }

  @Delete('delete-forum-post/:idForumPost')
  remove(@Param('idForumPost') idForumPost: string) {
    return this.forumPostService.removeForumPost(idForumPost);
  }
}
