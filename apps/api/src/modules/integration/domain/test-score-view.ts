import { possibleRawScoreRange } from './score-normalizer';

/**
 * PersonModel에 저장된 검사 결과(원점수·정규화 점수·밴드)를 "사람이 읽는 점수"로 바꾸는 순수 함수.
 * 리포트 화면, AI 리포트 프롬프트, 후속 질문(chat) 프롬프트가 모두 같은 변환기를 쓰도록 한 곳에 둔다 —
 * 그래야 화면과 AI가 원점수·범위·0-100 환산·해석 구간을 같은 방식으로 구분해서 전달한다.
 *
 * 세 가지는 서로 다른 값이라 절대 섞지 않는다.
 * - 원점수(rawScore): 검사 고유 척도의 점수. 범위(rawScoreMin~rawScoreMax)와 함께 읽어야 의미가 있다.
 * - 0-100 환산(normalizedScore): 원점수가 이론상 범위 안에서 어디쯤인지를 선형으로 옮긴 상대 위치. 원점수도, 임상 기준도 아니다.
 * - 해석 구간(band): 검사에 확립된 기준(절단점)이 있을 때만 존재한다. 없으면 null.
 */

export interface TestMetaInput {
  concept: string;
  scoreDirection: string;
  scoreLabel?: string | null;
  hasCutoff: boolean;
  translationStatus: string;
  translationNote?: string | null;
  interpretationCaveats: string[];
}

export interface ScoreViewDefinitionInput {
  name: string;
  responseScaleMin: number;
  responseScaleMax: number;
  questions: { questionId: string }[];
  scoringConfig: {
    multiplier: number;
    divisor: number;
    subscales: { name: string; questionIds: string[]; divisor?: number | null }[];
    alternateScores?: { key: string; name: string; min: number; max: number }[] | null;
  };
  meta?: TestMetaInput | null;
}

export interface ScoreViewResultInput {
  testCode: string;
  rawScore: number | null;
  normalizedScore: number | null;
  band: string | null;
  subscaleScores: {
    name: string;
    rawScore: number;
    normalizedScore: number;
    band: string | null;
  }[];
  alternateScores?: { key: string; name: string; rawScore: number; band: string | null }[] | null;
}

export interface SubscaleScoreView {
  name: string;
  rawScore: number;
  rawScoreMin: number;
  rawScoreMax: number;
  displayRawScore: string;
  normalizedScore: number;
  band: string | null;
}

export interface AlternateScoreView {
  key: string;
  name: string;
  rawScore: number;
  rawScoreMin: number;
  rawScoreMax: number;
  displayRawScore: string;
  band: string | null;
}

export interface TestMetaView {
  concept: string;
  scoreDirection: string;
  hasCutoff: boolean;
  translationStatus: string;
  translationNote: string | null;
  interpretationCaveats: string[];
}

export interface TestScoreView {
  testCode: string;
  testName: string;
  /** 주 점수의 이름(예: 총점, 전체 평균, 환산 점수) */
  scoreLabel: string;
  rawScore: number | null;
  rawScoreMin: number | null;
  rawScoreMax: number | null;
  /** 예: "38점 (범위 18–72)" — 원점수는 항상 범위와 함께 표시한다 */
  displayRawScore: string | null;
  /** 0-100 환산(상대 위치). 원점수가 아니다 */
  normalizedScore: number | null;
  /** 검사에 확립된 해석 구간이 있을 때만 값이 있다 */
  band: string | null;
  subscaleScores: SubscaleScoreView[];
  alternateScores: AlternateScoreView[];
  /** 메타데이터가 없는 기존 검사는 null */
  meta: TestMetaView | null;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function formatRawScore(rawScore: number, min: number, max: number): string {
  return `${formatNumber(rawScore)}점 (범위 ${formatNumber(min)}–${formatNumber(max)})`;
}

function defaultScoreLabel(multiplier: number, divisor: number): string {
  if (divisor > 1 && multiplier === 1) return '평균 점수';
  if (multiplier > 1) return '환산 점수';
  return '총점';
}

export function buildTestScoreView(
  result: ScoreViewResultInput,
  definition: ScoreViewDefinitionInput,
): TestScoreView {
  const { responseScaleMin, responseScaleMax, scoringConfig, meta } = definition;

  const overallRange =
    result.rawScore !== null
      ? possibleRawScoreRange(
          definition.questions.length,
          responseScaleMin,
          responseScaleMax,
          scoringConfig.multiplier,
          scoringConfig.divisor,
        )
      : null;

  const subscaleScores: SubscaleScoreView[] = result.subscaleScores.map((s) => {
    const subscaleDef = scoringConfig.subscales.find((sc) => sc.name === s.name);
    if (!subscaleDef) {
      throw new Error(`"${result.testCode}"에서 하위척도 "${s.name}"의 정의를 찾을 수 없습니다.`);
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
      rawScoreMin: range.min,
      rawScoreMax: range.max,
      displayRawScore: formatRawScore(s.rawScore, range.min, range.max),
      normalizedScore: s.normalizedScore,
      band: s.band,
    };
  });

  const alternateScores: AlternateScoreView[] = (result.alternateScores ?? []).map((a) => {
    const altDef = scoringConfig.alternateScores?.find((d) => d.key === a.key);
    if (!altDef) {
      throw new Error(`"${result.testCode}"에서 보조 점수 "${a.key}"의 정의를 찾을 수 없습니다.`);
    }
    return {
      key: a.key,
      name: a.name,
      rawScore: a.rawScore,
      rawScoreMin: altDef.min,
      rawScoreMax: altDef.max,
      displayRawScore: formatRawScore(a.rawScore, altDef.min, altDef.max),
      band: a.band,
    };
  });

  return {
    testCode: result.testCode,
    testName: definition.name,
    scoreLabel:
      meta?.scoreLabel ?? defaultScoreLabel(scoringConfig.multiplier, scoringConfig.divisor),
    rawScore: result.rawScore,
    rawScoreMin: overallRange?.min ?? null,
    rawScoreMax: overallRange?.max ?? null,
    displayRawScore:
      result.rawScore !== null && overallRange
        ? formatRawScore(result.rawScore, overallRange.min, overallRange.max)
        : null,
    normalizedScore: result.normalizedScore,
    band: result.band,
    subscaleScores,
    alternateScores,
    meta: meta
      ? {
          concept: meta.concept,
          scoreDirection: meta.scoreDirection,
          hasCutoff: meta.hasCutoff,
          translationStatus: meta.translationStatus,
          translationNote: meta.translationNote ?? null,
          interpretationCaveats: meta.interpretationCaveats,
        }
      : null,
  };
}

export interface ScoreRangeView {
  scoreLabel: string;
  /** 전체(주) 점수의 이론상 범위. 하위척도만 있는 검사는 null */
  overall: { min: number; max: number } | null;
  subscales: { name: string; min: number; max: number }[];
  alternateScores: { key: string; name: string; min: number; max: number }[];
}

/**
 * 검사 정의만으로 유도되는 원점수 범위. 응시 이력 화면이 세션의 원점수(rawScore)를 범위와 함께
 * 표시할 수 있게 해 주며, 프론트가 채점 공식을 다시 구현하지 않도록 백엔드가 계산해서 내려준다.
 */
export function computeScoreRanges(
  definition: ScoreViewDefinitionInput & {
    scoringConfig: { reportOverallWithSubscales?: boolean | null };
  },
): ScoreRangeView {
  const { responseScaleMin, responseScaleMax, scoringConfig, meta } = definition;
  const hasOverall =
    scoringConfig.subscales.length === 0 || !!scoringConfig.reportOverallWithSubscales;
  return {
    scoreLabel:
      meta?.scoreLabel ?? defaultScoreLabel(scoringConfig.multiplier, scoringConfig.divisor),
    overall: hasOverall
      ? possibleRawScoreRange(
          definition.questions.length,
          responseScaleMin,
          responseScaleMax,
          scoringConfig.multiplier,
          scoringConfig.divisor,
        )
      : null,
    subscales: scoringConfig.subscales.map((s) => ({
      name: s.name,
      ...possibleRawScoreRange(
        s.questionIds.length,
        responseScaleMin,
        responseScaleMax,
        scoringConfig.multiplier,
        s.divisor ?? scoringConfig.divisor,
      ),
    })),
    alternateScores: (scoringConfig.alternateScores ?? []).map((a) => ({
      key: a.key,
      name: a.name,
      min: a.min,
      max: a.max,
    })),
  };
}
