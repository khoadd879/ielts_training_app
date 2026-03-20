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
import { QuestionGroupService } from './question-group.service';
import { CreateQuestionGroupDto } from './dto/create-question-group.dto';
import { UpdateQuestionGroupDto } from './dto/update-question-group.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@Controller('question-group')
export class QuestionGroupController {
  constructor(private readonly questionGroupService: QuestionGroupService) {}

  @Post('create-question-group')
  @UseInterceptors(FileInterceptor('imageUrl'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idPart: { type: 'string', example: '123' },
        questionType: { type: 'string', example: 'MULTIPLE_CHOICE' },
        title: { type: 'string', example: 'Questions 1-5' },
        instructions: {
          type: 'string',
          example: 'Choose TRUE, FALSE, or NOT GIVEN',
        },
        order: { type: 'number', example: 0 },
        imageUrl: { type: 'string', format: 'binary' },
      },
    },
  })
  create(
    @Body() createDto: CreateQuestionGroupDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.questionGroupService.createQuestionGroup(createDto, file);
  }

  @Get('get-by-id-part/:idPart')
  findByIdPart(@Param('idPart') idPart: string) {
    return this.questionGroupService.findByIdPart(idPart);
  }

  @Get('get-by-id/:idQuestionGroup')
  findById(@Param('idQuestionGroup') idQuestionGroup: string) {
    return this.questionGroupService.findById(idQuestionGroup);
  }

  @Patch('update-question-group/:idQuestionGroup')
  @UseInterceptors(FileInterceptor('imageUrl'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idPart: { type: 'string', example: '123' },
        questionType: { type: 'string', example: 'MULTIPLE_CHOICE' },
        title: { type: 'string', example: 'Questions 1-5' },
        instructions: {
          type: 'string',
          example: 'Choose TRUE, FALSE, or NOT GIVEN',
        },
        order: { type: 'number', example: 0 },
        imageUrl: { type: 'string', format: 'binary' },
      },
    },
  })
  update(
    @Param('idQuestionGroup') idQuestionGroup: string,
    @Body() updateDto: UpdateQuestionGroupDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.questionGroupService.updateQuestionGroup(
      idQuestionGroup,
      updateDto,
      file,
    );
  }

  @Delete('delete-question-group/:idQuestionGroup')
  remove(@Param('idQuestionGroup') idQuestionGroup: string) {
    return this.questionGroupService.removeQuestionGroup(idQuestionGroup);
  }
}
