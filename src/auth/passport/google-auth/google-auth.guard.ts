import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    // Lấy redirect_uri FE gửi
    const redirectUri = req.query.redirect_uri;

    // Gán redirectUri vào state (Google OAuth hỗ trợ query param state)
    if (redirectUri) {
      req.query.state = redirectUri;
    }

    return (await super.canActivate(context)) as boolean;
  }
}
