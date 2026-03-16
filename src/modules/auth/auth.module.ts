import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { JwtWrapperModule } from '../jwt/jwt.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { UsedToken } from '../../common/entities/used-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsedToken]),
    UsersModule,
    AuditModule,
    StorageModule,
    PassportModule,
    JwtWrapperModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
