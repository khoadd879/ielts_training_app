import {
  Controller,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { UserAnswerService } from './user-answer.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { CreateManyUserAnswerDto } from './dto/create-many-user-answer.dto';

@ApiBearerAuth()
@Controller('user-answer')
export class UserAnswerController {
  constructor(private readonly userAnswerService: UserAnswerService) {}

  @Post('save-progress/:idUser/:idTestResult')
  @ApiOperation({
    summary: 'Lưu nháp câu trả lời (save-progress)',
    description: 'Lưu hoặc cập nhật câu trả lời khi thí sinh đang làm bài. Không chấm điểm.',
  })
  @ApiParam({ name: 'idUser', example: 'uuid-user-1' })
  @ApiParam({ name: 'idTestResult', example: 'uuid-test-result-1' })
  @ApiBody({ type: CreateManyUserAnswerDto })
  saveProgress(
    @Body() dto: CreateManyUserAnswerDto,
    @Param('idUser') idUser: string,
    @Param('idTestResult') idTestResult: string,
  ) {
    return this.userAnswerService.saveProgress(idUser, idTestResult, dto);
  }
}
