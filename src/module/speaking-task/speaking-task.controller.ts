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
  ApiBody,
  ApiConsumes,
  ApiProperty,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@Controller('speaking-task')
export class SpeakingTaskController {
  constructor(private readonly speakingTaskService: SpeakingTaskService) {}

  @Post('create-speaking-task')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idDe: { type: 'string', example: '123' },
        title: { type: 'string', example: 'Sample Speaking Task' },
        audioPromptUrl: { type: 'string', format: 'binary' },
      },
    },
  })
  create(
    @Body() createSpeakingTaskDto: CreateSpeakingTaskDto,
    audioPromptUrl?: Express.Multer.File,
  ) {
    return this.speakingTaskService.create(
      createSpeakingTaskDto,
      audioPromptUrl,
    );
  }

  @Get('find-all-speaking-tasks')
  findAll() {
    return this.speakingTaskService.findAll();
  }

  @Patch('update-speaking-task/:idSpeakingTask')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idDe: { type: 'string', example: '123' },
        title: { type: 'string', example: 'Updated Speaking Task' },
        audioPromptUrl: { type: 'string', format: 'binary' },
      },
    },
  })
  update(
    @Param('idSpeakingTask') idSpeakingTask: string,
    @Body() updateSpeakingTaskDto: UpdateSpeakingTaskDto,
    audioPromptUrl?: Express.Multer.File,
  ) {
    return this.speakingTaskService.update(
      idSpeakingTask,
      updateSpeakingTaskDto,
      audioPromptUrl,
    );
  }

  @Delete('remove-speaking-task/:idSpeakingTask')
  remove(@Param('idSpeakingTask') idSpeakingTask: string) {
    return this.speakingTaskService.remove(idSpeakingTask);
  }
}
