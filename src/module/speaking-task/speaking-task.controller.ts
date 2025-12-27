import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { SpeakingTaskService } from './speaking-task.service';
import { CreateSpeakingTaskDto } from './dto/create-speaking-task.dto';
import { UpdateSpeakingTaskDto } from './dto/update-speaking-task.dto';
import {
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('speaking-task')
export class SpeakingTaskController {
  constructor(private readonly speakingTaskService: SpeakingTaskService) {}

  @Post('create-speaking-task')
  create(
    @Body() createSpeakingTaskDto: CreateSpeakingTaskDto
  ) {
    return this.speakingTaskService.create(
      createSpeakingTaskDto,
    );
  }

  @Get('find-all-speaking-tasks-in-test/:idTest')
  findAll(@Param('idTest') idTest: string) {
    return this.speakingTaskService.findAllSpeakingTaskInTest(idTest);
  }

  @Get('find-speaking-task/:idSpeakingTask')
  findOne(@Param('idSpeakingTask') idSpeakingTask: string){
    return this.speakingTaskService.findOne(idSpeakingTask)
  }

  @Patch('update-speaking-task/:idSpeakingTask') 
  update(
    @Param('idSpeakingTask') idSpeakingTask: string,
    @Body() updateSpeakingTaskDto: UpdateSpeakingTaskDto) {
    return this.speakingTaskService.update(
      idSpeakingTask,
      updateSpeakingTaskDto 
    );
  }

  @Delete('remove-speaking-task/:idSpeakingTask')
  remove(@Param('idSpeakingTask') idSpeakingTask: string) {
    return this.speakingTaskService.remove(idSpeakingTask);
  }
}
