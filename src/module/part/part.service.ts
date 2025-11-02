import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { DatabaseService } from 'src/database/database.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PartService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly userService: UsersService,
  ) {}
  async create(createPartDto: CreatePartDto) {
    const { idTest, namePart } = createPartDto;

    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });

    if (!existingTest) {
      return new BadRequestException('Test not found');
    }
    const data = await this.databaseService.part.create({
      data: {
        idTest,
        namePart,
      },
    });

    return {
      message: 'Part created successfully',
      data,
      status: 200,
    };
  }

  async findAll(idTest: string) {
    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });

    if (!existingTest) {
      return new BadRequestException('Test not found');
    }

    const data = await this.databaseService.part.findMany({
      where: {
        idTest,
      },
    });

    if (!data) return new BadGatewayException('Part not found');

    return {
      message: 'Part retrieved successfully',
      data,
      status: 200,
    };
  }

  async findOne(idPart: string) {
    const data = await this.databaseService.part.findMany({
      where: {
        idPart,
      },
      include: {
        passage: true,
        groupOfQuestions: true,
      },
    });

    if (!data) return new BadGatewayException('Part not found');

    return {
      message: 'Part retrieved successfully',
      data,
      status: 200,
    };
  }

  async update(idPart: string, updatePartDto: UpdatePartDto) {
    const { idTest, namePart } = updatePartDto;

    const existingTest = await this.databaseService.test.findUnique({
      where: { idTest },
    });

    if (!existingTest) {
      return new BadRequestException('Test not found');
    }

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
      include: {
        passage: true,
      },
    });

    if (!existingPart) return new BadRequestException('Part not found');
    const data = await this.databaseService.part.update({
      where: {
        idPart,
      },
      data: {
        idTest,
        namePart,
      },
    });

    return {
      message: 'Part updated successfully',
      data,
      status: 200,
    };
  }

  async remove(idPart: string) {
    const existingPart = await this.databaseService.part.findUnique({
      where: { idPart },
    });

    if (!existingPart) throw new BadRequestException('Part not found');
    await this.databaseService.$transaction([
      this.databaseService.passage.deleteMany({
        where: {
          idPart,
        },
      }),
      this.databaseService.part.delete({ where: { idPart } }),
    ]);
    return {
      message: 'Delete part successfully',
      status: 200,
    };
  }
}
