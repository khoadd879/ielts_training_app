import { ApiProperty } from '@nestjs/swagger';
import { accountType, Gender, Level, Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @ApiProperty({ example: 'John Doe' })
  nameUser: string;

  @ApiProperty({ example: 'example@gmail.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'USER', enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ example: 'http://example.com/avatar.jpg' })
  @IsOptional()
  avatar: string;

  @ApiProperty({ example: '1234567890' })
  @IsOptional()
  phoneNumber: string;

  @ApiProperty({ example: 'Male', enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 'Mid', enum: Level })
  @IsEnum(Level)
  level: Level;

  @ApiProperty({ example: '123 Main St, City, Country' })
  @IsOptional()
  address: string;

  @ApiProperty({ example: 'USER', enum: accountType })
  @IsOptional()
  @IsEnum(accountType)
  accountType: accountType;

  @IsOptional()
  password: string;
}
