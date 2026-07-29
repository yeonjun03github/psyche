import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { AI_PROVIDER, type AIProvider } from '../ai/ai-provider.interface';
import { buildReportPrompt, PROMPT_VERSION } from '../ai/prompt-builder';
import { reportSectionsSchema, reportSectionsJsonSchema, type ReportSections } from '../ai/report-schema';
import { REPORT_GENERATION_QUEUE } from './report-generation.queue';
import { computeAssessmentTimeline } from '../../integration/domain/assessment-timeline';
import { diffPersonModels, toPersonModelDiffInput, type PersonModelSnapshot } from '../../integration/domain/person-model-diff';
import { summarizeFeedbackHistory, type FeedbackEntry } from '../domain/feedback-summary';

export interface ReportGenerationJobData {
  reportId: string;
}

/** 이전 PersonModel이 없어도 LLM이 지시를 어기고 값을 채울 수 있어, 코드가 한 번 더 강제한다. */
const LONGITUDINAL_KEYS = ['changesSincePrevious', 'improvedAreas', 'worsenedAreas', 'unchangedAreas', 'areasToWatch'] as const;

type PersonModelWithPrevious = PersonModelSnapshot & { metadata: { previousPersonModelId: string | null } };

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

      const timeline = computeAssessmentTimeline(
        personModel.testResults.map((t) => ({
          testCode: t.testCode,
          testName: nameByCode.get(t.testCode) ?? t.testCode,
          completedAt: t.completedAt,
        })),
      );

      const previousComparison = await this.buildPreviousComparison(personModel);
      const priorFeedback = await this.buildPriorFeedback(report.userId, report.id);

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
        reportContext: report.context ?? undefined,
        timeline,
        previousComparison,
        priorFeedback,
      });

      const raw = await this.aiProvider.generateJson({
        systemPrompt,
        userPrompt,
        jsonSchema: reportSectionsJsonSchema,
        schemaName: 'psyche_report_sections',
      });
      const sections = this.enforceLongitudinalNullability(reportSectionsSchema.parse(raw), previousComparison);

      await this.prisma.aIReport.update({
        where: { id: report.id },
        data: {
          status: 'COMPLETED',
          aiProvider: this.aiProvider.name,
          aiModel: this.aiProvider.modelId,
          promptVersion: PROMPT_VERSION,
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

  /** previousPersonModelId가 있으면 그 PersonModel을 조회해 순수 수치 diff를 계산한다. */
  private async buildPreviousComparison(personModel: PersonModelWithPrevious) {
    const previousId = personModel.metadata.previousPersonModelId;
    if (!previousId) return null;

    const previous = await this.prisma.personModel.findUnique({ where: { id: previousId } });
    if (!previous) return null;

    return diffPersonModels(toPersonModelDiffInput(previous), toPersonModelDiffInput(personModel));
  }

  /**
   * "가장 최근 리포트"가 아니라 이 사용자의 완료된 리포트 전부를 모아 섹션별로 집계한다 —
   * 반복적으로 부정/확인된 패턴 자체가 참고 정보로서 가치가 있기 때문(feedback-summary.ts 참고).
   */
  private async buildPriorFeedback(userId: string, currentReportId: string) {
    const pastReports = await this.prisma.aIReport.findMany({
      where: { userId, status: 'COMPLETED', id: { not: currentReportId } },
      select: { feedback: true },
    });
    const allFeedback: FeedbackEntry[][] = pastReports.map((r) =>
      r.feedback.map((f) => ({ section: f.section, verdict: f.verdict, note: f.note, updatedAt: f.updatedAt })),
    );
    return summarizeFeedbackHistory(allFeedback);
  }

  /** LLM이 프롬프트 지시(previousComparison 없으면 null)를 어겨도 코드가 방어적으로 한 번 더 강제한다. */
  private enforceLongitudinalNullability(sections: ReportSections, previousComparison: unknown): ReportSections {
    if (previousComparison) return sections;

    const forced = { ...sections };
    for (const key of LONGITUDINAL_KEYS) {
      forced[key] = null;
    }
    // 비교 자료가 없으면 그 5개 섹션에 대한 확신도 항목도 의미가 없으므로 함께 제거한다.
    forced.claimsConfidence = sections.claimsConfidence.filter(
      (c) => !(LONGITUDINAL_KEYS as readonly string[]).includes(c.section),
    );
    return forced;
  }
}
