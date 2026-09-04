import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

export const AI_MICROSERVICE_HEADER = 'x-ai-microservice-secret';
export const AI_MICROSERVICE_ENV = 'AI_MICROSERVICE_SECRET';

interface AuthenticatedRequest extends Request {
  headers: Request['headers'] & {
    [AI_MICROSERVICE_HEADER]?: string | string[];
  };
}

/**
 * BE-4: dedicated guard for AI crawler/import endpoints.
 *
 * Why a dedicated guard instead of JWT or @Public:
 *   - Crawler workers do not authenticate as a real user, so JWT
 *     middleware would reject every request.
 *   - `@Public()` only bypasses the global JWT guard; it does not
 *     authenticate the caller at all. A bare `@Public()` exposes the
 *     endpoint to anyone on the internet.
 *
 * Wire format:
 *   - Client must send header `x-ai-microservice-secret: <secret>`.
 *   - Server compares against `AI_MICROSERVICE_SECRET` env using a
 *     constant-time comparison.
 *
 * Failure modes:
 *   - Missing env on the server: `500 InternalServerErrorException` —
 *     fail-fast, the deployment is misconfigured.
 *   - Missing/empty/wrong header: `401 UnauthorizedException`.
 *   - Length mismatch: rejected with `401` without throwing inside
 *     `timingSafeEqual` (which requires equal-length buffers).
 */
@Injectable()
export class AiMicroserviceGuard implements CanActivate {
  private readonly logger = new Logger(AiMicroserviceGuard.name);
  private readonly expectedSecret: string;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>(AI_MICROSERVICE_ENV);
    if (!secret) {
      throw new InternalServerErrorException(
        `${AI_MICROSERVICE_ENV} is not configured. ` +
          'Refusing to expose AI microservice endpoints without authentication.',
      );
    }
    this.expectedSecret = secret;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const suppliedRaw = request.headers[AI_MICROSERVICE_HEADER];
    const supplied = Array.isArray(suppliedRaw) ? suppliedRaw[0] : suppliedRaw;

    if (!supplied) {
      throw new UnauthorizedException(
        `Missing ${AI_MICROSERVICE_HEADER} header.`,
      );
    }

    if (!this.constantTimeEquals(supplied, this.expectedSecret)) {
      // Never log supplied or expected secret values.
      this.logger.warn(
        `Rejected AI microservice request: ${AI_MICROSERVICE_HEADER} mismatch.`,
      );
      throw new UnauthorizedException('Invalid microservice credentials.');
    }

    return true;
  }

  private constantTimeEquals(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) {
      // Keep a dummy compare so the rejection path runs in time roughly
      // proportional to the expected secret length instead of leaking the
      // supplied length.
      timingSafeEqual(bBuf, bBuf);
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  }
}
