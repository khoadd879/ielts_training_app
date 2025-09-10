import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsNotEmpty({ message: 'Confirm Password is required' })
  confirmPassword: string;

  @IsOptional()
  @IsString()
  otp?: string;
}
