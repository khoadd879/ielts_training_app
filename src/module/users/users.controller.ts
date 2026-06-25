import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create-user')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nameUser: { type: 'string', example: 'Nguyen Van A' },
        email: { type: 'string', example: 'a@gmail.com' },
        phoneNumber: { type: 'string', example: '0123456789' },
        accountType: { type: 'string', example: 'LOCAL' },
        address: { type: 'string', example: 'Hanoi' },
        password: { type: 'string', example: 'password' },
        gender: { type: 'string', example: 'Male' },
        role: { type: 'string', example: 'USER' },
        level: { type: 'string', example: 'Low' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.create(createUserDto, file);
  }

  @Get('get-all')
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('get-one/:idUser')
  // Public: lấy profile user (giữ JwtAuthGuard ở class level, không yêu cầu role)
  findOne(@Param('idUser') idUser: string) {
    return this.usersService.findOne(idUser);
  }

  @Patch('update-user/:idUser')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nameUser: { type: 'string', example: 'Nguyen Van A' },
        email: { type: 'string', example: 'a@gmail.com' },
        phoneNumber: { type: 'string', example: '0123456789' },
        accountType: { type: 'string', example: 'LOCAL' },
        address: { type: 'string', example: 'Hanoi' },
        gender: { type: 'string', example: 'Male' },
        role: { type: 'string', example: 'USER' },
        level: { type: 'string', example: 'Low' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  async update(
    @Param('idUser') idUser: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.update(idUser, updateUserDto, file);
  }

  @Delete('delete-user/:idUser')
  @Roles(Role.ADMIN)
  remove(@Param('idUser') idUser: string) {
    return this.usersService.remove(idUser);
  }
}
