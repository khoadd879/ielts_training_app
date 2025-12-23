import { ApiProperty } from '@nestjs/swagger';
import { accountType, Gender, Level, Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsOptional()
  nameUser: string;

  @ApiProperty({ example: 'example@gmail.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'USER', enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ example: 'Male', enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 'Mid', enum: Level })
  @IsEnum(Level)
  level?: Level;

  @ApiProperty({ example: 'http://example.com/avatar.jpg' })
  @IsOptional()
  avatar: string;

  @ApiProperty({ example: '1234567890' })
  @IsOptional()
  @IsNumberString({}, { message: 'Số điện thoại chỉ được chứa các chữ số' })
  @Length(10, 12, {
    message: 'Số điện thoại phải có độ dài từ 10 đến 12 ký tự',
  })
  phoneNumber: string;

  @ApiProperty({ example: '123 Main St, City, Country' })
  @IsOptional()
  address: string;

  @ApiProperty({ example: 'LOCAL', enum: accountType })
  @IsEnum(accountType)
  accountType: accountType;
}
