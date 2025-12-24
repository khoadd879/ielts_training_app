import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserWritingSubmissionService } from './user-writing-submission.service';
import { CreateUserWritingSubmissionDto } from './dto/create-user-writing-submission.dto';
import { UpdateUserWritingSubmissionDto } from './dto/update-user-writing-submission.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('user-writing-submission')
export class UserWritingSubmissionController {
  constructor(
    private readonly userWritingSubmissionService: UserWritingSubmissionService,
  ) {}

  @Post('create-writing-submission/:idTestResult')
  create(
    @Param('idTestResult') idTestResult: string,
    @Body() createUserWritingSubmissionDto: CreateUserWritingSubmissionDto,
  ) {
    return this.userWritingSubmissionService.createUserWritingSubmission(
      idTestResult,
      createUserWritingSubmissionDto,
    );
  }

  @Get('get-all-writing-submission-by-id-user/:idUser')
  findAll(@Param('idUser') idUser: string) {
    return this.userWritingSubmissionService.findAllByIdUser(idUser);
  }

  @Get('get-writing-submission/:idWritingSubmission')
  findOne(@Param('idWritingSubmission') idWritingSubmission: string) {
    return this.userWritingSubmissionService.findOne(idWritingSubmission);
  }

  @Patch('update-writing-submission/:idWritingSubmission')
  update(
    @Param('idWritingSubmission') idWritingSubmission: string,
    @Body() updateUserWritingSubmissionDto: UpdateUserWritingSubmissionDto,
  ) {
    return this.userWritingSubmissionService.update(
      idWritingSubmission,
      updateUserWritingSubmissionDto,
    );
  }

  @Delete('delete-writing-submission/:idWritingSubmission')
  remove(@Param('idWritingSubmission') idWritingSubmission: string) {
    return this.userWritingSubmissionService.remove(idWritingSubmission);
  }
}
