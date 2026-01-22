import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { comparePassword } from '../../utils/crypto.util';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload, AuthResponse } from '../../types/auth';
import { User } from '../../common/entities/user.entity';
import type { RequestContext } from '../../types/request';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(ctx: RequestContext, registerDto: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create(ctx, registerDto);
    const payload: JwtPayload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async login(ctx: RequestContext, loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(ctx, loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async validateUser(ctx: RequestContext, email: string, password: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByEmail(ctx, email);
    if (user && (await comparePassword(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }
}
