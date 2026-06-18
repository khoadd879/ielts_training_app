import { IsString, IsInt, Min, Max } from 'class-validator';

export class GetDailySessionDto {
  @IsString()
  idUser: string;

  @IsInt()
  @Min(5)
  @Max(20)
  quota: number = 15;
}
