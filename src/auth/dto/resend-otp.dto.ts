import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDTO {
  @ApiProperty({ example: 'user@example.com' })
  email: string;
}
