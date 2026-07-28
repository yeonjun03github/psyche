import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportGenerationProcessor } from './queue/report-generation.processor';
import { REPORT_GENERATION_QUEUE } from './queue/report-generation.queue';
import { AiModule } from './ai/ai.module';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [BullModule.registerQueue({ name: REPORT_GENERATION_QUEUE }), AiModule, IntegrationModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportGenerationProcessor],
})
export class ReportsModule {}
