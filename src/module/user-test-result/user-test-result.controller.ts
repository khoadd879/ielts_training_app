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
} from '@nestjs/common';
import { UserTestResultService } from './user-test-result.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { FinishTestWritingDto } from './dto/finish-test-writing.dto';

@ApiBearerAuth()
@Controller('user-test-result')
export class UserTestResultController {
  constructor(private readonly userTestResultService: UserTestResultService) {}

  @Get('get-all-test-result-by-id-user/:idUser')
  findAllTestResultByIdUser(@Param('idUser') idUser: string) {
    return this.userTestResultService.findAllTestResultByIdUser(idUser);
  }

  @Get('get-test-result/:idTestResult')
  findOne(@Param('idTestResult') idTestResult: string) {
    return this.userTestResultService.findOne(idTestResult);
  }

  @Get('get-all-test-results')
  findAllTestResults() {
    return this.userTestResultService.findAllTestResults();
  }

  @Get('get-test-result-and-answers/:idTestResult')
  findALlTestResultAndAnswers(@Param('idTestResult') idTestResult: string) {
    return this.userTestResultService.getAllAnswerInTestResult(idTestResult);
  }

  @Delete('delete-test-result/:idTestResult')
  deleteTestResult(@Param('idTestResult') idTestResult: string) {
    return this.userTestResultService.deleteTestResult(idTestResult);
  }

  @Post('start-test/:idUser/:idTest')
  startTest(@Param('idUser') idUser: string, @Param('idTest') idTest: string) {
    return this.userTestResultService.startTest(idUser, idTest);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('finish-test/:idTestResult/:idUser')
  finishTest(
    @Param('idTestResult') idTestResult: string,
    @Param('idUser') idUser: string,
  ) {
    return this.userTestResultService.finishTest(idTestResult, idUser);
  }

  @Patch('finish-test-writing/:idTestResult/:idUser')
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
  resetTest(@Param('idTestResult') idTestResult: string) {
    return this.userTestResultService.resetTest(idTestResult);
  }
}
