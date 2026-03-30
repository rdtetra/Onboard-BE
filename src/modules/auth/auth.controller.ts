import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Query,
  Headers,
  Param,
  UseInterceptors,
  UploadedFile,
  UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import {
  AuthResponse,
  SessionResponse,
  ImpersonateResponse,
} from '../../types/auth';
import type { RequestContext as RequestContextType } from '../../types/request';
import { User } from '../../common/entities/user.entity';
import { profilePictureUploadOptions } from './profile-upload.options';
import { UploadExceptionFilter } from '../knowledge-base/upload-exception.filter';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('superadmin-exists')
  superadminExists(): Promise<{ superadminExists: boolean }> {
    return this.authService.superadminExists();
  }

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

  @Post('impersonate/:id')
  impersonate(
    @RequestContext() ctx: RequestContextType,
    @Param('id') userId: string,
  ): Promise<ImpersonateResponse> {
    return this.authService.impersonate(ctx, userId);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(
    @RequestContext() ctx: RequestContextType,
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(ctx, forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(
    @RequestContext() ctx: RequestContextType,
    @Query('token') token: string | undefined,
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(ctx, token, resetPasswordDto);
  }

  @Post('change-password')
  changePassword(
    @RequestContext() ctx: RequestContextType,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(ctx, changePasswordDto);
  }

  @Patch('profile')
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('image', profilePictureUploadOptions))
  updateProfile(
    @RequestContext() ctx: RequestContextType,
    @Body('fullName') fullName?: string,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<User> {
    return this.authService.updateProfile(ctx, fullName, image);
  }

  @Public()
  @Get('session')
  checkSession(
    @RequestContext() ctx: RequestContextType,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<SessionResponse> {
    return this.authService.checkSession(ctx, authorization);
  }

  @Public()
  @Post('logout')
  logout(
    @RequestContext() ctx: RequestContextType,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<{ message: string }> {
    return this.authService.logout(ctx, authorization);
  }
}
