import { accountType, Role } from '@prisma/client';
import {
  IsEmail,
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class UpdateUserDto {
  nameUser: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

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
