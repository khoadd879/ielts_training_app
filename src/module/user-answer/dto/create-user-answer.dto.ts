import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserAnswerDto {
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idCauHoi: string;

  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  idUser: string;

  @IsOptional()
  @ApiProperty({ example: '123' })
  idOption?: string;

  @IsOptional()
  @ApiProperty({ example: 'Some text answer' })
  answerText?: string;

  @IsOptional()
  @ApiProperty({ example: 'A' })
  matching_key?: string;

  @IsOptional()
  @ApiProperty({ example: '1' })
  matching_value?: string;

  @IsOptional()
  @ApiProperty({ example: '123' })
  idTestResult?: string;
}
