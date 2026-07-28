import { normalizeToPercent, possibleRawScoreRange } from './score-normalizer';

export interface SessionSubscaleScoreInput {
  name: string;
  rawScore: number;
  band: string;
}

export interface SessionInput {
  testCode: string;
  testDefinitionVersion: number;
  rawScore: number | null;
  band: string | null;
  subscaleScores: SessionSubscaleScoreInput[];
  completedAt: Date;
}

export interface SubscaleDefinitionInput {
  name: string;
  questionIds: string[];
}

export interface TestDefinitionInput {
  questions: { questionId: string }[];
  responseScaleMin: number;
  responseScaleMax: number;
  scoringConfig: {
    multiplier: number;
    divisor: number;
    subscales: SubscaleDefinitionInput[];
  };
}

export interface PersonModelSubscaleResult {
  name: string;
  rawScore: number;
  normalizedScore: number;
  band: string;
}

export interface PersonModelTestResultOutput {
  testCode: string;
  testDefinitionVersion: number;
  rawScore: number | null;
  normalizedScore: number | null;
  band: string | null;
  subscaleScores: PersonModelSubscaleResult[];
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
        scoringConfig.divisor,
      );
      return {
        name: s.name,
        rawScore: s.rawScore,
        band: s.band,
        normalizedScore: normalizeToPercent(s.rawScore, range.min, range.max),
      };
    });

    return {
      testCode: session.testCode,
      testDefinitionVersion: session.testDefinitionVersion,
      rawScore: null,
      normalizedScore: null,
      band: null,
      subscaleScores,
      completedAt: session.completedAt,
    };
  }

  if (session.rawScore === null || session.band === null) {
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
    completedAt: session.completedAt,
  };
}

/** 두 세션 ID 집합이 순서 무관하게 동일한지 확인한다(PersonModel 재사용 여부 판단용). */
export function isSameSessionSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}
