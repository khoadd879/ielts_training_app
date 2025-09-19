import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  StrategyOptions,
  VerifyCallback,
} from 'passport-google-oauth20';
import googleOauthConfig from '../config/google-oauth.config';
import type { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { accountType } from '@prisma/client';

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
    } as StrategyOptions);
  }

  async validate(
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
        phoneNumber: '', // fix thêm field
        address: '', // fix thêm field
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
