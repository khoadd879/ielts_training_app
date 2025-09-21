import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAnswerDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idCauHoi: string;

  @IsOptional()
  @ApiProperty({ example: '123' })
  idOption: string;

  @IsOptional()
  @ApiProperty({ example: 'True' })
  answer_text: string;

  @IsOptional()
  @ApiProperty({ example: 'A' })
  matching_key: string;

  @IsOptional()
  @ApiProperty({ example: 'A' })
  matching_value: string;
}
