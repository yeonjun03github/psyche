import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.checkMongo()]);
  }

  private async checkMongo(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      return { mongo: { status: 'up' } };
    } catch (error) {
      return { mongo: { status: 'down', message: (error as Error).message } };
    }
  }
}
