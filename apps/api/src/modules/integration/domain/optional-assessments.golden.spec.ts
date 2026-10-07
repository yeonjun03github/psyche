import { aes } from '../../../../prisma/seed/data/aes';
import { als18, ALS18_SUBSCALE_NAMES } from '../../../../prisma/seed/data/als18';
import { shaps } from '../../../../prisma/seed/data/shaps';
import { GenericTestScorer, type ScoringConfigInput } from '../../test-definitions/domain/scoring/generic-test-scorer';
import { buildPersonModelTestResult, type TestDefinitionInput } from './person-model.mapper';
import { buildTestScoreView, type ScoreViewDefinitionInput } from './test-score-view';

/**
 * Golden test — 대표 입력 → 기대 결과를 고정한다. 기대값은 첨부 JSX의 채점 규칙을 손으로 계산한 값이며,
 * 채점기/시드/환산 로직이 바뀌어 결과가 달라지면 이 테스트가 깨져서 의도하지 않은 변경을 알려준다.
 *
 * 또한 첨부 JSX의 computeScore를 그대로 옮긴 "참조 구현(oracle)"과 무작위 응답 수백 건을 비교해,
 * 문항별 역채점·하위척도 배정·응답 방향이 원본과 어긋나지 않는지 확인한다.
 */

interface SeedLike extends TestDefinitionInput, ScoreViewDefinitionInput {
  questions: { questionId: string; reverseScored: boolean }[];
  scoringConfig: ScoringConfigInput & ScoreViewDefinitionInput['scoringConfig'];
}

const scorer = new GenericTestScorer();

function evaluate(definition: unknown, testCode: string, values: number[]) {
  const seed = definition as SeedLike;
  const answers = seed.questions.map((q, i) => ({ questionId: q.questionId, value: values[i] }));
  const scored = scorer.score(answers, seed.questions, seed.responseScaleMin, seed.responseScaleMax, seed.scoringConfig);
  const result = buildPersonModelTestResult(
    {
      testCode,
      testDefinitionVersion: 1,
      rawScore: scored.rawScore,
      band: scored.band,
      subscaleScores: scored.subscaleScores,
      alternateScores: scored.alternateScores,
      completedAt: new Date('2026-10-01T00:00:00Z'),
    },
    seed,
  );
  return buildTestScoreView(result, seed);
}

const fill = (n: number, value: number) => Array<number>(n).fill(value);

describe('AES golden', () => {
  // 역채점이 아닌 문항: q6, q10, q11 (인덱스 5, 9, 10)
  const NON_REVERSED = new Set([5, 9, 10]);
  const worstCase = Array.from({ length: 18 }, (_, i) => (NON_REVERSED.has(i) ? 4 : 1)); // 무의욕 최대
  const bestCase = Array.from({ length: 18 }, (_, i) => (NON_REVERSED.has(i) ? 1 : 4)); // 무의욕 최소
  const mixed = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2];

  const project = (values: number[]) => {
    const v = evaluate(aes, 'AES', values);
    return { raw: v.rawScore, display: v.displayRawScore, normalized: v.normalizedScore, band: v.band };
  };

  it('무의욕 최소(총점 18)', () => {
    expect(project(bestCase)).toEqual({ raw: 18, display: '18점 (범위 18–72)', normalized: 0, band: null });
  });
  it('무의욕 최대(총점 72)', () => {
    expect(project(worstCase)).toEqual({ raw: 72, display: '72점 (범위 18–72)', normalized: 100, band: null });
  });
  it('모든 문항 1점 / 4점 응답', () => {
    expect(project(fill(18, 1)).raw).toBe(63);
    expect(project(fill(18, 4)).raw).toBe(27);
  });
  it('혼합 응답(1,2,3,4 반복)은 46점', () => {
    expect(project(mixed)).toEqual({ raw: 46, display: '46점 (범위 18–72)', normalized: 52, band: null });
  });
});

describe('ALS-18 golden — 한 하위척도만 높은 패턴', () => {
  const { AD, DE, ANGER } = ALS18_SUBSCALE_NAMES;
  const AD_IDX = [1, 3, 5, 6, 7].map((n) => n - 1);
  const DE_IDX = [2, 10, 12, 13, 15, 16, 17, 18].map((n) => n - 1);
  const ANGER_IDX = [4, 8, 9, 11, 14].map((n) => n - 1);

  const pattern = (highIdx: number[]) => Array.from({ length: 18 }, (_, i) => (highIdx.includes(i) ? 4 : 1));
  const project = (values: number[]) => {
    const v = evaluate(als18, 'ALS18', values);
    return {
      overallRaw: Number(v.rawScore!.toFixed(4)),
      overallNormalized: v.normalizedScore,
      band: v.band,
      subs: Object.fromEntries(v.subscaleScores.map((s) => [s.name, [s.rawScore, s.normalizedScore, s.band]])),
    };
  };

  it('AD만 높음', () => {
    expect(project(pattern(AD_IDX))).toEqual({
      overallRaw: 1.8333,
      overallNormalized: 28,
      band: null,
      subs: { [AD]: [4, 100, null], [DE]: [1, 0, null], [ANGER]: [1, 0, null] },
    });
  });
  it('DE만 높음', () => {
    expect(project(pattern(DE_IDX))).toEqual({
      overallRaw: 2.3333,
      overallNormalized: 44,
      band: null,
      subs: { [AD]: [1, 0, null], [DE]: [4, 100, null], [ANGER]: [1, 0, null] },
    });
  });
  it('ANGER만 높음', () => {
    expect(project(pattern(ANGER_IDX))).toEqual({
      overallRaw: 1.8333,
      overallNormalized: 28,
      band: null,
      subs: { [AD]: [1, 0, null], [DE]: [1, 0, null], [ANGER]: [4, 100, null] },
    });
  });
});

describe('SHAPS golden', () => {
  const project = (values: number[]) => {
    const v = evaluate(shaps, 'SHAPS', values);
    const binary = v.alternateScores.find((a) => a.key === 'binary')!;
    return {
      dimensional: v.rawScore,
      dimensionalDisplay: v.displayRawScore,
      dimensionalBand: v.band,
      binary: binary.rawScore,
      binaryBand: binary.band,
    };
  };
  /** 앞 n개 문항만 "그렇지 않다(2, 비찬성)", 나머지는 "그렇다(3, 찬성)" */
  const disagreeing = (n: number) => Array.from({ length: 14 }, (_, i) => (i < n ? 2 : 3));

  it('차원 최소(전부 "매우 그렇다")', () => {
    expect(project(fill(14, 4))).toEqual({
      dimensional: 14,
      dimensionalDisplay: '14점 (범위 14–56)',
      dimensionalBand: null,
      binary: 0,
      binaryBand: '절단점 미만(2점 이하)',
    });
  });
  it('차원 최대(전부 "전혀 그렇지 않다")', () => {
    expect(project(fill(14, 1))).toEqual({
      dimensional: 56,
      dimensionalDisplay: '56점 (범위 14–56)',
      dimensionalBand: null,
      binary: 14,
      binaryBand: '절단점 이상(3점 이상)',
    });
  });
  it('이분 절단점 직전(비찬성 2문항): 이분 2, 차원 30', () => {
    expect(project(disagreeing(2))).toMatchObject({ dimensional: 30, binary: 2, binaryBand: '절단점 미만(2점 이하)' });
  });
  it('이분 절단점 직후(비찬성 3문항): 이분 3, 차원 31', () => {
    expect(project(disagreeing(3))).toMatchObject({ dimensional: 31, binary: 3, binaryBand: '절단점 이상(3점 이상)' });
  });
  it('차원 점수는 1점 오를 때마다 정확히 1씩 변하고, 이분 점수는 2↔3 경계에서만 변한다', () => {
    const base = fill(14, 3);
    const at = (v: number) => project(base.map((x, i) => (i === 0 ? v : x)));
    expect(at(4).dimensional).toBe(27); // 13*2 + 1
    expect(at(3).dimensional).toBe(28);
    expect(at(2).dimensional).toBe(29);
    expect(at(1).dimensional).toBe(30);
    expect([at(4).binary, at(3).binary, at(2).binary, at(1).binary]).toEqual([0, 0, 1, 1]);
  });
});

/** 첨부 JSX의 computeScore 를 그대로 옮긴 참조 구현. 시드·채점기와 독립적으로 유지한다. */
describe('첨부 JSX 참조 구현(oracle)과 무작위 응답 비교', () => {
  const AES_NOT_REVERSED_IDS = [6, 10, 11];
  const ALS_SUB: Record<number, 'AD' | 'DE' | 'ANGER'> = {
    1: 'AD', 2: 'DE', 3: 'AD', 4: 'ANGER', 5: 'AD', 6: 'AD', 7: 'AD', 8: 'ANGER', 9: 'ANGER',
    10: 'DE', 11: 'ANGER', 12: 'DE', 13: 'DE', 14: 'ANGER', 15: 'DE', 16: 'DE', 17: 'DE', 18: 'DE',
  };

  // 결정적 의사난수(LCG) — 실행마다 같은 응답 집합을 쓴다
  function* rng(seed: number) {
    let s = seed;
    while (true) {
      s = (s * 1664525 + 1013904223) % 4294967296;
      yield s / 4294967296;
    }
  }
  const randomAnswers = (gen: Generator<number>, n: number) =>
    Array.from({ length: n }, () => Math.floor((gen.next().value as number) * 4) + 1);

  it('AES: 총점이 JSX와 같다 (200건)', () => {
    const gen = rng(1);
    for (let k = 0; k < 200; k++) {
      const values = randomAnswers(gen, 18);
      const expected = values.reduce(
        (sum, v, i) => sum + (AES_NOT_REVERSED_IDS.includes(i + 1) ? v : 5 - v),
        0,
      );
      expect(evaluate(aes, 'AES', values).rawScore).toBe(expected);
    }
  });

  it('ALS-18: 전체 평균과 하위척도 평균이 JSX와 같다 (200건)', () => {
    const gen = rng(2);
    const key = { AD: AD_NAME(), DE: DE_NAME(), ANGER: ANGER_NAME() };
    for (let k = 0; k < 200; k++) {
      const values = randomAnswers(gen, 18);
      const sums = { AD: 0, DE: 0, ANGER: 0 };
      const counts = { AD: 0, DE: 0, ANGER: 0 };
      values.forEach((v, i) => {
        sums[ALS_SUB[i + 1]] += v;
        counts[ALS_SUB[i + 1]] += 1;
      });
      const view = evaluate(als18, 'ALS18', values);
      expect(view.rawScore).toBeCloseTo(values.reduce((a, b) => a + b, 0) / 18, 10);
      for (const sub of ['AD', 'DE', 'ANGER'] as const) {
        const actual = view.subscaleScores.find((s) => s.name === key[sub])!;
        expect(actual.rawScore).toBeCloseTo(sums[sub] / counts[sub], 10);
      }
    }
  });

  it('SHAPS: 이분/차원 점수가 JSX와 같다 (200건)', () => {
    const gen = rng(3);
    for (let k = 0; k < 200; k++) {
      const values = randomAnswers(gen, 14);
      const binary = values.reduce((sum, v) => sum + (v <= 2 ? 1 : 0), 0); // JSX binaryPoint
      const dimensional = values.reduce((sum, v) => sum + (5 - v), 0); // JSX dimensionalPoint
      const view = evaluate(shaps, 'SHAPS', values);
      expect(view.rawScore).toBe(dimensional);
      expect(view.alternateScores[0].rawScore).toBe(binary);
      // JSX: binaryScore >= 3 이면 abnormal(= 절단점 이상)
      expect(view.alternateScores[0].band?.startsWith(binary >= 3 ? '절단점 이상' : '절단점 미만')).toBe(true);
    }
  });
});

function AD_NAME() {
  return ALS18_SUBSCALE_NAMES.AD;
}
function DE_NAME() {
  return ALS18_SUBSCALE_NAMES.DE;
}
function ANGER_NAME() {
  return ALS18_SUBSCALE_NAMES.ANGER;
}
