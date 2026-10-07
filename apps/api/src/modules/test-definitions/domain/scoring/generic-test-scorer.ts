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
  /** 하위척도마다 문항 수가 다른 평균 채점(ALS-18)에서만 지정한다. 없으면 scoringConfig.divisor */
  divisor?: number | null;
}

/**
 * 주 점수와 같은 응답에서 구하는 보조 점수 규칙(예: SHAPS 이분 점수).
 * BINARY_SUM: 역채점 보정이 끝난 문항 점수가 threshold 이상이면 1점, 아니면 0점으로 합산한다.
 */
export interface AlternateScoringConfig {
  key: string;
  name: string;
  kind: string;
  threshold?: number | null;
  min: number;
  max: number;
  bands: ScoreBandConfig[];
}

export interface ScoringConfigInput {
  multiplier: number;
  divisor: number;
  /** 비어 있으면 확립된 절단점이 없는 검사 — band는 null로 둔다 */
  bands: ScoreBandConfig[];
  subscales: SubscaleConfig[];
  /** true면 하위척도가 있어도 전체 점수를 함께 계산한다(ALS-18의 전체 평균) */
  reportOverallWithSubscales?: boolean | null;
  alternateScores?: AlternateScoringConfig[];
}

export interface SubscaleScoreResult {
  name: string;
  rawScore: number;
  band: string | null;
}

export interface AlternateScoreResult {
  key: string;
  name: string;
  rawScore: number;
  band: string | null;
}

export interface ScoreResult {
  /** 하위척도만 있는 검사(예: Big Five)는 전체 총점 개념이 없으므로 null */
  rawScore: number | null;
  /** 밴드가 정의되지 않은 검사(절단점 없음)도 null */
  band: string | null;
  subscaleScores: SubscaleScoreResult[];
  alternateScores: AlternateScoreResult[];
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

    const resolveBand = (score: number, bands: ScoreBandConfig[]): string | null => {
      if (bands.length === 0) return null;
      const band = bands.find((b) => score >= b.min && score <= b.max);
      if (!band) {
        throw new Error(`점수 ${score}에 해당하는 밴드를 찾을 수 없습니다.`);
      }
      return band.label;
    };

    const allQuestionIds = questions.map((q) => q.questionId);

    const alternateScores = (scoringConfig.alternateScores ?? []).map((alt) => {
      if (alt.kind !== 'BINARY_SUM' || alt.threshold == null) {
        throw new Error(`지원하지 않는 보조 점수 규칙입니다: ${alt.key}`);
      }
      const threshold = alt.threshold;
      const rawScore = allQuestionIds.reduce(
        (sum, id) => sum + ((adjustedByQuestionId.get(id) ?? 0) >= threshold ? 1 : 0),
        0,
      );
      return { key: alt.key, name: alt.name, rawScore, band: resolveBand(rawScore, alt.bands) };
    });

    if (scoringConfig.subscales.length > 0) {
      const subscaleScores = scoringConfig.subscales.map((subscale) => {
        // 하위척도에 divisor가 지정되면 그 문항 수 기준 평균, 아니면 검사 공통 공식을 쓴다.
        const sum = sumOf(subscale.questionIds);
        const rawScore =
          subscale.divisor != null
            ? (sum * scoringConfig.multiplier) / subscale.divisor
            : applyFormula(sum);
        return { name: subscale.name, rawScore, band: resolveBand(rawScore, subscale.bands) };
      });

      if (scoringConfig.reportOverallWithSubscales) {
        const overall = applyFormula(sumOf(allQuestionIds));
        return {
          rawScore: overall,
          band: resolveBand(overall, scoringConfig.bands),
          subscaleScores,
          alternateScores,
        };
      }
      return { rawScore: null, band: null, subscaleScores, alternateScores };
    }

    const rawScore = applyFormula(sumOf(allQuestionIds));
    return { rawScore, band: resolveBand(rawScore, scoringConfig.bands), subscaleScores: [], alternateScores };
  }
}
