import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { EnvConfig } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserService } from '../../common/current-user/current-user.service';
import { PersonModelBuilderService } from '../integration/person-model-builder.service';
import {
  diffPersonModels,
  toPersonModelDiffInput,
  type PersonModelDiff,
  type PersonModelSnapshot,
} from '../integration/domain/person-model-diff';
import { findQuoteById } from './ai/quote-bank';
import { AI_PROVIDER, type AIProvider } from './ai/ai-provider.interface';
import { buildChatSystemPrompt } from './ai/chat-prompt-builder';
import { REPORT_GENERATION_QUEUE } from './queue/report-generation.queue';
import type { ReportGenerationJobData } from './queue/report-generation.processor';
import type { CreateReportDto } from './dto/create-report.dto';
import type { UpsertFeedbackDto } from './dto/upsert-feedback.dto';
import type { SendChatMessageDto } from './dto/send-chat-message.dto';

type PersonModelWithPrevious = PersonModelSnapshot & { metadata: { previousPersonModelId: string | null } };

/** 리포트 하나당 채팅 스레드가 무한정 길어져 AI 호출 비용이 새는 것을 막는다. */
const MAX_CHAT_MESSAGES_PER_REPORT = 60;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currentUser: CurrentUserService,
    private readonly personModelBuilder: PersonModelBuilderService,
    private readonly config: ConfigService<EnvConfig, true>,
    @InjectQueue(REPORT_GENERATION_QUEUE) private readonly queue: Queue<ReportGenerationJobData>,
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
  ) {}

  /** 어떤 검사의 어떤 응시 결과로 리포트가 만들어질지 미리 보여준다(생성 전 확인용). */
  async preview() {
    const userId = await this.currentUser.getUserId();
    return this.personModelBuilder.preview(userId);
  }

  async create(dto: CreateReportDto) {
    const userId = await this.currentUser.getUserId();
    const role = await this.currentUser.getRole();
    if (role !== 'ADMIN') {
      await this.enforceCreationCooldown(userId);
    }

    // 서버가 다시 검증한다 — 필수 7종 미완료거나 날짜 간격 경고를 확인하지 않았으면 예외를 던진다.
    const personModel = await this.personModelBuilder.build(userId, {
      acknowledgeDateSpanWarning: dto.acknowledgeDateSpanWarning,
    });

    const report = await this.prisma.aIReport.create({
      data: { userId, personModelId: personModel.id, status: 'PENDING', context: dto.context },
    });

    await this.queue.add(
      'generate',
      { reportId: report.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return report;
  }

  /** ADMIN이 아닌 사용자가 리포트 생성을 연타해 AI 호출 비용이 새는 것을 막는다. */
  private async enforceCreationCooldown(userId: string): Promise<void> {
    const cooldownMinutes = this.config.get('REPORT_CREATION_COOLDOWN_MINUTES', { infer: true });
    const cutoff = new Date(Date.now() - cooldownMinutes * 60_000);

    // FAILED는 카운트하지 않는다 — AI 쪽 일시 장애(예: 모델 high demand)로 실패한 시도까지
    // 쿨다운에 묶이면, 정작 재시도가 필요한 사용자가 그 시간만큼 더 기다려야 하는 역효과가 난다.
    const recent = await this.prisma.aIReport.findFirst({
      where: { userId, createdAt: { gte: cutoff }, status: { not: 'FAILED' } },
      orderBy: { createdAt: 'desc' },
    });
    if (!recent) return;

    const retryAfterMinutes = Math.ceil((recent.createdAt.getTime() + cooldownMinutes * 60_000 - Date.now()) / 60_000);
    throw new BadRequestException(
      `리포트는 ${cooldownMinutes}분에 한 번만 생성할 수 있습니다. ${retryAfterMinutes}분 후 다시 시도해주세요.`,
    );
  }

  /** 소유권 검증 포함 — 다른 서비스 메서드들이 이 메서드로 존재/소유 여부를 확인한다. */
  private async findOwned(id: string) {
    const userId = await this.currentUser.getUserId();
    const report = await this.prisma.aIReport.findUnique({ where: { id } });
    if (!report || report.userId !== userId) {
      throw new NotFoundException('리포트를 찾을 수 없습니다.');
    }
    return report;
  }

  /**
   * 완료된 리포트라면 이전 PersonModel과의 순수 수치 비교와, 저장된 dailyQuoteId에 대응하는
   * 검증된 명언 텍스트를 즉석 계산해 얹는다. 둘 다 기존 데이터(불변 PersonModel 스냅샷, 고정
   * quote-bank.ts)에서 항상 같은 결과로 재계산 가능해 DB에 중복 저장하지 않는다.
   * testScores(실제 검사 점수)도 같은 이유로 저장하지 않고 매번 PersonModel에서 계산한다 —
   * AI 서술은 점수를 본문에 나열하지 않도록 지시받아서, 원 점수는 여기서 별도로 노출한다.
   */
  async findOne(id: string) {
    const report = await this.findOwned(id);
    const personModel = await this.prisma.personModel.findUnique({ where: { id: report.personModelId } });
    const testScores = personModel ? await this.buildTestScores(personModel) : [];
    const comparisonSummary = await this.computeComparisonSummary(report.status, personModel);
    const quoteEntry = report.sections?.dailyQuoteId ? findQuoteById(report.sections.dailyQuoteId) : undefined;
    const dailyQuote = quoteEntry ? { quote: quoteEntry.quote, author: quoteEntry.author } : null;
    return { ...report, testScores, comparisonSummary, dailyQuote };
  }

  private async buildTestScores(personModel: {
    testResults: {
      testCode: string;
      normalizedScore: number | null;
      band: string | null;
      subscaleScores: { name: string; normalizedScore: number; band: string }[];
    }[];
  }) {
    const codes = personModel.testResults.map((t) => t.testCode);
    const definitions = await this.prisma.testDefinition.findMany({ where: { code: { in: codes } } });
    const nameByCode = new Map(definitions.map((d) => [d.code, d.name]));

    return personModel.testResults.map((t) => ({
      testCode: t.testCode,
      testName: nameByCode.get(t.testCode) ?? t.testCode,
      normalizedScore: t.normalizedScore,
      band: t.band,
      subscaleScores: t.subscaleScores.map((s) => ({ name: s.name, normalizedScore: s.normalizedScore, band: s.band })),
    }));
  }

  private async computeComparisonSummary(
    status: string,
    personModel: PersonModelWithPrevious | null,
  ): Promise<PersonModelDiff | null> {
    if (status !== 'COMPLETED' || !personModel) return null;

    const previousId = personModel.metadata.previousPersonModelId;
    if (!previousId) return null;

    const previous = await this.prisma.personModel.findUnique({ where: { id: previousId } });
    if (!previous) return null;

    return diffPersonModels(toPersonModelDiffInput(previous), toPersonModelDiffInput(personModel));
  }

  async findAll() {
    const userId = await this.currentUser.getUserId();
    return this.prisma.aIReport.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /** 사용자가 해석적 섹션 하나에 남기는 피드백 — 기존 answers 배열 갱신과 동일한 관용구(교체 후 push)를 따른다. */
  async upsertFeedback(id: string, dto: UpsertFeedbackDto) {
    const report = await this.findOwned(id);
    if (report.status !== 'COMPLETED') {
      throw new BadRequestException('완료된 리포트에만 피드백을 남길 수 있습니다.');
    }

    const feedback = report.feedback.filter((f) => f.section !== dto.section);
    feedback.push({ section: dto.section, verdict: dto.verdict, note: dto.note ?? null, updatedAt: new Date() });

    return this.prisma.aIReport.update({ where: { id }, data: { feedback } });
  }

  async remove(id: string) {
    // findOwned가 소유권 검증까지 해준다 — 여기서 다시 조회해 존재/소유 여부를 확인한다.
    await this.findOwned(id);
    await this.prisma.reportChatMessage.deleteMany({ where: { reportId: id } });
    await this.prisma.aIReport.delete({ where: { id } });
  }

  /** 리포트 상세 화면에서 드래그 선택 → "질문하기"로 시작하는 후속 질문 스레드. */
  async listChatMessages(id: string) {
    await this.findOwned(id);
    return this.prisma.reportChatMessage.findMany({ where: { reportId: id }, orderBy: { createdAt: 'asc' } });
  }

  async sendChatMessage(id: string, dto: SendChatMessageDto) {
    const userId = await this.currentUser.getUserId();
    const report = await this.findOwned(id);
    if (report.status !== 'COMPLETED' || !report.sections) {
      throw new BadRequestException('완료된 리포트에만 질문할 수 있습니다.');
    }

    const messageCount = await this.prisma.reportChatMessage.count({ where: { reportId: id } });
    if (messageCount >= MAX_CHAT_MESSAGES_PER_REPORT) {
      throw new BadRequestException('이 리포트의 대화가 너무 길어졌습니다. 새 리포트를 생성한 뒤 다시 질문해주세요.');
    }

    const personModel = await this.prisma.personModel.findUnique({ where: { id: report.personModelId } });
    const testScores = personModel ? await this.buildTestScores(personModel) : [];

    const userMessage = await this.prisma.reportChatMessage.create({
      data: { reportId: id, userId, role: 'USER', content: dto.message },
    });

    const history = await this.prisma.reportChatMessage.findMany({
      where: { reportId: id },
      orderBy: { createdAt: 'asc' },
    });

    const systemPrompt = buildChatSystemPrompt({
      testScores,
      sections: report.sections,
      reportContext: report.context,
    });

    const reply = await this.aiProvider.generateText({
      systemPrompt,
      messages: history.map((m) => ({ role: m.role === 'ASSISTANT' ? 'assistant' : 'user', content: m.content })),
      // 사용자가 실시간으로 기다리는 대화라 리포트 생성용 "품질 우선" 모델보다 속도를 우선한다.
      preferFast: true,
    });

    const assistantMessage = await this.prisma.reportChatMessage.create({
      data: { reportId: id, userId, role: 'ASSISTANT', content: reply },
    });

    return [userMessage, assistantMessage];
  }
}
