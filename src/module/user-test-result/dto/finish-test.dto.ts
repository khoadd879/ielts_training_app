import { IsNotEmpty, IsUUID } from 'class-validator';

export class FinishTestDto {
  @IsUUID('4')
  @IsNotEmpty()
  idUser: string;

  @IsUUID('4')
  @IsNotEmpty()
  idTestResult: string;
}
