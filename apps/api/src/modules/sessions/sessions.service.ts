import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ESSENTIAL_TEST_CODES } from '@psyche/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserService } from '../../common/current-user/current-user.service';
import { TestDefinitionsService } from '../test-definitions/test-definitions.service';
import { GenericTestScorer } from '../test-definitions/domain/scoring/generic-test-scorer';
import { checkRisk } from './domain/risk-detector';
import type { SaveAnswerDto } from './dto/save-answer.dto';

const scorer = new GenericTestScorer();

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currentUser: CurrentUserService,
    private readonly testDefinitions: TestDefinitionsService,
  ) {}

  async startOrResume(code: string) {
    const userId = await this.currentUser.getUserId();
    const testDefinition = await this.testDefinitions.findByCode(code.toUpperCase());

    const existing = await this.findAndCleanupInProgress(userId, testDefinition.code);
    if (existing) {
      return existing;
    }

    return this.createSession(userId, testDefinition);
  }

  /** 진행 중인 세션이 있어도 그것을 ABANDONED로 종료하고 처음부터 새 세션을 만든다("다시 검사하기"). */
  async restart(code: string) {
    const userId = await this.currentUser.getUserId();
    const testDefinition = await this.testDefinitions.findByCode(code.toUpperCase());

    const existing = await this.findAndCleanupInProgress(userId, testDefinition.code);
    if (existing) {
      await this.prisma.testSession.update({ where: { id: existing.id }, data: { status: 'ABANDONED' } });
    }

    return this.createSession(userId, testDefinition);
  }

  /**
   * 진행 중인 세션을 찾는다. 클라이언트의 중복 요청(예: React StrictMode의 effect 이중 실행,
   * 연속 클릭 등)이 겹치면 같은 검사에 대해 진행 중 세션이 2개 이상 생길 수 있는데, 이 경우
   * 대시보드가 "이미 완료했는데도 진행 중"으로 잘못 보이는 원인이 된다. 그런 중복을 발견하면
   * 가장 최근 것만 남기고 나머지는 ABANDONED로 정리한 뒤 반환한다.
   */
  private async findAndCleanupInProgress(userId: string, testCode: string) {
    const inProgress = await this.prisma.testSession.findMany({
      where: { userId, testCode, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
    });

    if (inProgress.length === 0) {
      return null;
    }

    const [latest, ...duplicates] = inProgress;
    if (duplicates.length > 0) {
      await this.prisma.testSession.updateMany({
        where: { id: { in: duplicates.map((d) => d.id) } },
        data: { status: 'ABANDONED' },
      });
    }
    return latest;
  }

  /**
   * 대시보드의 "필수 검사 초기화" 기능. 진행 중인 세션들만 ABANDONED 처리하고,
   * 완료된 검사의 과거 결과(TestSession, PersonModel, AIReport)는 절대 건드리지 않는다.
   */
  async abandonAllInProgress(): Promise<{ abandonedCount: number }> {
    const userId = await this.currentUser.getUserId();
    const essentialCodes: string[] = [...ESSENTIAL_TEST_CODES];

    const result = await this.prisma.testSession.updateMany({
      where: { userId, testCode: { in: essentialCodes }, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    return { abandonedCount: result.count };
  }

  /**
   * 대시보드의 "검사 결과 모두 초기화"(위험 작업). 진행 중/완료 여부와 관계없이
   * 모든 검사 결과를 삭제한다. PersonModel과 AIReport는 삭제된 세션을 참조하게 되어
   * 더 이상 의미가 없으므로 함께 삭제한다.
   */
  async resetAll(): Promise<{ deletedSessionCount: number; deletedPersonModelCount: number; deletedReportCount: number }> {
    const userId = await this.currentUser.getUserId();

    const [sessions, personModels, reports] = await Promise.all([
      this.prisma.testSession.deleteMany({ where: { userId } }),
      this.prisma.personModel.deleteMany({ where: { userId } }),
      this.prisma.aIReport.deleteMany({ where: { userId } }),
    ]);

    return {
      deletedSessionCount: sessions.count,
      deletedPersonModelCount: personModels.count,
      deletedReportCount: reports.count,
    };
  }

  private createSession(userId: string, testDefinition: { id: string; code: string; version: number }) {
    return this.prisma.testSession.create({
      data: {
        userId,
        testDefinitionId: testDefinition.id,
        testCode: testDefinition.code,
        testDefinitionVersion: testDefinition.version,
        status: 'IN_PROGRESS',
        answers: [],
        currentPosition: 0,
      },
    });
  }

  async findOne(id: string) {
    const userId = await this.currentUser.getUserId();
    const session = await this.prisma.testSession.findUnique({ where: { id } });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }
    return session;
  }

  async findAll() {
    const userId = await this.currentUser.getUserId();
    return this.prisma.testSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async saveAnswer(id: string, dto: SaveAnswerDto) {
    const session = await this.findOne(id);
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('이미 완료되었거나 종료된 세션입니다.');
    }

    const testDefinition = await this.testDefinitions.findByCode(session.testCode);
    const questionIds = new Set(testDefinition.questions.map((q) => q.questionId));
    if (!questionIds.has(dto.questionId)) {
      throw new BadRequestException(`"${dto.questionId}"는 이 검사의 문항이 아닙니다.`);
    }

    const answers = session.answers.filter((a) => a.questionId !== dto.questionId);
    answers.push({ questionId: dto.questionId, value: dto.value, answeredAt: new Date() });

    const risk = checkRisk(testDefinition.scoringConfig.riskFlags, dto.questionId, dto.value);

    const updated = await this.prisma.testSession.update({
      where: { id },
      data: {
        answers,
        currentPosition: answers.length,
        riskTriggered: session.riskTriggered || risk.triggered,
      },
    });

    return { session: updated, riskFlag: risk.triggered, message: risk.message };
  }

  async submit(id: string) {
    const session = await this.findOne(id);
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('이미 완료되었거나 종료된 세션입니다.');
    }

    const testDefinition = await this.testDefinitions.findByCode(session.testCode);
    const answeredIds = new Set(session.answers.map((a) => a.questionId));
    const missing = testDefinition.questions.filter((q) => !answeredIds.has(q.questionId));
    if (missing.length > 0) {
      throw new BadRequestException(`아직 응답하지 않은 문항이 ${missing.length}개 있습니다.`);
    }

    const result = scorer.score(
      session.answers,
      testDefinition.questions,
      testDefinition.responseScaleMin,
      testDefinition.responseScaleMax,
      testDefinition.scoringConfig,
    );

    return this.prisma.testSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        rawScore: result.rawScore,
        band: result.band,
        subscaleScores: result.subscaleScores,
      },
    });
  }
}
