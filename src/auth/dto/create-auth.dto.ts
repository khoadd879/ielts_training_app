import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuthDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'Confirm Password is required' })
  confirmPassword: string;

  @IsOptional()
  @IsString()
  otp?: string;
}
