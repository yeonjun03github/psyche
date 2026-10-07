import { aes } from '../../../../prisma/seed/data/aes';
import { als18, ALS18_SUBSCALE_NAMES } from '../../../../prisma/seed/data/als18';
import { shaps } from '../../../../prisma/seed/data/shaps';
import { GenericTestScorer, type ScoringConfigInput } from '../../test-definitions/domain/scoring/generic-test-scorer';
import { buildPersonModelTestResult, type TestDefinitionInput } from './person-model.mapper';
import { buildTestScoreView, type ScoreViewDefinitionInput } from './test-score-view';

interface SeedLike extends TestDefinitionInput, ScoreViewDefinitionInput {
  questions: { questionId: string; reverseScored: boolean }[];
  scoringConfig: ScoringConfigInput & ScoreViewDefinitionInput['scoringConfig'];
}

const scorer = new GenericTestScorer();
const COMPLETED_AT = new Date('2026-10-01T00:00:00Z');

function asSeed(definition: unknown): SeedLike {
  return definition as SeedLike;
}

/** 시드 정의로 응답 → 채점 → PersonModel 결과 → 화면/AI용 점수 뷰까지 실제 경로 그대로 통과시킨다. */
function run(definition: unknown, testCode: string, valueOf: (index: number) => number) {
  const seed = asSeed(definition);
  const answers = seed.questions.map((q, i) => ({ questionId: q.questionId, value: valueOf(i) }));
  const scored = scorer.score(answers, seed.questions, seed.responseScaleMin, seed.responseScaleMax, seed.scoringConfig);
  const personModelResult = buildPersonModelTestResult(
    {
      testCode,
      testDefinitionVersion: 1,
      rawScore: scored.rawScore,
      band: scored.band,
      subscaleScores: scored.subscaleScores,
      alternateScores: scored.alternateScores,
      completedAt: COMPLETED_AT,
    },
    seed,
  );
  const view = buildTestScoreView(personModelResult, seed);
  return { scored, personModelResult, view };
}

describe('AES — 원점수 / 0-100 환산 / 해석 구간 분리', () => {
  it('원점수 72(최대)는 범위 18–72와 함께 표시되고 0-100 환산은 100이다', () => {
    // 무의욕 최대: 역채점 문항은 1, 비역채점(q6,q10,q11)은 4
    const reverse = asSeed(aes).questions.map((q) => q.reverseScored);
    const { view, personModelResult } = run(aes, 'AES', (i) => (reverse[i] ? 1 : 4));
    expect(personModelResult.rawScore).toBe(72);
    expect(view.rawScore).toBe(72);
    expect(view.rawScoreMin).toBe(18);
    expect(view.rawScoreMax).toBe(72);
    expect(view.displayRawScore).toBe('72점 (범위 18–72)');
    expect(view.scoreLabel).toBe('총점');
    expect(view.normalizedScore).toBe(100);
  });

  it('원점수 18(최소)은 0-100 환산 0이며, 환산 점수가 원점수 자리에 들어가지 않는다', () => {
    const reverse = asSeed(aes).questions.map((q) => q.reverseScored);
    const { view } = run(aes, 'AES', (i) => (reverse[i] ? 4 : 1));
    expect(view.rawScore).toBe(18);
    expect(view.normalizedScore).toBe(0);
    expect(view.displayRawScore).toContain('18점');
    expect(view.displayRawScore).not.toContain('/100');
  });

  it('절단점이 없으므로 band가 null이고 메타데이터에도 절단점 없음/비공식 번역이 명시된다', () => {
    const { view } = run(aes, 'AES', () => 2);
    expect(view.band).toBeNull();
    expect(view.meta).toMatchObject({ hasCutoff: false, translationStatus: 'UNOFFICIAL_TRANSLATION' });
    expect(view.meta?.scoreDirection).toContain('높을수록');
  });
});

describe('ALS-18 — 전체 평균과 하위척도 구조 보존', () => {
  it('전체 평균과 하위척도 3개가 각각의 원점수 범위(1–4)와 함께 보존된다', () => {
    const { view, personModelResult } = run(als18, 'ALS18', () => 3);
    expect(personModelResult.rawScore).toBe(3);
    expect(personModelResult.subscaleScores.map((s) => s.name)).toEqual([
      ALS18_SUBSCALE_NAMES.AD,
      ALS18_SUBSCALE_NAMES.DE,
      ALS18_SUBSCALE_NAMES.ANGER,
    ]);
    expect(view.scoreLabel).toBe('전체 평균');
    expect(view.displayRawScore).toBe('3점 (범위 1–4)');
    for (const sub of view.subscaleScores) {
      expect(sub.rawScore).toBe(3);
      expect(sub.rawScoreMin).toBe(1);
      expect(sub.rawScoreMax).toBe(4);
    }
  });

  it('하위척도마다 문항 수가 달라도 정규화가 같은 기준(평균 1–4)으로 계산된다', () => {
    const { view } = run(als18, 'ALS18', () => 4);
    expect(view.normalizedScore).toBe(100);
    expect(view.subscaleScores.map((s) => s.normalizedScore)).toEqual([100, 100, 100]);

    const minimum = run(als18, 'ALS18', () => 1);
    expect(minimum.view.normalizedScore).toBe(0);
    expect(minimum.view.subscaleScores.map((s) => s.normalizedScore)).toEqual([0, 0, 0]);
  });

  it('해석 구간이 없고 메타데이터는 한국어판(검증됨)과 진단 금지 주의사항을 담는다', () => {
    const { view } = run(als18, 'ALS18', () => 2);
    expect(view.band).toBeNull();
    expect(view.subscaleScores.every((s) => s.band === null)).toBe(true);
    expect(view.meta).toMatchObject({ hasCutoff: false, translationStatus: 'PUBLISHED_KOREAN_VERSION' });
    expect(view.meta?.interpretationCaveats.join(' ')).toContain('진단');
  });
});

describe('SHAPS — 이분 점수와 차원 점수 동시 보존', () => {
  it('차원 점수는 주 점수, 이분 점수는 보조 점수로 각각 원점수 범위와 함께 보존된다', () => {
    // 앞 4문항 "그렇지 않다(2)", 나머지 "그렇다(3)"
    const { view, personModelResult } = run(shaps, 'SHAPS', (i) => (i < 4 ? 2 : 3));
    // 차원: 4문항 x (5-2=3) + 10문항 x (5-3=2) = 12 + 20 = 32
    expect(personModelResult.rawScore).toBe(32);
    expect(view.displayRawScore).toBe('32점 (범위 14–56)');
    expect(view.scoreLabel).toBe('차원 채점 총점');
    // 이분: 비찬성 4문항 → 4점(절단점 이상)
    expect(personModelResult.alternateScores).toHaveLength(1);
    expect(view.alternateScores).toHaveLength(1);
    expect(view.alternateScores[0]).toMatchObject({
      key: 'binary',
      rawScore: 4,
      rawScoreMin: 0,
      rawScoreMax: 14,
      displayRawScore: '4점 (범위 0–14)',
      band: '절단점 이상(3점 이상)',
    });
  });

  it('주 점수(차원)에는 해석 구간이 없고, 절단점은 이분 점수에만 존재한다', () => {
    const { view } = run(shaps, 'SHAPS', () => 4);
    expect(view.band).toBeNull();
    expect(view.alternateScores[0].band).toBe('절단점 미만(2점 이하)');
    expect(view.meta?.hasCutoff).toBe(true);
    expect(view.meta?.translationStatus).toBe('UNOFFICIAL_TRANSLATION');
  });

  it('이분 경계값(2점/3점)이 PersonModel을 거쳐도 유지된다', () => {
    const two = run(shaps, 'SHAPS', (i) => (i < 2 ? 2 : 3));
    const three = run(shaps, 'SHAPS', (i) => (i < 3 ? 2 : 3));
    expect(two.personModelResult.alternateScores[0]).toMatchObject({ rawScore: 2, band: '절단점 미만(2점 이하)' });
    expect(three.personModelResult.alternateScores[0]).toMatchObject({ rawScore: 3, band: '절단점 이상(3점 이상)' });
  });
});

describe('기존 검사 회귀', () => {
  it('보조 점수가 없는 기존 세션 문서(alternateScores 없음)도 매핑·뷰 생성이 된다', () => {
    const definition = {
      name: 'PHQ-9 (테스트)',
      responseScaleMin: 0,
      responseScaleMax: 3,
      questions: Array.from({ length: 9 }, (_, i) => ({ questionId: `q${i + 1}` })),
      scoringConfig: { multiplier: 1, divisor: 1, subscales: [] },
    };
    const result = buildPersonModelTestResult(
      {
        testCode: 'PHQ9',
        testDefinitionVersion: 1,
        rawScore: 13,
        band: '중등도',
        subscaleScores: [],
        completedAt: COMPLETED_AT,
      },
      definition,
    );
    expect(result.alternateScores).toEqual([]);

    const view = buildTestScoreView(result, definition);
    // 원점수 13은 0-27 범위 안의 값이고, 0-100 환산(48)과 별개의 필드다 — "48/100 중등도"로 섞이지 않는다.
    expect(view.displayRawScore).toBe('13점 (범위 0–27)');
    expect(view.normalizedScore).toBe(48);
    expect(view.band).toBe('중등도');
    expect(view.meta).toBeNull();
  });

  it('하위척도만 있는 기존 검사(Big Five)는 전체 점수 없이 하위척도만 반환한다', () => {
    const definition = {
      name: 'IPIP-50 (테스트)',
      responseScaleMin: 1,
      responseScaleMax: 5,
      questions: Array.from({ length: 4 }, (_, i) => ({ questionId: `q${i + 1}` })),
      scoringConfig: {
        multiplier: 1,
        divisor: 1,
        subscales: [{ name: '외향성', questionIds: ['q1', 'q2'] }],
      },
    };
    const result = buildPersonModelTestResult(
      {
        testCode: 'IPIP50',
        testDefinitionVersion: 1,
        rawScore: null,
        band: null,
        subscaleScores: [{ name: '외향성', rawScore: 8, band: '높음' }],
        completedAt: COMPLETED_AT,
      },
      definition,
    );
    expect(result.rawScore).toBeNull();
    expect(result.normalizedScore).toBeNull();
    expect(result.subscaleScores[0]).toMatchObject({ name: '외향성', rawScore: 8, normalizedScore: 75, band: '높음' });

    const view = buildTestScoreView(result, definition);
    expect(view.displayRawScore).toBeNull();
    expect(view.subscaleScores[0].displayRawScore).toBe('8점 (범위 2–10)');
  });
});
