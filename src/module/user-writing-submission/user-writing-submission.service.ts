import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserWritingSubmissionDto } from './dto/create-user-writing-submission.dto';
import { UpdateUserWritingSubmissionDto } from './dto/update-user-writing-submission.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserWritingSubmissionService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createUserWritingSubmission(
    createUserWritingSubmissionDto: CreateUserWritingSubmissionDto,
  ) {
    const { idUser, idWritingTask, submission_text, score, feedback } =
      createUserWritingSubmissionDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    const existingWritingTask =
      await this.databaseService.writingTask.findUnique({
        where: { idWritingTask },
      });

    if (!existingWritingTask)
      throw new BadRequestException('Writing task not found');

    const data = await this.databaseService.userWritingSubmission.create({
      data: {
        idUser,
        idWritingTask,
        submission_text,
        score: score ?? null,
        feedback: feedback ?? null,
      },
    });

    return {
      message: 'User writing submission created successfully',
      data,
      status: 200,
    };
  }

  async findAllByIdUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });
    if (!existingUser) throw new BadRequestException('User not found');

    const data = await this.databaseService.userWritingSubmission.findMany({
      where: {
        idUser,
      },
    });

    return {
      message: 'User writing submission retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idWritingSubmission: string) {
    const existingWritingSubmission =
      await this.databaseService.userWritingSubmission.findUnique({
        where: {
          idWritingSubmission,
        },
      });
    if (!existingWritingSubmission)
      throw new BadRequestException('User writing submission not found');

    const data = await this.databaseService.userWritingSubmission.findUnique({
      where: {
        idWritingSubmission,
      },
    });
    return {
      message: 'User writing submission retrieved successfully',
      data,
      status: 200,
    };
  }

  async updateUserWritingSubmission(
    idWritingSubmission: string,
    updateUserWritingSubmissionDto: UpdateUserWritingSubmissionDto,
  ) {
    const existingWritingSubmission =
      await this.databaseService.userWritingSubmission.findUnique({
        where: {
          idWritingSubmission,
        },
      });
    if (!existingWritingSubmission)
      throw new BadRequestException('User writing submission not found');
    const { idUser, idWritingTask, submission_text, score, feedback, status } =
      updateUserWritingSubmissionDto;

    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    const existingWritingTask =
      await this.databaseService.writingTask.findUnique({
        where: { idWritingTask },
      });

    if (!existingWritingTask)
      throw new BadRequestException('Writing task not found');

    const data = await this.databaseService.userWritingSubmission.update({
      where: {
        idWritingSubmission,
      },
      data: {
        idUser,
        idWritingTask,
        submission_text,
        score: score ?? null,
        feedback: feedback ?? null,
        status,
      },
    });
    return {
      message: 'User writing submission updated successfully',
      data,
      status: 200,
    };
  }

  async remove(idWritingSubmission: string) {
    const existingWritingSubmission =
      await this.databaseService.userWritingSubmission.findUnique({
        where: {
          idWritingSubmission,
        },
      });
    if (!existingWritingSubmission)
      throw new BadRequestException('User writing submission not found');

    await this.databaseService.userWritingSubmission.delete({
      where: {
        idWritingSubmission,
      },
    });

    return {
      message: 'User writing submission deleted successfully',
      status: 200,
    };
  }
}
