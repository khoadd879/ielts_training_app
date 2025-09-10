import { accountType, Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  nameUser: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  confirmPassword: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  avatar: string;

  @IsOptional()
  phoneNumber: string;

  @IsOptional()
  address: string;

  @IsEnum(accountType)
  accountType: accountType;
}
