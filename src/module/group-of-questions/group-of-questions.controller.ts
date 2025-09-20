import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GroupOfQuestionsService } from './group-of-questions.service';
import { CreateGroupOfQuestionDto } from './dto/create-group-of-question.dto';
import { UpdateGroupOfQuestionDto } from './dto/update-group-of-question.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('group-of-questions')
export class GroupOfQuestionsController {
  constructor(
    private readonly groupOfQuestionsService: GroupOfQuestionsService,
  ) {}

  @Post('create-group-question')
  create(@Body() createGroupOfQuestionDto: CreateGroupOfQuestionDto) {
    return this.groupOfQuestionsService.createGroupOfQuestions(
      createGroupOfQuestionDto,
    );
  }

  @Get()
  findByIdpart(idPart: string) {
    return this.groupOfQuestionsService.findByIdPart(idPart);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.groupOfQuestionsService.findById(+id);
  // }

  @Patch('update-group-of-questions/:idGroupOfQuestions')
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
