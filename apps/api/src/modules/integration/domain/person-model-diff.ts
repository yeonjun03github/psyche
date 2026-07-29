export interface PersonModelDiffTestResultInput {
  testCode: string;
  normalizedScore: number | null;
  band: string | null;
  subscaleScores: { name: string; normalizedScore: number }[];
}

export interface PersonModelDiffInput {
  testResults: PersonModelDiffTestResultInput[];
  generatedAt: Date;
}

/** PersonModel 문서(Prisma 조회 결과)를 diffPersonModels 입력 형태로 변환한다 — 호출부 2곳(reports.service, report-generation.processor)이 공유한다. */
export interface PersonModelSnapshot {
  metadata: { generatedAt: Date };
  testResults: {
    testCode: string;
    normalizedScore: number | null;
    band: string | null;
    subscaleScores: { name: string; normalizedScore: number }[];
  }[];
}

export function toPersonModelDiffInput(personModel: PersonModelSnapshot): PersonModelDiffInput {
  return {
    generatedAt: personModel.metadata.generatedAt,
    testResults: personModel.testResults.map((t) => ({
      testCode: t.testCode,
      normalizedScore: t.normalizedScore,
      band: t.band,
      subscaleScores: t.subscaleScores.map((s) => ({ name: s.name, normalizedScore: s.normalizedScore })),
    })),
  };
}

export interface SubscaleDiff {
  name: string;
  previousNormalizedScore: number;
  currentNormalizedScore: number;
  delta: number;
}

export interface TestResultDiff {
  testCode: string;
  previousNormalizedScore: number | null;
  currentNormalizedScore: number | null;
  delta: number | null; // current - previous (부호 있는 순수 숫자)
  previousBand: string | null;
  currentBand: string | null;
  subscaleDiffs: SubscaleDiff[];
}

export interface PersonModelDiff {
  daysSincePrevious: number;
  testDiffs: TestResultDiff[];
}

/**
 * 두 PersonModel 스냅샷 사이의 순수 수치 차이만 계산한다. "개선/악화" 같은 방향 판정은
 * 절대 포함하지 않는다 — Big Five 하위척도처럼 "높으면 좋다"가 성립하지 않는 특질도 있어서,
 * 그 판단은 전적으로 LLM의 서술(improvedAreas/worsenedAreas)에 맡긴다.
 */
export function diffPersonModels(previous: PersonModelDiffInput, current: PersonModelDiffInput): PersonModelDiff {
  const previousByCode = new Map(previous.testResults.map((t) => [t.testCode, t]));
  const daysSincePrevious = Math.round(
    (current.generatedAt.getTime() - previous.generatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const testDiffs = current.testResults.map((cur) => {
    const prev = previousByCode.get(cur.testCode);
    const delta =
      prev && prev.normalizedScore != null && cur.normalizedScore != null
        ? cur.normalizedScore - prev.normalizedScore
        : null;

    const previousSubscaleByName = new Map((prev?.subscaleScores ?? []).map((s) => [s.name, s]));
    const subscaleDiffs: SubscaleDiff[] = cur.subscaleScores
      .filter((s) => previousSubscaleByName.has(s.name))
      .map((s) => {
        const previousSubscale = previousSubscaleByName.get(s.name)!;
        return {
          name: s.name,
          previousNormalizedScore: previousSubscale.normalizedScore,
          currentNormalizedScore: s.normalizedScore,
          delta: s.normalizedScore - previousSubscale.normalizedScore,
        };
      });

    return {
      testCode: cur.testCode,
      previousNormalizedScore: prev?.normalizedScore ?? null,
      currentNormalizedScore: cur.normalizedScore,
      delta,
      previousBand: prev?.band ?? null,
      currentBand: cur.band,
      subscaleDiffs,
    };
  });

  return { daysSincePrevious, testDiffs };
}
