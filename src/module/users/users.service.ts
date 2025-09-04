import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPasswordHelper } from 'src/helpers/utils';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createUserDto: CreateUserDto) {
    const { nameUser, email, password, phoneNumber, address, avatar } =
      createUserDto;

    // Hash the password before storing it
    const hashedPassword = await hashPasswordHelper(createUserDto.password);

    const user = await this.databaseService.user.create({
      data: {
        nameUser,
        email,
        password: hashedPassword,
        phoneNumber,
        address,
        avatar,
      },
    });
    return {
      idUser: user.idUser,
      nameUser: user.nameUser,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      avatar: user.avatar,
    };
  }

  async findAll() {
    return this.databaseService.user.findMany();
  }

  async findOne(id: string) {
    return this.databaseService.user.findUnique({ where: { idUser: id } });
  }

  async findByEmail(email: string) {
    return await this.databaseService.user.findUnique({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const { nameUser, email, phoneNumber, address, avatar } = updateUserDto;

    const user = await this.databaseService.user.update({
      where: { idUser: id },
      data: {
        nameUser,
        email,
        phoneNumber,
        address,
        avatar,
      },
    });
    return {
      idUser: user.idUser,
      nameUser: user.nameUser,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      avatar: user.avatar,
    };
  }

  async remove(id: string) {
    return this.databaseService.user.delete({
      where: { idUser: id },
    });
  }

  async handleRegister(registerDto: CreateAuthDto) {
    const { email, password } = registerDto;
    // Check if email already exists
    const existingUser = await this.findByEmail(registerDto.email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    //hash password
    const hashedPassword = await hashPasswordHelper(registerDto.password);

    const user = await this.databaseService.user.create({
      data: {
        email,
        password: hashedPassword,
        isActive: false,
        code_id: uuidv4(),
        code_expiration: dayjs().add(1, 'minutes').toDate(),
      },
    });
    return {
      idUser: user.idUser,
    };
  }
}
