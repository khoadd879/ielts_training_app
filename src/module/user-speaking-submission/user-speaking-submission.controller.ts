import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { UserSpeakingSubmissionService } from './user-speaking-submission.service';
import { CreateUserSpeakingSubmissionDto } from './dto/create-user-speaking-submission.dto';
import { UpdateUserSpeakingSubmissionDto } from './dto/update-user-speaking-submission.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@Controller('user-speaking-submission')
export class UserSpeakingSubmissionController {
  constructor(
    private readonly userSpeakingSubmissionService: UserSpeakingSubmissionService,
  ) {}

  @Post('create-speaking-submission')
  @UseInterceptors(FileInterceptor('audioUrl'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idUser: { type: 'string' },
        idSpeakingTask: { type: 'string' },
        audioUrl: { type: 'string', format: 'binary' },
      },
    },
  })
  create(
    @Body() createUserSpeakingSubmissionDto: CreateUserSpeakingSubmissionDto,
    audioUrl?: Express.Multer.File,
  ) {
    return this.userSpeakingSubmissionService.create(
      createUserSpeakingSubmissionDto,
      audioUrl,
    );
  }
 
}
