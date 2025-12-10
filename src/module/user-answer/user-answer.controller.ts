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

@ApiBearerAuth()
@Controller('user-answer')
export class UserAnswerController {
  constructor(private readonly userAnswerService: UserAnswerService) {}

  // @Post('upsert-user-answer')
  // UpsertCreateUserAnswer(@Body() createUserAnswerDto: CreateUserAnswerDto) {
  //   return this.userAnswerService.UpsertCreateUserAnswer(createUserAnswerDto);
  // }

  @Get('get-answer/:idTestResult')
  getAnswers(@Param('idTestResult') idTestResult: string) {
    return this.userAnswerService.getAnswers(idTestResult);
  }
}
