import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserSpeakingSubmissionDto } from './dto/create-user-speaking-submission.dto';
import { UpdateUserSpeakingSubmissionDto } from './dto/update-user-speaking-submission.dto';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class UserSpeakingSubmissionService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly databaseService: DatabaseService,
  ) {}

  async create(
    createUserSpeakingSubmissionDto: CreateUserSpeakingSubmissionDto,
    file?: Express.Multer.File,
  ) {
    const { idUser, idSpeakingTask } = createUserSpeakingSubmissionDto;

    let audioUrl = createUserSpeakingSubmissionDto.audioUrl;

    if (file) {
      const { secure_url } = await this.cloudinaryService.uploadFile(file);
      audioUrl = secure_url;
    }

    const data = await this.databaseService.userSpeakingSubmission.create({
      data: {
        idUser,
        idSpeakingTask,
        audioUrl,
      },
    });

    return {
      message: 'User speaking submission created successfully',
      data,
      status: 200,
    };
  }

  async findAllByIdSpeakingTask(idSpeakingTask: string) {
    const existingSpeakingTask =
      await this.databaseService.speakingTask.findUnique({
        where: {
          idSpeakingTask,
        },
      });

    if (!existingSpeakingTask) {
      throw new BadRequestException('Speaking task not found');
    }

    const data = await this.databaseService.userSpeakingSubmission.findMany({
      where: {
        idSpeakingTask,
      },
    });

    return {
      message: 'User speaking submissions retrieved successfully',
      data,
      status: 200,
    };
  }

  async update(
    id: string,
    updateUserSpeakingSubmissionDto: UpdateUserSpeakingSubmissionDto,
    file?: Express.Multer.File,
  ) {
    const existingSubmission =
      await this.databaseService.userSpeakingSubmission.findUnique({
        where: {
          idSpeakingSubmission: id,
        },
      });

    if (!existingSubmission) {
      throw new BadRequestException('User speaking submission not found');
    }

    let audioUrl = existingSubmission.audioUrl;

    if (file) {
      const { secure_url } = await this.cloudinaryService.uploadFile(file);
      audioUrl = secure_url;
    }

    const data = await this.databaseService.userSpeakingSubmission.update({
      where: {
        idSpeakingSubmission: id,
      },
      data: {
        ...updateUserSpeakingSubmissionDto,
        audioUrl,
      },
    });

    return {
      message: 'User speaking submission updated successfully',
      data,
      status: 200,
    };
  }

  async remove(id: string) {
    const existingSubmission =
      await this.databaseService.userSpeakingSubmission.findUnique({
        where: {
          idSpeakingSubmission: id,
        },
      });
    if (!existingSubmission) {
      throw new BadRequestException('User speaking submission not found');
    }

    await this.databaseService.userSpeakingSubmission.delete({
      where: {
        idSpeakingSubmission: id,
      },
    });

    return {
      message: 'User speaking submission removed successfully',
      status: 200,
    };
  }
}
