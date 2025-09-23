import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserTestResultService {
  constructor(private readonly databaseService: DatabaseService) {}
  async startTest(idUser: string, idTest: string) {
    // Kiểm tra user
    const existingUser = await this.databaseService.user.findUnique({
      where: { idUser },
    });
    if (!existingUser) throw new BadRequestException('User not found');

    // Kiểm tra test
    const existingTest = await this.databaseService.de.findUnique({
      where: { idDe: idTest },
    });
    if (!existingTest) throw new BadRequestException('Test not found');

    const testResult = await this.databaseService.userTestResult.create({
      data: {
        idUser,
        idDe: idTest,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return {
      message: 'Test started',
      status: 200,
      data: testResult,
    };
  }

  async findAllTestResultByIdUser(idUser: string) {
    const existingUser = await this.databaseService.user.findUnique({
      where: {
        idUser,
      },
    });

    if (!existingUser) throw new BadRequestException('User not found');

    const data = await this.databaseService.userTestResult.findMany({
      where: { idUser },
      include: {
        de: true,
        userAnswer: true,
      },
    });

    return {
      message: 'Test result retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idTestResult: string) {
    const data = await this.databaseService.userTestResult.findUnique({
      where: { idTestResult },
    });

    if (!data) throw new BadRequestException('Test result not found');

    return {
      message: 'Test result retrieved successfully',
      data,
      status: 200,
    };
  }

  async deleteTestResult(idTestResult: string) {
    const existingTestResult =
      await this.databaseService.userTestResult.findUnique({
        where: {
          idTestResult,
        },
      });

    if (!existingTestResult) throw new BadRequestException('User not found');

    await this.databaseService.userTestResult.delete({
      where: {
        idTestResult,
      },
    });

    return {
      message: 'Test result deleted successfully',
      status: 200,
    };
  }

  // Finish test (không xoá, chỉ cập nhật trạng thái)
  async finishTest(idTestResult: string) {
    const testResult = await this.databaseService.userTestResult.update({
      where: { idTestResult },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
      },
    });

    return {
      message: 'Test finished successfully',
      status: 200,
      data: testResult,
    };
  }

  // Reset test (xoá hết dữ liệu bài làm)
  async resetTest(idTestResult: string) {
    const result = await this.databaseService.$transaction(async (tx) => {
      const deletedAnswers = await tx.userAnswer.deleteMany({
        where: { idTestResult },
      });
      await tx.userTestResult.delete({ where: { idTestResult } });
      return deletedAnswers.count;
    });

    return {
      message: `Test reset successfully, deleted ${result} answers`,
      status: 200,
    };
  }
}
