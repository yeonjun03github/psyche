/**
 * 필수 7종은 물론 향후 추가될 선택 검사(OCI-R, ASRS 등)까지 포함해도 전부
 * "역채점 보정 → 합산 → (×multiplier)÷divisor → 밴드 매핑" 형태의 Likert 합산 척도다.
 * 검사마다 다른 것은 이 공식이 아니라 데이터(문항 방향·배점·밴드 구간)뿐이므로
 * 검사별 Scorer 클래스를 두지 않고 데이터 기반 단일 로직으로 처리한다.
 */

export interface AnswerInput {
  questionId: string;
  value: number;
}

export interface QuestionMeta {
  questionId: string;
  reverseScored: boolean;
}

export interface ScoreBandConfig {
  min: number;
  max: number;
  label: string;
  description: string;
}

export interface SubscaleConfig {
  name: string;
  questionIds: string[];
  bands: ScoreBandConfig[];
}

export interface ScoringConfigInput {
  multiplier: number;
  divisor: number;
  bands: ScoreBandConfig[];
  subscales: SubscaleConfig[];
}

export interface SubscaleScoreResult {
  name: string;
  rawScore: number;
  band: string;
}

export interface ScoreResult {
  /** 하위척도만 있는 검사(예: Big Five)는 전체 총점 개념이 없으므로 null */
  rawScore: number | null;
  band: string | null;
  subscaleScores: SubscaleScoreResult[];
}

export class GenericTestScorer {
  score(
    answers: AnswerInput[],
    questions: QuestionMeta[],
    responseScaleMin: number,
    responseScaleMax: number,
    scoringConfig: ScoringConfigInput,
  ): ScoreResult {
    const reverseQuestionIds = new Set(
      questions.filter((q) => q.reverseScored).map((q) => q.questionId),
    );

    const adjustedByQuestionId = new Map<string, number>();
    for (const answer of answers) {
      const value = reverseQuestionIds.has(answer.questionId)
        ? responseScaleMin + responseScaleMax - answer.value
        : answer.value;
      adjustedByQuestionId.set(answer.questionId, value);
    }

    const sumOf = (questionIds: string[]): number =>
      questionIds.reduce((sum, id) => sum + (adjustedByQuestionId.get(id) ?? 0), 0);

    // divisor > 1인 검사(예: BRS의 평균 점수)는 결과가 정수가 아닐 수 있으므로 반올림하지 않는다 —
    // 밴드 경계값(ScoreBand)도 Float이라 소수점 그대로 비교해도 안전하다.
    const applyFormula = (sum: number): number => (sum * scoringConfig.multiplier) / scoringConfig.divisor;

    const resolveBand = (score: number, bands: ScoreBandConfig[]): string => {
      const band = bands.find((b) => score >= b.min && score <= b.max);
      if (!band) {
        throw new Error(`점수 ${score}에 해당하는 밴드를 찾을 수 없습니다.`);
      }
      return band.label;
    };

    if (scoringConfig.subscales.length > 0) {
      const subscaleScores = scoringConfig.subscales.map((subscale) => {
        const rawScore = applyFormula(sumOf(subscale.questionIds));
        return { name: subscale.name, rawScore, band: resolveBand(rawScore, subscale.bands) };
      });
      return { rawScore: null, band: null, subscaleScores };
    }

    const allQuestionIds = questions.map((q) => q.questionId);
    const rawScore = applyFormula(sumOf(allQuestionIds));
    return { rawScore, band: resolveBand(rawScore, scoringConfig.bands), subscaleScores: [] };
  }
}
