import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SpeakingQuestionService } from './speaking-question.service';
import { CreateSpeakingQuestionDto } from './dto/create-speaking-question.dto';
import { UpdateSpeakingQuestionDto } from './dto/update-speaking-question.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('speaking-question')
export class SpeakingQuestionController {
  constructor(
    private readonly speakingQuestionService: SpeakingQuestionService,
  ) {}

  @Post('create-speaking-question')
  create(@Body() createSpeakingQuestionDto: CreateSpeakingQuestionDto) {
    return this.speakingQuestionService.create(createSpeakingQuestionDto);
  }

  @Get('find-all-speaking-questions-by-id-speaking-task/:idSpeakingTask')
  findAll(@Param('idSpeakingTask') idSpeakingTask: string) {
    return this.speakingQuestionService.findAllbyIdSpeakingTask(idSpeakingTask);
  }

  @Patch('update-speaking-question/:idSpeakingQuestion')
  update(
    @Param('idSpeakingQuestion') idSpeakingQuestion: string,
    @Body() updateSpeakingQuestionDto: UpdateSpeakingQuestionDto,
  ) {
    return this.speakingQuestionService.update(
      idSpeakingQuestion,
      updateSpeakingQuestionDto,
    );
  }

  @Delete('remove-speaking-question/:idSpeakingQuestion')
  remove(@Param('idSpeakingQuestion') idSpeakingQuestion: string) {
    return this.speakingQuestionService.remove(idSpeakingQuestion);
  }
}
