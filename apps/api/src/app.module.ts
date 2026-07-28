import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.validation';
import type { EnvConfig } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';
import { TestDefinitionsModule } from './modules/test-definitions/test-definitions.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        connection: {
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    CommonModule,
    HealthModule,
    TestDefinitionsModule,
    SessionsModule,
    IntegrationModule,
    ReportsModule,
  ],
})
export class AppModule {}
