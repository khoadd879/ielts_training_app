import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  StrategyOptionsWithRequest,
  VerifyCallback,
} from 'passport-google-oauth20';
import { Inject, Injectable } from '@nestjs/common';
import googleOauthConfig from '../config/google-oauth.config';
import { AuthService } from '../auth.service';
import { accountType } from '@prisma/client';
import type { ConfigType } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(googleOauthConfig.KEY)
    private googleConfiguration: ConfigType<typeof googleOauthConfig>,
    private authService: AuthService,
  ) {
    super({
      clientID: googleConfiguration.clientID,
      clientSecret: googleConfiguration.clientSecret,
      callbackURL: googleConfiguration.callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: true, // ⚡ cần để lấy state từ req
    } as StrategyOptionsWithRequest);
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    try {
      const user = await this.authService.validateGoogleUser({
        email: profile.emails?.[0]?.value,
        nameUser: profile.displayName,
        avatar: profile.photos?.[0]?.value,
        password: '',
        role: 'USER',
        accountType: accountType.GOOGLE,
        isActive: true,
        phoneNumber: '',
        address: '',
      });

      if (!user) {
        return done(new Error('Google user validation failed'), false);
      }

      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}
