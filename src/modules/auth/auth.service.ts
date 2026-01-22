import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { comparePassword } from '../../utils/crypto.util';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload, AuthResponse } from '../../types/auth';
import { User } from '../../common/entities/user.entity';
import { UsedToken } from '../../common/entities/used-token.entity';
import type { RequestContext } from '../../types/request';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(UsedToken)
    private usedTokenRepository: Repository<UsedToken>,
  ) {}

  async register(ctx: RequestContext, registerDto: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create(ctx, registerDto);
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
    };
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

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
    };
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

  async forgotPassword(ctx: RequestContext, forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(ctx, forgotPasswordDto.email);
    
    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    const resetSecret = this.configService.get<string>('JWT_RESET_SECRET');
    if (!resetSecret) {
      throw new Error('JWT_RESET_SECRET is not defined in environment variables');
    }

    const resetPayload: JwtPayload = { 
      email: user.email, 
      sub: user.id 
    };
    
    const resetToken = this.jwtService.sign(resetPayload, {
      secret: resetSecret,
      expiresIn: '30m',
    });

    // TODO: send email with reset link

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(ctx: RequestContext, token: string | undefined, resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    if (!token) {
      throw new BadRequestException('Reset token is required');
    }

    const resetSecret = this.configService.get<string>('JWT_RESET_SECRET');
    if (!resetSecret) {
      throw new Error('JWT_RESET_SECRET is not defined in environment variables');
    }

    let decodedPayload: JwtPayload;
    try {
      decodedPayload = this.jwtService.verify<JwtPayload>(token, {
        secret: resetSecret,
      });
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const existingToken = await this.usedTokenRepository.findOne({
      where: { 
        token: token,
      },
    });

    if (existingToken) {
      throw new BadRequestException('This reset token has already been used');
    }

    const user = await this.usersService.findOne(ctx, decodedPayload.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (decodedPayload.email !== user.email) {
      throw new BadRequestException('Invalid reset token');
    }

    await this.usersService.update(ctx, user.id, {
      password: resetPasswordDto.password,
    });

    const tokenEntity = this.usedTokenRepository.create({
      token: token,
    });

    await this.usedTokenRepository.save(tokenEntity);

    return { message: 'Password has been reset successfully' };
  }
}
