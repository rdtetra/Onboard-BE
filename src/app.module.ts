import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RequestInterceptor } from './common/interceptors/request.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { User } from './common/entities/user.entity';
import { UsedToken } from './common/entities/used-token.entity';
import { Permission } from './common/entities/permission.entity';
import { Role } from './common/entities/role.entity';
import { Bot } from './common/entities/bot.entity';
import { KBSource } from './common/entities/kb-source.entity';
import { Collection } from './common/entities/collection.entity';
import { AuditLog } from './common/entities/audit-log.entity';
import { SeedModule } from './modules/seed/seed.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { BotsModule } from './modules/bots/bots.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { CollectionsModule } from './modules/collections/collections.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: configService.get<number>('THROTTLE_LIMIT', 10),
        },
      ],
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const sslEnabled = configService.get<string>('DB_SSL', 'false') === 'true';
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_NAME', 'onboard'),
          entities: [User, UsedToken, Permission, Role, Bot, KBSource, Collection, AuditLog],
          synchronize: configService.get<string>('DB_SYNC', 'true') === 'true',
          ...(sslEnabled && {
            ssl: {
              rejectUnauthorized: configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED', 'false') === 'true',
            },
          }),
        };
      },
      inject: [ConfigService],
    }),
    SeedModule,
    UsersModule,
    AuthModule,
    BotsModule,
    KnowledgeBaseModule,
    CollectionsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: PermissionsGuard,
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
