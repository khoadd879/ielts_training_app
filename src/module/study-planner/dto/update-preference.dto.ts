import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferenceDto {
  @ApiProperty({ description: 'Daily study minutes available', minimum: 15, maximum: 240 })
  @IsNumber()
  @Min(15)
  @Max(240)
  dailyMinutesAvailable: number;
}