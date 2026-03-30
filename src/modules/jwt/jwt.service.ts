import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export type JwtUseCase = 'auth' | 'widget' | 'reset';

const USE_CASE_CONFIG: Record<
  JwtUseCase,
  { secretKey: string; expiresInKey?: string; defaultExpiresIn: string }
> = {
  auth: {
    secretKey: 'JWT_SECRET',
    expiresInKey: 'JWT_EXPIRES_IN',
    defaultExpiresIn: '7d',
  },
  widget: {
    secretKey: 'WIDGET_JWT_SECRET',
    expiresInKey: 'WIDGET_JWT_EXPIRES_IN',
    defaultExpiresIn: '365d',
  },
  reset: {
    secretKey: 'JWT_RESET_SECRET',
    expiresInKey: 'JWT_RESET_EXPIRES_IN',
    defaultExpiresIn: '30m',
  },
};

@Injectable()
export class JwtWrapperService {
  constructor(private readonly configService: ConfigService) {}

  private getConfig(useCase: JwtUseCase): {
    secret: string;
    expiresIn: string;
  } {
    const { secretKey, expiresInKey, defaultExpiresIn } =
      USE_CASE_CONFIG[useCase];
    const secret = this.configService.get<string>(secretKey);
    if (!secret) {
      throw new InternalServerErrorException(
        `${secretKey} is not defined in environment variables`,
      );
    }
    const expiresIn = expiresInKey
      ? (this.configService.get<string>(expiresInKey) ?? defaultExpiresIn)
      : defaultExpiresIn;
    return { secret, expiresIn };
  }

  /** Sign a payload and return the JWT string. */
  sign<T extends object>(payload: T, useCase: JwtUseCase): string {
    const { secret, expiresIn } = this.getConfig(useCase);
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  /**
   * Super-admin impersonation access token. Same secret as `auth` so existing JWT validation applies;
   * fixed 15-minute lifetime.
   */
  signImpersonationToken<T extends object>(payload: T): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new InternalServerErrorException(
        'JWT_SECRET is not defined in environment variables',
      );
    }
    return jwt.sign(payload, secret, { expiresIn: '15m' } as jwt.SignOptions);
  }

  /** Sign and return token plus expiresAt (ISO string). Useful for widget token response. */
  signWithExpiresAt<T extends object>(
    payload: T,
    useCase: JwtUseCase,
  ): { token: string; expiresAt: string } {
    const token = this.sign(payload, useCase);
    const decoded = this.decode(token);
    const expiresAt =
      decoded?.exp != null
        ? new Date(decoded.exp * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return { token, expiresAt };
  }

  /** Verify and decode; throws UnauthorizedException if invalid. */
  verify<T = unknown>(token: string, useCase: JwtUseCase): T {
    const { secret } = this.getConfig(useCase);
    try {
      return jwt.verify(token, secret) as T;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Decode without verifying (e.g. to read exp). Returns null if malformed. */
  decode(token: string): { exp?: number; [k: string]: unknown } | null {
    try {
      const decoded = jwt.decode(token);
      return decoded as { exp?: number; [k: string]: unknown } | null;
    } catch {
      return null;
    }
  }
}
