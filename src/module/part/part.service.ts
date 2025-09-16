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
    const { idDe, idUser, namePart } = createPartDto;

    const existingUser = await this.userService.findOne(idUser);

    if (!existingUser) {
      return new BadRequestException('User not found');
    }
    const data = await this.databaseService.part.create({
      data: {
        idDe,
        idUser,
        namePart,
      },
    });

    return {
      message: 'Part created successfully',
      data,
      status: 200,
    };
  }

  async findAll(idUser: string) {
    const existingUser = await this.userService.findOne(idUser);

    if (!existingUser) {
      return new BadRequestException('User not found');
    }

    const data = await this.databaseService.part.findMany({
      where: {
        idUser,
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
    const data = await this.databaseService.part.findUnique({
      where: {
        idPart,
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
    const { idDe, idUser, namePart } = updatePartDto;

    const existingUser = await this.userService.findOne(idUser);

    if (!existingUser) {
      return new BadRequestException('User not found');
    }

    const existingPart = await this.databaseService.part.findUnique({
      where: {
        idPart,
      },
    });

    if (!existingPart) return new BadRequestException('Part not found');
    const data = await this.databaseService.part.update({
      where: {
        idPart,
      },
      data: {
        idDe,
        idUser,
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
    await this.databaseService.part.delete({
      where: {
        idPart,
      },
    });

    return {
      message: 'Delete part successfully',
      status: 200,
    };
  }
}
