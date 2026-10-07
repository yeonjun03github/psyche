import { aes } from '../../../../../prisma/seed/data/aes';
import { als18, ALS18_SUBSCALE_NAMES } from '../../../../../prisma/seed/data/als18';
import { shaps } from '../../../../../prisma/seed/data/shaps';
import { GenericTestScorer, type ScoringConfigInput } from './generic-test-scorer';

/**
 * 시드 정의(실제 서비스에 들어가는 데이터)를 그대로 채점기에 통과시켜 검증한다 —
 * 채점기 로직뿐 아니라 시드의 문항 수·역채점·하위척도 배정이 틀린 경우도 함께 잡는다.
 */
interface SeedLike {
  responseScaleMin: number;
  responseScaleMax: number;
  questions: { questionId: string; reverseScored: boolean; options: { value: number; label: string }[] }[];
  scoringConfig: ScoringConfigInput;
}

const scorer = new GenericTestScorer();

function asSeed(definition: unknown): SeedLike {
  return definition as SeedLike;
}

function answersFor(seed: SeedLike, valueOf: (index: number, questionId: string) => number) {
  return seed.questions.map((q, i) => ({ questionId: q.questionId, value: valueOf(i, q.questionId) }));
}

function scoreOf(seed: SeedLike, answers: { questionId: string; value: number }[]) {
  return scorer.score(answers, seed.questions, seed.responseScaleMin, seed.responseScaleMax, seed.scoringConfig);
}

describe('AES-S 채점', () => {
  const seed = asSeed(aes);

  it('18문항이며 6, 10, 11번만 역채점이 아니다', () => {
    expect(seed.questions).toHaveLength(18);
    const notReversed = seed.questions.filter((q) => !q.reverseScored).map((q) => q.questionId);
    expect(notReversed).toEqual(['q6', 'q10', 'q11']);
  });

  it('모든 문항 최소값(1) 응답: 역채점 15문항은 4점, 나머지 3문항은 1점 → 63점', () => {
    const result = scoreOf(seed, answersFor(seed, () => 1));
    expect(result.rawScore).toBe(15 * 4 + 3 * 1);
  });

  it('모든 문항 최대값(4) 응답: 역채점 15문항은 1점, 나머지 3문항은 4점 → 27점', () => {
    const result = scoreOf(seed, answersFor(seed, () => 4));
    expect(result.rawScore).toBe(15 * 1 + 3 * 4);
  });

  it('총점의 이론적 최소는 18, 최대는 72이다 (방향을 고려해 응답을 고른 경우)', () => {
    // 무의욕이 가장 낮은 응답: 역채점 문항은 "매우 그렇다(4)", 비역채점 문항은 "전혀 아니다(1)"
    const lowest = scoreOf(
      seed,
      answersFor(seed, (_, id) => (seed.questions.find((q) => q.questionId === id)!.reverseScored ? 4 : 1)),
    );
    // 무의욕이 가장 높은 응답: 반대
    const highest = scoreOf(
      seed,
      answersFor(seed, (_, id) => (seed.questions.find((q) => q.questionId === id)!.reverseScored ? 1 : 4)),
    );
    expect(lowest.rawScore).toBe(18);
    expect(highest.rawScore).toBe(72);
  });

  it('역채점 문항(q1)과 비역채점 문항(q6)이 반대 방향으로 계산된다', () => {
    const base = answersFor(seed, () => 2);
    const baseScore = scoreOf(seed, base).rawScore!;

    const q1Up = base.map((a) => (a.questionId === 'q1' ? { ...a, value: 3 } : a));
    const q6Up = base.map((a) => (a.questionId === 'q6' ? { ...a, value: 3 } : a));
    expect(scoreOf(seed, q1Up).rawScore).toBe(baseScore - 1); // 역채점: 응답이 오르면 점수는 내림
    expect(scoreOf(seed, q6Up).rawScore).toBe(baseScore + 1); // 비역채점: 응답이 오르면 점수도 오름
  });

  it('절단점이 없어 band는 null이다(임의 구간을 만들지 않는다)', () => {
    expect(seed.scoringConfig.bands).toEqual([]);
    expect(scoreOf(seed, answersFor(seed, () => 3)).band).toBeNull();
  });
});

describe('ALS-18 채점', () => {
  const seed = asSeed(als18);

  const SUBSCALE_ITEM_NUMBERS: Record<string, number[]> = {
    [ALS18_SUBSCALE_NAMES.AD]: [1, 3, 5, 6, 7],
    [ALS18_SUBSCALE_NAMES.DE]: [2, 10, 12, 13, 15, 16, 17, 18],
    [ALS18_SUBSCALE_NAMES.ANGER]: [4, 8, 9, 11, 14],
  };

  const subscaleOf = (result: ReturnType<typeof scoreOf>, name: string) =>
    result.subscaleScores.find((s) => s.name === name)!;

  it('18문항이며 어떤 문항도 역채점하지 않는다', () => {
    expect(seed.questions).toHaveLength(18);
    expect(seed.questions.every((q) => !q.reverseScored)).toBe(true);
  });

  it('각 문항이 올바른 하위척도에 배정되고 모든 문항이 정확히 한 번씩만 쓰인다', () => {
    for (const sub of seed.scoringConfig.subscales) {
      const expected = SUBSCALE_ITEM_NUMBERS[sub.name].map((n) => `q${n}`);
      expect([...sub.questionIds].sort()).toEqual([...expected].sort());
    }
    const all = seed.scoringConfig.subscales.flatMap((s) => s.questionIds);
    expect(all).toHaveLength(18);
    expect(new Set(all).size).toBe(18);
  });

  it('전체 평균 = 18문항 합 ÷ 18', () => {
    // q1..q18에 1..4를 순환 배정: 합 = (1+2+3+4)*4 + 1 + 2 = 43
    const answers = answersFor(seed, (i) => (i % 4) + 1);
    const result = scoreOf(seed, answers);
    expect(result.rawScore).toBeCloseTo(43 / 18, 10);
    expect(result.band).toBeNull();
  });

  it('하위척도 평균은 각 하위척도의 문항 수(5/8/5)로 나눈다', () => {
    // 해당 하위척도 문항만 4점, 나머지는 1점
    const onlyHigh = (names: string[]) =>
      answersFor(seed, (_, id) =>
        names.some((name) => SUBSCALE_ITEM_NUMBERS[name].map((n) => `q${n}`).includes(id)) ? 4 : 1,
      );

    const adHigh = scoreOf(seed, onlyHigh([ALS18_SUBSCALE_NAMES.AD]));
    expect(subscaleOf(adHigh, ALS18_SUBSCALE_NAMES.AD).rawScore).toBe(4);
    expect(subscaleOf(adHigh, ALS18_SUBSCALE_NAMES.DE).rawScore).toBe(1);
    expect(subscaleOf(adHigh, ALS18_SUBSCALE_NAMES.ANGER).rawScore).toBe(1);

    // 문항 수가 다른 하위척도에서도 평균이 1~4 범위를 벗어나지 않아야 한다(합계를 18로 잘못 나누면 깨진다)
    const deHigh = scoreOf(seed, onlyHigh([ALS18_SUBSCALE_NAMES.DE]));
    expect(subscaleOf(deHigh, ALS18_SUBSCALE_NAMES.DE).rawScore).toBe(4);
    expect(subscaleOf(deHigh, ALS18_SUBSCALE_NAMES.AD).rawScore).toBe(1);

    const angerHigh = scoreOf(seed, onlyHigh([ALS18_SUBSCALE_NAMES.ANGER]));
    expect(subscaleOf(angerHigh, ALS18_SUBSCALE_NAMES.ANGER).rawScore).toBe(4);
  });

  it('AD 하위척도 평균을 정확히 계산한다: q1,q3,q5,q6,q7 = 1,2,3,4,4 → 2.8', () => {
    const values: Record<string, number> = { q1: 1, q3: 2, q5: 3, q6: 4, q7: 4 };
    const result = scoreOf(seed, answersFor(seed, (_, id) => values[id] ?? 1));
    expect(subscaleOf(result, ALS18_SUBSCALE_NAMES.AD).rawScore).toBeCloseTo(2.8, 10);
  });

  it('DE 하위척도 평균을 정확히 계산한다: 8문항 합 20 → 2.5', () => {
    // q2,q10,q12,q13,q15,q16,q17,q18 = 1,2,3,4,1,2,3,4 → 합 20
    const values: Record<string, number> = { q2: 1, q10: 2, q12: 3, q13: 4, q15: 1, q16: 2, q17: 3, q18: 4 };
    const result = scoreOf(seed, answersFor(seed, (_, id) => values[id] ?? 1));
    expect(subscaleOf(result, ALS18_SUBSCALE_NAMES.DE).rawScore).toBeCloseTo(2.5, 10);
  });

  it('ANGER 하위척도 평균을 정확히 계산한다: q4,q8,q9,q11,q14 = 4,4,3,2,2 → 3', () => {
    const values: Record<string, number> = { q4: 4, q8: 4, q9: 3, q11: 2, q14: 2 };
    const result = scoreOf(seed, answersFor(seed, (_, id) => values[id] ?? 1));
    expect(subscaleOf(result, ALS18_SUBSCALE_NAMES.ANGER).rawScore).toBeCloseTo(3, 10);
  });

  it('전체 평균과 하위척도를 모두 보존한다(하위척도가 있어도 전체 점수를 버리지 않는다)', () => {
    const result = scoreOf(seed, answersFor(seed, () => 3));
    expect(result.rawScore).toBe(3);
    expect(result.subscaleScores.map((s) => s.name)).toEqual([
      ALS18_SUBSCALE_NAMES.AD,
      ALS18_SUBSCALE_NAMES.DE,
      ALS18_SUBSCALE_NAMES.ANGER,
    ]);
    expect(result.subscaleScores.every((s) => s.band === null)).toBe(true);
  });

  it('모두 최소값이면 평균 1, 모두 최대값이면 평균 4', () => {
    expect(scoreOf(seed, answersFor(seed, () => 1)).rawScore).toBe(1);
    expect(scoreOf(seed, answersFor(seed, () => 4)).rawScore).toBe(4);
  });
});

describe('SHAPS 채점', () => {
  const seed = asSeed(shaps);
  const binaryOf = (result: ReturnType<typeof scoreOf>) => result.alternateScores.find((a) => a.key === 'binary')!;

  it('14문항이며 전부 방향 보정(역채점)된다', () => {
    expect(seed.questions).toHaveLength(14);
    expect(seed.questions.every((q) => q.reverseScored)).toBe(true);
  });

  it('응답 방향이 뒤집히지 않는다: 전부 "매우 그렇다(4)"면 쾌감이 가장 높아 점수가 최저(14, 0)', () => {
    const result = scoreOf(seed, answersFor(seed, () => 4));
    expect(result.rawScore).toBe(14);
    expect(binaryOf(result).rawScore).toBe(0);
  });

  it('응답 방향이 뒤집히지 않는다: 전부 "전혀 그렇지 않다(1)"면 점수가 최고(56, 14)', () => {
    const result = scoreOf(seed, answersFor(seed, () => 1));
    expect(result.rawScore).toBe(56);
    expect(binaryOf(result).rawScore).toBe(14);
  });

  it('차원 점수는 14~56 범위이고 문항 점수 = 5 - 응답값의 합이다', () => {
    // 응답 1,2,3,4를 순환: 14문항 → (1,2,3,4)x3 + (1,2) → 5-v 합 = 4+3+2+1 = 10 → 30 + (4+3) = 37
    const result = scoreOf(seed, answersFor(seed, (i) => (i % 4) + 1));
    expect(result.rawScore).toBe(37);
  });

  it('이분 점수: 원응답 1~2(비찬성)만 1점, 3~4(찬성)는 0점', () => {
    const resultOf = (value: number) => binaryOf(scoreOf(seed, answersFor(seed, () => value))).rawScore;
    expect(resultOf(1)).toBe(14);
    expect(resultOf(2)).toBe(14);
    expect(resultOf(3)).toBe(0);
    expect(resultOf(4)).toBe(0);
  });

  it('경계값: 비찬성 2문항이면 절단점 미만, 3문항이면 절단점 이상', () => {
    const withDisagreeCount = (count: number) =>
      answersFor(seed, (i) => (i < count ? 2 : 3)); // 앞 count개만 "그렇지 않다(2)", 나머지는 "그렇다(3)"

    const two = binaryOf(scoreOf(seed, withDisagreeCount(2)));
    const three = binaryOf(scoreOf(seed, withDisagreeCount(3)));
    const zero = binaryOf(scoreOf(seed, withDisagreeCount(0)));
    expect(zero.rawScore).toBe(0);
    expect(zero.band).toBe('절단점 미만(2점 이하)');
    expect(two.rawScore).toBe(2);
    expect(two.band).toBe('절단점 미만(2점 이하)');
    expect(three.rawScore).toBe(3);
    expect(three.band).toBe('절단점 이상(3점 이상)');
  });

  it('이분 점수가 같아도 차원 점수는 달라질 수 있다: 두 점수를 서로 환산하지 않고 각각 보존한다', () => {
    // 모두 "그렇다(3)" vs 모두 "매우 그렇다(4)": 이분은 둘 다 0, 차원은 28 vs 14
    const three = scoreOf(seed, answersFor(seed, () => 3));
    const four = scoreOf(seed, answersFor(seed, () => 4));
    expect(binaryOf(three).rawScore).toBe(binaryOf(four).rawScore);
    expect(three.rawScore).toBe(28);
    expect(four.rawScore).toBe(14);
  });

  it('차원 점수(주 점수)와 이분 점수(보조 점수)를 동시에 반환하고, 주 점수에는 밴드가 없다', () => {
    const result = scoreOf(seed, answersFor(seed, (i) => (i % 2 === 0 ? 1 : 4)));
    expect(result.rawScore).not.toBeNull();
    expect(result.band).toBeNull();
    expect(result.alternateScores).toHaveLength(1);
    expect(result.alternateScores[0]).toMatchObject({ key: 'binary', name: '이분 채점(원판)' });
  });

  it('"확실히 그렇다" 라벨을 쓰는 문항도 채점 방향은 동일하다(값 4가 최고 쾌감)', () => {
    const definitelyQuestion = seed.questions.find((q) => q.options[3].label === '확실히 그렇다')!;
    expect(definitelyQuestion).toBeDefined();
    expect(definitelyQuestion.options.map((o) => o.value)).toEqual([1, 2, 3, 4]);
  });
});
