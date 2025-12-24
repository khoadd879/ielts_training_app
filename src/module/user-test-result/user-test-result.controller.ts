import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { UserTestResultService } from './user-test-result.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { FinishTestWritingDto } from './dto/finish-test-writing.dto';
import { FinishTestSpeakingDto } from './dto/finish-test-speaking.dto';

@ApiBearerAuth()
@Controller('user-test-result')
export class UserTestResultController {
  constructor(private readonly userTestResultService: UserTestResultService) { }

  @Get('get-all-test-result-by-id-user/:idUser')
  @ApiOperation({
    summary: 'Lấy tất cả kết quả bài test của user',
    description: 'Lấy danh sách tất cả kết quả bài test theo ID người dùng'
  })
  @ApiParam({ name: 'idUser', description: 'ID của người dùng', example: 'uuid-user-1' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAllTestResultByIdUser(@Param('idUser') idUser: string) {
    return this.userTestResultService.findAllTestResultByIdUser(idUser);
  }

  @Get('get-test-result/:idTestResult')
  @ApiOperation({
    summary: 'Lấy kết quả bài test theo ID',
    description: 'Lấy chi tiết kết quả một bài test'
  })
  @ApiParam({ name: 'idTestResult', description: 'ID của kết quả bài test', example: 'uuid-test-result-1' })
  @ApiResponse({ status: 200, description: 'Lấy kết quả thành công' })
  findOne(@Param('idTestResult') idTestResult: string) {
    return this.userTestResultService.findOne(idTestResult);
  }

  @Get('get-all-test-results')
  @ApiOperation({
    summary: 'Lấy tất cả kết quả bài test',
    description: 'Lấy danh sách tất cả kết quả bài test trong hệ thống'
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAllTestResults() {
    return this.userTestResultService.findAllTestResults();
  }

  @Get('get-test-result-and-answers/:idTestResult')
  @ApiOperation({
    summary: 'Lấy kết quả bài test và các câu trả lời',
    description: 'Lấy chi tiết kết quả bài test bao gồm tất cả câu trả lời'
  })
  @ApiParam({ name: 'idTestResult', description: 'ID của kết quả bài test', example: 'uuid-test-result-1' })
  @ApiResponse({ status: 200, description: 'Lấy dữ liệu thành công' })
  findALlTestResultAndAnswers(@Param('idTestResult') idTestResult: string) {
    return this.userTestResultService.getAllAnswerInTestResult(idTestResult);
  }

  @Delete('delete-test-result/:idTestResult')
  @ApiOperation({
    summary: 'Xóa kết quả bài test',
    description: 'Xóa một kết quả bài test khỏi hệ thống'
  })
  @ApiParam({ name: 'idTestResult', description: 'ID của kết quả bài test cần xóa', example: 'uuid-test-result-1' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  deleteTestResult(@Param('idTestResult') idTestResult: string) {
    return this.userTestResultService.deleteTestResult(idTestResult);
  }

  @Post('start-test/:idUser/:idTest')
  @ApiOperation({
    summary: 'Bắt đầu làm bài test',
    description: 'Khởi tạo một phiên làm bài test mới cho người dùng'
  })
  @ApiParam({ name: 'idUser', description: 'ID của người dùng', example: 'uuid-user-1' })
  @ApiParam({ name: 'idTest', description: 'ID của bài test', example: 'uuid-test-1' })
  @ApiResponse({ status: 201, description: 'Bắt đầu test thành công' })
  startTest(@Param('idUser') idUser: string, @Param('idTest') idTest: string) {
    return this.userTestResultService.startTest(idUser, idTest);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('finish-test/:idTestResult/:idUser')
  @ApiOperation({
    summary: 'Hoàn thành bài test',
    description: 'Đánh dấu bài test đã hoàn thành và tính điểm'
  })
  @ApiParam({ name: 'idTestResult', description: 'ID của kết quả bài test', example: 'uuid-test-result-1' })
  @ApiParam({ name: 'idUser', description: 'ID của người dùng', example: 'uuid-user-1' })
  @ApiResponse({ status: 200, description: 'Hoàn thành test thành công' })
  finishTest(
    @Param('idTestResult') idTestResult: string,
    @Param('idUser') idUser: string,
  ) {
    return this.userTestResultService.finishTest(idTestResult, idUser);
  }

  @Patch('finish-test-writing/:idTestResult/:idUser')
  @ApiOperation({
    summary: 'Hoàn thành bài test Writing',
    description: 'Hoàn thành bài test Writing và chấm điểm bằng AI'
  })
  @ApiParam({ name: 'idTestResult', description: 'ID của kết quả bài test', example: 'uuid-test-result-1' })
  @ApiParam({ name: 'idUser', description: 'ID của người dùng', example: 'uuid-user-1' })
  @ApiBody({ type: FinishTestWritingDto })
  @ApiResponse({ status: 200, description: 'Hoàn thành và chấm điểm Writing thành công' })
  finishTestWriting(
    @Param('idTestResult') idTestResult: string,
    @Param('idUser') idUser: string,
    @Body() finishTestWritingDto: FinishTestWritingDto,
  ) {
    return this.userTestResultService.finishTestWriting(
      idTestResult,
      idUser,
      finishTestWritingDto,
    );
  }

  @Delete('reset-test/:idTestResult')
  @ApiOperation({
    summary: 'Reset bài test',
    description: 'Đặt lại trạng thái bài test để làm lại từ đầu'
  })
  @ApiParam({ name: 'idTestResult', description: 'ID của kết quả bài test cần reset', example: 'uuid-test-result-1' })
  @ApiResponse({ status: 200, description: 'Reset test thành công' })
  resetTest(@Param('idTestResult') idTestResult: string) {
    return this.userTestResultService.resetTest(idTestResult);
  }

  @Patch('finish-test-speaking/:idTestResult/:idUser')
  @ApiOperation({
    summary: 'Hoàn thành bài test Speaking',
    description: 'Upload audio files cho các phần Speaking (Part 1, 2, 3) và chấm điểm bằng AI'
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'idTestResult', description: 'ID của kết quả bài test', example: 'uuid-test-result-1' })
  @ApiParam({ name: 'idUser', description: 'ID của người dùng', example: 'uuid-user-1' })
  @ApiBody({
    description: 'Upload audio files và speaking task ID',
    schema: {
      type: 'object',
      properties: {
        part1Audio: {
          type: 'string',
          format: 'binary',
          description: 'Audio file cho Part 1 (optional)',
        },
        part2Audio: {
          type: 'string',
          format: 'binary',
          description: 'Audio file cho Part 2 (optional)',
        },
        part3Audio: {
          type: 'string',
          format: 'binary',
          description: 'Audio file cho Part 3 (optional)',
        },
        idSpeakingTask: {
          type: 'string',
          description: 'ID của Speaking Task (optional, nếu không có sẽ lấy từ test)',
          example: 'uuid-speaking-task-1',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Hoàn thành và chấm điểm Speaking thành công, cập nhật XP và streak'
  })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'part1Audio', maxCount: 1 },
    { name: 'part2Audio', maxCount: 1 },
    { name: 'part3Audio', maxCount: 1 },
  ]))
  finishTestSpeaking(
    @Param('idTestResult') idTestResult: string,
    @Param('idUser') idUser: string,
    @Body() finishTestSpeakingDto: FinishTestSpeakingDto,
    @UploadedFiles() files: {
      part1Audio?: Express.Multer.File[],
      part2Audio?: Express.Multer.File[],
      part3Audio?: Express.Multer.File[],
    },
  ) {
    return this.userTestResultService.finishTestSpeaking(
      idTestResult,
      idUser,
      files,
      finishTestSpeakingDto,
    );
  }
}
