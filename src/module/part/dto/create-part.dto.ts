import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreatePartDto {
  @ApiProperty({ example: '123' })
  @IsNotEmpty({ message: 'idDe must not be empty' })
  idDe: string;

  @ApiProperty({ example: '123' })
  @IsNotEmpty({ message: 'idUser must not be empty' })
  idUser: string;

  @ApiProperty({ example: 'title' })
  @IsNotEmpty({ message: 'name part must not be empty' })
  namePart: string;
}
