import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { WritingTaskService } from './writing-task.service';
import { CreateWritingTaskDto } from './dto/create-writing-task.dto';
import { UpdateWritingTaskDto } from './dto/update-writing-task.dto';
import { ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@Controller('writing-task')
export class WritingTaskController {
  constructor(private readonly writingTaskService: WritingTaskService) {}

  @Post('create-writing-task')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idDe: { type: 'string', example: '123' },
        task_type: { type: 'string', example: 'TASK1' },
        prompt: { type: 'string', example: 'prompt' },
        image: { type: 'string', format: 'binary' },
        time_limit: { type: 'number', example: 60 },
        word_limit: { type: 'number', example: 300 },
      },
    },
  })
  async create(
    @Body() createWritingTaskDto: CreateWritingTaskDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
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
