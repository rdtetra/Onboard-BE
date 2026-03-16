import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtWrapperService } from './jwt.service';

@Module({
  imports: [ConfigModule],
  providers: [JwtWrapperService],
  exports: [JwtWrapperService],
})
export class JwtWrapperModule {}
