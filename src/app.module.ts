import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
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
import { BotWidgetToken } from './common/entities/bot-widget-token.entity';
import { KBSource } from './common/entities/kb-source.entity';
import { Collection } from './common/entities/collection.entity';
import { Task } from './common/entities/task.entity';
import { Chip } from './common/entities/chip.entity';
import { Widget } from './common/entities/widget.entity';
import { Conversation } from './common/entities/conversation.entity';
import { Message } from './common/entities/message.entity';
import { KBChunk } from './common/entities/kb-chunk.entity';
import { Organization } from './common/entities/organization.entity';
import { AuditLog } from './common/entities/audit-log.entity';
import { Plan } from './common/entities/plan.entity';
import { Subscription } from './common/entities/subscription.entity';
import { TokenWallet } from './common/entities/token-wallet.entity';
import { TokenTransaction } from './common/entities/token-transaction.entity';
import { PaymentMethod } from './common/entities/payment-method.entity';
import { Invoice } from './common/entities/invoice.entity';
import { SeedModule } from './modules/seed/seed.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { BotModule } from './modules/bot/bot.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { TaskModule } from './modules/task/task.module';
import { WidgetModule } from './modules/widget/widget.module';
import { CollectionModule } from './modules/collection/collection.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { EmailModule } from './modules/email/email.module';
import { StorageModule } from './modules/storage/storage.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { PlanModule } from './modules/plan/plan.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { TokenWalletModule } from './modules/token-wallet/token-wallet.module';
import { TokenTransactionModule } from './modules/token-transaction/token-transaction.module';
import { PaymentMethodModule } from './modules/payment-method/payment-method.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmbedModule } from './modules/embed/embed.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { EventsModule } from './modules/events/events.module';
import { OpenAiModule } from './modules/openai/openai.module';
import { KbRetrievalModule } from './modules/kb-retrieval/kb-retrieval.module';

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
        const sslEnabled =
          configService.get<string>('DB_SSL', 'false') === 'true';
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_NAME', 'onboard'),
          entities: [
            User,
            UsedToken,
            Permission,
            Role,
            Bot,
            BotWidgetToken,
            KBSource,
            Collection,
            Organization,
            AuditLog,
            Task,
            Chip,
            Widget,
            Conversation,
            Message,
            KBChunk,
            Plan,
            Subscription,
            TokenWallet,
            TokenTransaction,
            PaymentMethod,
            Invoice,
          ],
          synchronize: configService.get<string>('DB_SYNC', 'true') === 'true',
          ...(sslEnabled && {
            ssl: {
              rejectUnauthorized:
                configService.get<string>(
                  'DB_SSL_REJECT_UNAUTHORIZED',
                  'false',
                ) === 'true',
            },
          }),
        };
      },
      inject: [ConfigService],
    }),
    SeedModule,
    UserModule,
    AuthModule,
    BotModule,
    KnowledgeBaseModule,
    TaskModule,
    WidgetModule,
    CollectionModule,
    OrganizationModule,
    AuditModule,
    EmailModule,
    StorageModule,
    ConversationModule,
    PlanModule,
    SubscriptionModule,
    TokenWalletModule,
    TokenTransactionModule,
    PaymentMethodModule,
    InvoiceModule,
    WebhookModule,
    BillingModule,
    AdminModule,
    EmbedModule,
    EventsModule,
    WebsocketModule,
    OpenAiModule,
    KbRetrievalModule,
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
