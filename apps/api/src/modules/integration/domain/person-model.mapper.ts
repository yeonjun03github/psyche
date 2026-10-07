import { normalizeToPercent, possibleRawScoreRange } from './score-normalizer';

export interface SessionSubscaleScoreInput {
  name: string;
  rawScore: number;
  /** 절단점이 없는 하위척도는 null */
  band: string | null;
}

export interface SessionAlternateScoreInput {
  key: string;
  name: string;
  rawScore: number;
  band: string | null;
}

export interface SessionInput {
  testCode: string;
  testDefinitionVersion: number;
  rawScore: number | null;
  band: string | null;
  subscaleScores: SessionSubscaleScoreInput[];
  /** 보조 점수가 없는 기존 세션 문서는 비어 있거나 undefined일 수 있다 */
  alternateScores?: SessionAlternateScoreInput[];
  completedAt: Date;
}

export interface SubscaleDefinitionInput {
  name: string;
  questionIds: string[];
  /** 하위척도 평균 채점에서 문항 수 기준 나눗수가 따로 지정된 경우 */
  divisor?: number | null;
}

export interface TestDefinitionInput {
  questions: { questionId: string }[];
  responseScaleMin: number;
  responseScaleMax: number;
  scoringConfig: {
    multiplier: number;
    divisor: number;
    subscales: SubscaleDefinitionInput[];
    reportOverallWithSubscales?: boolean | null;
  };
}

export interface PersonModelSubscaleResult {
  name: string;
  rawScore: number;
  normalizedScore: number;
  band: string | null;
}

/** 정규화하지 않고 원점수 그대로 보존하는 보조 점수(예: SHAPS 이분 점수) */
export interface PersonModelAlternateResult {
  key: string;
  name: string;
  rawScore: number;
  band: string | null;
}

export interface PersonModelTestResultOutput {
  testCode: string;
  testDefinitionVersion: number;
  rawScore: number | null;
  normalizedScore: number | null;
  band: string | null;
  subscaleScores: PersonModelSubscaleResult[];
  alternateScores: PersonModelAlternateResult[];
  completedAt: Date;
}

/**
 * TestSession(해석 없는 원점수) + TestDefinition(문항 수·스케일·채점 공식)을 조합해
 * 정규화된 PersonModelTestResult 하나를 만든다. 순수 함수라 DB 없이 단위테스트 가능하다.
 */
export function buildPersonModelTestResult(
  session: SessionInput,
  definition: TestDefinitionInput,
): PersonModelTestResultOutput {
  const { responseScaleMin, responseScaleMax, scoringConfig } = definition;
  const alternateScores: PersonModelAlternateResult[] = (session.alternateScores ?? []).map((a) => ({
    key: a.key,
    name: a.name,
    rawScore: a.rawScore,
    band: a.band,
  }));

  if (session.subscaleScores.length > 0) {
    const subscaleScores = session.subscaleScores.map((s) => {
      const subscaleDef = scoringConfig.subscales.find((sc) => sc.name === s.name);
      if (!subscaleDef) {
        throw new Error(`"${session.testCode}"에서 하위척도 "${s.name}"의 정의를 찾을 수 없습니다.`);
      }
      const range = possibleRawScoreRange(
        subscaleDef.questionIds.length,
        responseScaleMin,
        responseScaleMax,
        scoringConfig.multiplier,
        subscaleDef.divisor ?? scoringConfig.divisor,
      );
      return {
        name: s.name,
        rawScore: s.rawScore,
        band: s.band,
        normalizedScore: normalizeToPercent(s.rawScore, range.min, range.max),
      };
    });

    // 하위척도와 함께 전체 점수도 보고하는 검사(ALS-18의 전체 평균)는 전체 점수를 버리지 않는다.
    if (scoringConfig.reportOverallWithSubscales) {
      if (session.rawScore === null) {
        throw new Error(`"${session.testCode}" 세션에 전체 점수가 없습니다.`);
      }
      const overallRange = possibleRawScoreRange(
        definition.questions.length,
        responseScaleMin,
        responseScaleMax,
        scoringConfig.multiplier,
        scoringConfig.divisor,
      );
      return {
        testCode: session.testCode,
        testDefinitionVersion: session.testDefinitionVersion,
        rawScore: session.rawScore,
        normalizedScore: normalizeToPercent(session.rawScore, overallRange.min, overallRange.max),
        band: session.band,
        subscaleScores,
        alternateScores,
        completedAt: session.completedAt,
      };
    }

    return {
      testCode: session.testCode,
      testDefinitionVersion: session.testDefinitionVersion,
      rawScore: null,
      normalizedScore: null,
      band: null,
      subscaleScores,
      alternateScores,
      completedAt: session.completedAt,
    };
  }

  // band는 절단점이 없는 검사에서 null일 수 있으므로 채점 결과의 존재 여부는 rawScore로만 판단한다.
  if (session.rawScore === null) {
    throw new Error(`"${session.testCode}" 세션에 채점 결과가 없습니다.`);
  }

  const range = possibleRawScoreRange(
    definition.questions.length,
    responseScaleMin,
    responseScaleMax,
    scoringConfig.multiplier,
    scoringConfig.divisor,
  );

  return {
    testCode: session.testCode,
    testDefinitionVersion: session.testDefinitionVersion,
    rawScore: session.rawScore,
    normalizedScore: normalizeToPercent(session.rawScore, range.min, range.max),
    band: session.band,
    subscaleScores: [],
    alternateScores,
    completedAt: session.completedAt,
  };
}

/** 두 세션 ID 집합이 순서 무관하게 동일한지 확인한다(PersonModel 재사용 여부 판단용). */
export function isSameSessionSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}
