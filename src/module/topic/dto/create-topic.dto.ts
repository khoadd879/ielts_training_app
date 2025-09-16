import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateTopicDto {
  @ApiProperty({ example: 'Education' })
  @IsNotEmpty({ message: 'nameTopic should not be empty' })
  nameTopic: string;

  @ApiProperty({ example: '12345' })
  @IsNotEmpty({ message: 'idUser should not be empty' })
  idUser: string;
}
