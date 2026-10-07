import { BadRequestException, Injectable } from '@nestjs/common';
import { ESSENTIAL_TEST_CODES } from '@psyche/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPersonModelTestResult, isSameSessionSet } from './domain/person-model.mapper';
import { computeDateSpanWarning } from './domain/date-span-warning';

/** 검사 완료 시점 간 간격이 이보다 넓으면 통합 리포트 생성 전에 사용자 확인을 받는다. */
const DATE_SPAN_WARNING_THRESHOLD_DAYS = 30;

export interface ReportPreviewItem {
  testCode: string;
  testName: string;
  sessionId: string;
  completedAt: Date;
  band: string | null;
  rawScore: number | null;
}

export interface ReportPreview {
  items: ReportPreviewItem[];
  missingTestCodes: string[];
  ready: boolean;
  dateSpanDays: number;
  warningThresholdDays: number;
  requiresConfirmation: boolean;
}

@Injectable()
export class PersonModelBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  /** DB에 등록된 선택(OPTIONAL) 검사 코드. 시드에 선택 검사가 추가되면 코드 수정 없이 리포트 입력에 반영된다. */
  private async findOptionalCodes(): Promise<string[]> {
    const optional = await this.prisma.testDefinition.findMany({
      where: { category: 'OPTIONAL' },
      select: { code: true },
      orderBy: { code: 'asc' },
    });
    return optional.map((d) => d.code);
  }

  /**
   * 사용자별 검사 코드에 대해 "가장 최근에 완료된" 세션만 골라낸다.
   * 필수 검사는 하나라도 없으면 missing에 담기지만, 선택 검사는 완료한 것만 포함되고 없어도 missing이 아니다.
   */
  private async selectLatestSessions(userId: string, essentialCodes: string[], optionalCodes: string[]) {
    const completedSessions = await this.prisma.testSession.findMany({
      where: { userId, testCode: { in: [...essentialCodes, ...optionalCodes] }, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });

    const latestByCode = new Map<string, (typeof completedSessions)[number]>();
    for (const session of completedSessions) {
      if (!latestByCode.has(session.testCode)) {
        latestByCode.set(session.testCode, session);
      }
    }

    const missing = essentialCodes.filter((code) => !latestByCode.has(code));
    const includedCodes = [...essentialCodes, ...optionalCodes.filter((code) => latestByCode.has(code))];
    return { latestByCode, missing, includedCodes };
  }

  /**
   * 리포트를 만들기 전에 "어떤 검사의 어떤 응시 결과가 쓰일 것인지"를 사용자가 확인할 수 있도록
   * 미리보기를 제공한다. 검사 완료 시점 간 간격이 너무 넓으면 requiresConfirmation=true를 반환하고,
   * 실제 생성(build)은 이를 명시적으로 확인받기 전까지 진행하지 않는다.
   */
  async preview(userId: string): Promise<ReportPreview> {
    const essentialCodes: string[] = [...ESSENTIAL_TEST_CODES];
    const optionalCodes = await this.findOptionalCodes();
    const { latestByCode, missing, includedCodes } = await this.selectLatestSessions(
      userId,
      essentialCodes,
      optionalCodes,
    );

    const definitions = await this.prisma.testDefinition.findMany({
      where: { code: { in: includedCodes } },
    });
    const nameByCode = new Map(definitions.map((d) => [d.code, d.name]));

    const items: ReportPreviewItem[] = includedCodes
      .filter((code) => latestByCode.has(code))
      .map((code) => {
        const session = latestByCode.get(code)!;
        return {
          testCode: code,
          testName: nameByCode.get(code) ?? code,
          sessionId: session.id,
          completedAt: session.completedAt!,
          band: session.band,
          rawScore: session.rawScore,
        };
      });

    const dateSpan = computeDateSpanWarning(
      items.map((i) => i.completedAt),
      DATE_SPAN_WARNING_THRESHOLD_DAYS,
    );

    return {
      items,
      missingTestCodes: missing,
      ready: missing.length === 0,
      dateSpanDays: dateSpan.spanDays,
      warningThresholdDays: dateSpan.thresholdDays,
      requiresConfirmation: dateSpan.requiresConfirmation,
    };
  }

  /**
   * 사용자의 완료된 필수 검사 세션들을 표준화해 PersonModel을 만든다.
   * 동일한 세션 조합으로 이미 만들어진 PersonModel이 있으면 재계산하지 않고 재사용한다.
   */
  async build(userId: string, options: { acknowledgeDateSpanWarning?: boolean } = {}) {
    const essentialCodes: string[] = [...ESSENTIAL_TEST_CODES];
    const optionalCodes = await this.findOptionalCodes();
    const { latestByCode, missing, includedCodes } = await this.selectLatestSessions(
      userId,
      essentialCodes,
      optionalCodes,
    );

    if (missing.length > 0) {
      throw new BadRequestException(`다음 필수 검사를 아직 완료하지 않았습니다: ${missing.join(', ')}`);
    }

    const completedAts = includedCodes.map((code) => latestByCode.get(code)!.completedAt!);
    const dateSpan = computeDateSpanWarning(completedAts, DATE_SPAN_WARNING_THRESHOLD_DAYS);
    if (dateSpan.requiresConfirmation && !options.acknowledgeDateSpanWarning) {
      throw new BadRequestException(
        `검사 완료 시점 간 간격이 ${dateSpan.spanDays}일로 넓어 리포트 정확도가 낮을 수 있습니다. 미리보기에서 내용을 확인한 뒤 다시 요청해주세요.`,
      );
    }

    const definitions = await this.prisma.testDefinition.findMany({
      where: { code: { in: includedCodes } },
    });
    const definitionByCode = new Map(definitions.map((d) => [d.code, d]));

    const sourceSessionIds = includedCodes.map((code) => latestByCode.get(code)!.id);

    const previous = await this.prisma.personModel.findFirst({
      where: { userId },
      orderBy: { version: 'desc' },
    });
    if (previous && isSameSessionSet(previous.sourceSessionIds, sourceSessionIds)) {
      return previous;
    }

    const testResults = includedCodes.map((code) => {
      const session = latestByCode.get(code)!;
      const definition = definitionByCode.get(code)!;
      return buildPersonModelTestResult(
        {
          testCode: session.testCode,
          testDefinitionVersion: session.testDefinitionVersion,
          rawScore: session.rawScore,
          band: session.band,
          subscaleScores: session.subscaleScores,
          alternateScores: session.alternateScores,
          completedAt: session.completedAt!, // status === COMPLETED로 조회했으므로 항상 존재
        },
        definition,
      );
    });

    return this.prisma.personModel.create({
      data: {
        userId,
        sourceSessionIds,
        version: (previous?.version ?? 0) + 1,
        testResults,
        metadata: {
          completedEssentialCount: essentialCodes.length,
          totalEssentialCount: essentialCodes.length,
          previousPersonModelId: previous?.id,
          generatedAt: new Date(),
        },
      },
    });
  }
}
