import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { WritingTaskService } from './writing-task.service';
import { CreateWritingTaskDto } from './dto/create-writing-task.dto';
import { UpdateWritingTaskDto } from './dto/update-writing-task.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('writing-task')
export class WritingTaskController {
  constructor(private readonly writingTaskService: WritingTaskService) {}

  @Post('create-writing-task')
  create(@Body() createWritingTaskDto: CreateWritingTaskDto) {
    return this.writingTaskService.createWritingTask(createWritingTaskDto);
  }

  @Get('get-all-writing-tasl')
  findAll() {
    return this.writingTaskService.findAll();
  }

  @Get('get-writing-task/:idWritingTask')
  findOne(@Param('idWritingTask') idWritingTask: string) {
    return this.writingTaskService.findOne(idWritingTask);
  }

  @Patch('update-writing-task/:idWritingTask')
  update(
    @Param('idWritingTask') idWritingTask: string,
    @Body() updateWritingTaskDto: UpdateWritingTaskDto,
  ) {
    return this.writingTaskService.updateWritingTask(
      idWritingTask,
      updateWritingTaskDto,
    );
  }

  @Delete('delete-writing-task/:idWritingTask')
  remove(@Param('idWritingTask') idWritingTask: string) {
    return this.writingTaskService.remove(idWritingTask);
  }
}
