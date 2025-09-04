import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { comparePasswordHelper } from 'src/helpers/utils';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const passwordValid = await comparePasswordHelper(pass, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }
    const payload = { sub: user.idUser, username: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
