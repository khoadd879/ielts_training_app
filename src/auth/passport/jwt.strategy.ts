import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'GIAOVIEN';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    // BE-3: fail-fast on missing JWT_SECRET. Never fall back to '' or any
    // development default. Anyone with a token issued by an empty secret
    // (or by an attacker who discovered the empty secret) would bypass auth.
    if (!secret) {
      throw new InternalServerErrorException(
        'JWT_SECRET is not configured. Refusing to start with an insecure auth strategy.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtAccessPayload): {
    userId: string;
    email: string;
    role: JwtAccessPayload['role'];
  } {
    if (!payload?.sub) {
      throw new InternalServerErrorException(
        'JWT payload is missing required "sub" claim.',
      );
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
