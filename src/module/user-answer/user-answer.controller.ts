import {
  Controller,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { UserAnswerService } from './user-answer.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateManyUserAnswerDto } from './dto/create-many-user-answer.dto';

@ApiBearerAuth()
@Controller('user-answer')
export class UserAnswerController {
  constructor(private readonly userAnswerService: UserAnswerService) {}

  @Post('create-many-user-answers/:idUser/:idTestResult')
  createManyUserAnswers(
    @Body() dto: CreateManyUserAnswerDto,
    @Param('idUser') idUser: string,
    @Param('idTestResult') idTestResult: string,
  ) {
    return this.userAnswerService.createManyUserAnswers(idUser, idTestResult, dto);
  }
}
