import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { AI_PROVIDER, type AIProvider } from '../ai/ai-provider.interface';
import { buildReportPrompt } from '../ai/prompt-builder';
import { reportSectionsSchema, reportSectionsJsonSchema } from '../ai/report-schema';
import { REPORT_GENERATION_QUEUE } from './report-generation.queue';

export interface ReportGenerationJobData {
  reportId: string;
}

@Processor(REPORT_GENERATION_QUEUE)
export class ReportGenerationProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
  ) {
    super();
  }

  async process(job: Job<ReportGenerationJobData>): Promise<void> {
    const report = await this.prisma.aIReport.findUniqueOrThrow({ where: { id: job.data.reportId } });
    await this.prisma.aIReport.update({ where: { id: report.id }, data: { status: 'PROCESSING' } });

    try {
      const personModel = await this.prisma.personModel.findUniqueOrThrow({
        where: { id: report.personModelId },
      });
      const definitions = await this.prisma.testDefinition.findMany({
        where: { code: { in: personModel.testResults.map((t) => t.testCode) } },
      });
      const nameByCode = new Map(definitions.map((d) => [d.code, d.name]));

      const { systemPrompt, userPrompt } = buildReportPrompt({
        testResults: personModel.testResults.map((t) => ({
          testCode: t.testCode,
          testName: nameByCode.get(t.testCode) ?? t.testCode,
          normalizedScore: t.normalizedScore,
          band: t.band,
          subscaleScores: t.subscaleScores.map((s) => ({
            name: s.name,
            normalizedScore: s.normalizedScore,
            band: s.band,
          })),
        })),
      });

      const raw = await this.aiProvider.generateJson({
        systemPrompt,
        userPrompt,
        jsonSchema: reportSectionsJsonSchema,
        schemaName: 'psyche_report_sections',
      });
      const sections = reportSectionsSchema.parse(raw);

      await this.prisma.aIReport.update({
        where: { id: report.id },
        data: {
          status: 'COMPLETED',
          model: this.aiProvider.name,
          sections,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const attempts = job.opts.attempts ?? 1;
      const isLastAttempt = job.attemptsMade + 1 >= attempts;
      if (isLastAttempt) {
        await this.prisma.aIReport.update({
          where: { id: report.id },
          data: { status: 'FAILED', failureReason: (error as Error).message },
        });
      }
      throw error;
    }
  }
}
