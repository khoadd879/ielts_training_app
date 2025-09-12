import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsOptional()
  @IsString()
  otp?: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'Password is required' })
  newPassword: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'Confirm Password is required' })
  confirmPassword: string;
}
