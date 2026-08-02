// jwt-refresh.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtRefreshPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET');
    // BE-3: symmetric fail-fast with the access-token strategy. Falling
    // back to '' would let anyone forge refresh tokens and mint new access
    // tokens for any user.
    if (!secret) {
      throw new InternalServerErrorException(
        'JWT_REFRESH_SECRET is not configured. Refusing to start with an insecure auth strategy.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtRefreshPayload): { userId: string; email: string } {
    if (!payload) {
      throw new UnauthorizedException();
    }
    if (!payload.sub) {
      throw new UnauthorizedException('Refresh token is missing "sub" claim.');
    }
    return { userId: payload.sub, email: payload.email };
  }
}
