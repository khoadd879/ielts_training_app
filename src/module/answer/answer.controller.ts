import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AnswerService } from './answer.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('answer')
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  @Post('create-answer')
  createAnswer(@Body() createAnswerDto: CreateAnswerDto) {
    return this.answerService.createAnswer(createAnswerDto);
  }

  @Get('get-by-id-question/:idCauhoi')
  findByIdQuestion(@Param('idCauhoi') idCauhoi: string) {
    return this.answerService.findByIdQuestion(idCauhoi);
  }

  @Get('get-by-id-answer/:idAnswer')
  findOne(@Param('idAnswer') idAnswer: string) {
    return this.answerService.findOne(idAnswer);
  }

  @Patch('update-answer/:idAnswer')
  updateAnswer(
    @Param('idAnswer') idAnswer: string,
    @Body() updateAnswerDto: UpdateAnswerDto,
  ) {
    return this.answerService.updateAnswer(idAnswer, updateAnswerDto);
  }

  @Delete('delete-answer/:idAnswer')
  removeAnswer(@Param('idAnswer') idAnswer: string) {
    return this.answerService.removeAnswer(idAnswer);
  }
}
