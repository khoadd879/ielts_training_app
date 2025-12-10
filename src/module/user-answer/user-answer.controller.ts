import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserAnswerService } from './user-answer.service';
import { CreateUserAnswerDto } from './dto/create-user-answer.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateManyUserAnswerDto } from './dto/create-many-user-answer.dto';

@ApiBearerAuth()
@Controller('user-answer')
export class UserAnswerController {
  constructor(private readonly userAnswerService: UserAnswerService) {}

  // @Post('upsert-user-answer')
  // UpsertCreateUserAnswer(@Body() createUserAnswerDto: CreateUserAnswerDto) {
  //   return this.userAnswerService.UpsertCreateUserAnswer(createUserAnswerDto);
  // }

  @Post('create-many-user-answers/:idUser/:idTestResult')
  CreateManyUserAnswers(@Body() createManyQuestionsDto: CreateManyUserAnswerDto, @Param('idUser') idUser: string, @Param('idTestResult') idTestResult: string){
    return this.userAnswerService.createManyUserAnswers(idUser, idTestResult, createManyQuestionsDto)
  }

  @Get('get-answer/:idTestResult')
  getAnswers(@Param('idTestResult') idTestResult: string) {
    return this.userAnswerService.getAnswers(idTestResult);
  }
}
