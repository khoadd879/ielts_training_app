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
import { GroupOfQuestionsService } from './group-of-questions.service';
import { CreateGroupOfQuestionDto } from './dto/create-group-of-question.dto';
import { UpdateGroupOfQuestionDto } from './dto/update-group-of-question.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@Controller('group-of-questions')
export class GroupOfQuestionsController {
  constructor(
    private readonly groupOfQuestionsService: GroupOfQuestionsService,
  ) {}

  @Post('create-group-question')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idTest: { type: 'string', example: '123' },
        idPart: { type: 'string', example: 'a@gmail.com' },
        typeQuestion: { type: 'string', example: 'MCQ' },
        title: { type: 'string', example: 'example' },
        quantity: { type: 'number', example: '40' },
        img: { type: 'string', format: 'binary' },
      },
    },
  })
  create(
    @Body() createGroupOfQuestionDto: CreateGroupOfQuestionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.groupOfQuestionsService.createGroupOfQuestions(
      createGroupOfQuestionDto,
      file,
    );
  }

  @Get('get-by-id-part/:idPart')
  findByIdpart(@Param('idPart') idPart: string) {
    return this.groupOfQuestionsService.findByIdPart(idPart);
  }

  @Get('get-by-id/:idGroupOfQuestions')
  findById(@Param('idGroupOfQuestions') idGroupOfQuestions: string) {
    return this.groupOfQuestionsService.findById(idGroupOfQuestions);
  }

  @Patch('update-group-of-questions/:idGroupOfQuestions')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idTest: { type: 'string', example: '123' },
        idPart: { type: 'string', example: 'a@gmail.com' },
        typeQuestion: { type: 'string', example: 'MCQ' },
        title: { type: 'string', example: 'example' },
        quantity: { type: 'number', example: '40' },
        img: { type: 'string', format: 'binary' },
      },
    },
  })
  update(
    @Param('idGroupOfQuestions') idGroupOfQuestions: string,
    @Body() updateGroupOfQuestionDto: UpdateGroupOfQuestionDto,
  ) {
    return this.groupOfQuestionsService.updateGroupOfQuestion(
      idGroupOfQuestions,
      updateGroupOfQuestionDto,
    );
  }

  @Delete('delete-group-of-questions/:idGroupOfQuestions')
  removeGroupOfQuestions(
    @Param('idGroupOfQuestions') idGroupOfQuestions: string,
  ) {
    return this.groupOfQuestionsService.removeGroupOfQuestions(
      idGroupOfQuestions,
    );
  }
}
