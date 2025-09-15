import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDTO {
  @ApiProperty({ example: 'user@gmail.com' })
  email: string;

  @ApiProperty({ example: 'OTP', enum: ['OTP', 'RESET_LINK'], default: 'OTP' })
  type: 'OTP' | 'RESET_LINK';
}
