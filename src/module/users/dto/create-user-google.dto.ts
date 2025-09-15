import { CreateUserDto } from './create-user.dto';

export class CreateUserGoogleDto extends CreateUserDto {
  isActive: boolean;
}
