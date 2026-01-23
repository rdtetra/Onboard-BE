import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../modules/users/users.service';
import { JwtPayload, JwtUser } from '../../types/auth';
import type { RequestContext } from '../../types/request';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    const minimalContext: RequestContext = {
      user: null,
      url: '/auth/validate',
      method: 'GET',
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
    };
    const user = await this.usersService.findOne(minimalContext, payload.sub);
    return {
      userId: user.id,
      email: user.email,
    };
  }
}
