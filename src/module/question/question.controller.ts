import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post('create-question')
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.createQuestion(createQuestionDto);
  }

  @Get('find-by-id-group-of-questions/:idGroupOfQuestions')
  findByIdGroupOfQuestion(
    @Param('idGroupOfQuestions') idGroupOfQuestions: string,
  ) {
    return this.questionService.findByIdGroupOfQuestion(idGroupOfQuestions);
  }

  @Get('find-by-id/:idGroupOfQuestions')
  findById(@Param('idGroupOfQuestions') idGroupOfQuestions: string) {
    return this.questionService.findById(idGroupOfQuestions);
  }

  @Patch('update-questiong/:idGroupOfQuestions')
  update(
    @Param('idGroupOfQuestions') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.updateQuestion(id, updateQuestionDto);
  }

  @Delete('delete-questiong/:idGroupOfQuestions')
  remove(@Param('idGroupOfQuestions') id: string) {
    return this.questionService.removeQuestion(id);
  }
}
