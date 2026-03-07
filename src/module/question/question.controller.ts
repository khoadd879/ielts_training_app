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
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreateManyQuestionsDto } from './dto/create-many-questions.dto';

@ApiBearerAuth()
@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post('create-question')
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.createQuestion(createQuestionDto);
  }

  @Post('create-many-questions')
  @ApiBody({ type: CreateManyQuestionsDto })
  createMany(@Body() dto: CreateManyQuestionsDto) {
    return this.questionService.createManyQuestions(dto.questions);
  }

  @Get('find-by-question-group/:idQuestionGroup')
  findByQuestionGroup(@Param('idQuestionGroup') idQuestionGroup: string) {
    return this.questionService.findByQuestionGroup(idQuestionGroup);
  }

  @Get('find-by-id/:idQuestion')
  findById(@Param('idQuestion') idQuestion: string) {
    return this.questionService.findById(idQuestion);
  }

  @Patch('update-question/:idQuestion')
  update(
    @Param('idQuestion') idQuestion: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.updateQuestion(idQuestion, updateQuestionDto);
  }

  @Delete('delete-question/:idQuestion')
  remove(@Param('idQuestion') idQuestion: string) {
    return this.questionService.removeQuestion(idQuestion);
  }
}
