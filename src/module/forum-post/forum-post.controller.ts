import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseInterceptors,
  UploadedFile,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { ForumPostService } from './forum-post.service';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { UpdateForumPostDto } from './dto/update-forum-post.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReviewForumPostDto } from './dto/review-forum-post.dto';

@ApiBearerAuth()
@Controller('forum-post')
export class ForumPostController {
  constructor(private readonly forumPostService: ForumPostService) {}

  @Post('create-forum-post')
  @HttpCode(202)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
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

  @Get('get-all-forum-post-byIdForumThread/:idForumThreads/:idUser')
  findAll(
    @Param('idForumThreads') idForumThreads: string,
    @Param('idUser') idUser: string,
  ) {
    return this.forumPostService.findAllByIdForumThread(idForumThreads, idUser);
  }

  @Get('get-forum-post/:idForumPost/:idUser')
  findOne(
    @Param('idForumPost') idForumPost: string,
    @Param('idUser') idUser: string,
  ) {
    return this.forumPostService.findForumPost(idForumPost, idUser);
  }

  @Get('posts-by-user/:idUser')
  findPostsByUser(
    @Param('idUser') idUser: string,
    @Req() req: Request,
  ) {
    const viewerId = (req.user as { userId?: string } | undefined)?.userId;
    return this.forumPostService.findPostsByUser(idUser, viewerId ?? idUser);
  }

  @Get('moderation-queue/:idUser')
  getModerationQueue(@Param('idUser') idUser: string) {
    return this.forumPostService.getModerationQueue(idUser);
  }

  @Get('moderation-history/:idUser')
  getModerationHistory(@Param('idUser') idUser: string) {
    return this.forumPostService.getModerationHistory(idUser);
  }

  @Patch('moderation-review/:idForumPost')
  reviewForumPost(
    @Param('idForumPost') idForumPost: string,
    @Body() reviewForumPostDto: ReviewForumPostDto,
  ) {
    return this.forumPostService.reviewForumPost(
      idForumPost,
      reviewForumPostDto,
    );
  }

  @Patch('update-forum-post/:idForumPost')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
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
  remove(
    @Param('idForumPost') idForumPost: string,
    @Body('idUser') idUser: string,
  ) {
    return this.forumPostService.removeForumPost(idForumPost, idUser);
  }

  @Delete('moderator-delete-forum-post/:idForumPost/:idUser')
  moderatorRemove(
    @Param('idForumPost') idForumPost: string,
    @Param('idUser') idUser: string,
    @Body('note') note?: string,
  ) {
    return this.forumPostService.moderatorRemoveForumPost(
      idForumPost,
      idUser,
      note,
    );
  }
}
