import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserAnswerDto } from './dto/create-user-answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user-answer.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserAnswerService {
  constructor(private readonly databaseService: DatabaseService) {}
  async createUserAnswer(createUserAnswerDto: CreateUserAnswerDto) {
    const {
      idCauHoi,
      idUser,
      idOption,
      answerText,
      matching_key,
      matching_value,
      idTestResult,
    } = createUserAnswerDto;
    const existingQuestion = await this.databaseService.cauHoi.findUnique({
      where: {
        idCauHoi,
      },
    });

    if (!existingQuestion) throw new BadRequestException('Question not found');

    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    const data = await this.databaseService.userAnswer.create({
      data: {
        idCauHoi,
        idUser,
        idOption: idOption ? idOption : null,
        answerText: answerText ? answerText : null,
        matching_key: matching_key ? matching_key : null,
        matching_value: matching_value ? matching_value : null,
        idTestResult: idTestResult ? idTestResult : null,
      },
    });
  }

  findAll() {
    return `This action returns all userAnswer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userAnswer`;
  }

  update(id: number, updateUserAnswerDto: UpdateUserAnswerDto) {
    return `This action updates a #${id} userAnswer`;
  }

  remove(id: number) {
    return `This action removes a #${id} userAnswer`;
  }
}
