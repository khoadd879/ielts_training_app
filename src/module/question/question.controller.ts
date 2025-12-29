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
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { createManyQuestionsDto } from './dto/create-many-question.dto';
import { UpdateManyQuestionsDto } from './dto/update-many-questions.dto';

@ApiBearerAuth()
@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) { }

  @Post('create-question')
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.createQuestion(createQuestionDto);
  }

  @Post('create-many-questions')
  @ApiBody({ type: createManyQuestionsDto })
  createMany(@Body() createQuestionsDto: createManyQuestionsDto) {
    return this.questionService.createManyQuestions(
      createQuestionsDto.questions,
    );
  }

  @Patch('update-many-questions')
  @ApiBody({ type: UpdateManyQuestionsDto })
  updateMany(@Body() updateManyQuestionsDto: UpdateManyQuestionsDto) {
    return this.questionService.updateManyQuestions(updateManyQuestionsDto);
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

  @Patch('update-question/:idQuestion')
  update(
    @Param('idQuestion') idQuestion: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.updateQuestion(idQuestion, updateQuestionDto);
  }

  @Delete('delete-questiong/:idGroupOfQuestions')
  remove(@Param('idGroupOfQuestions') idGroupOfQuestions: string) {
    return this.questionService.removeQuestion(idGroupOfQuestions);
  }
}
