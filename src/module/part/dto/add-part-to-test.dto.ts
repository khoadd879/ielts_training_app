import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddPartToTest {
  @ApiProperty({ example: '123' })
  @IsNotEmpty({ message: 'idPart must not be empty' })
  @IsString()
  idPart: string;

  @ApiProperty({ example: '123' })
  @IsNotEmpty({ message: 'idDe must not be empty' })
  @IsString()
  idTest: string;
}
