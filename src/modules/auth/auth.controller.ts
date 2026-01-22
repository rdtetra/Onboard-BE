import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { AuthResponse } from '../../types/auth';
import type { RequestContext as RequestContextType } from '../../types/request';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(
    @RequestContext() ctx: RequestContextType,
    @Body() registerDto: RegisterDto,
  ): Promise<AuthResponse> {
    return this.authService.register(ctx, registerDto);
  }

  @Public()
  @Post('login')
  login(
    @RequestContext() ctx: RequestContextType,
    @Body() loginDto: LoginDto,
  ): Promise<AuthResponse> {
    return this.authService.login(ctx, loginDto);
  }
}
