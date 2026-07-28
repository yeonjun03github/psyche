import { buildPersonModelTestResult, isSameSessionSet } from './person-model.mapper';

describe('buildPersonModelTestResult', () => {
  it('단일 척도 검사(PHQ-9 유형)는 rawScore/band/normalizedScore를 채운다', () => {
    const session = {
      testCode: 'PHQ9',
      testDefinitionVersion: 1,
      rawScore: 14,
      band: '중등도',
      subscaleScores: [],
      completedAt: new Date('2026-01-01'),
    };
    const definition = {
      questions: Array.from({ length: 9 }, (_, i) => ({ questionId: `q${i + 1}` })),
      responseScaleMin: 0,
      responseScaleMax: 3,
      scoringConfig: { multiplier: 1, divisor: 1, subscales: [] },
    };

    const result = buildPersonModelTestResult(session, definition);

    expect(result.rawScore).toBe(14);
    expect(result.band).toBe('중등도');
    expect(result.normalizedScore).toBe(52); // 14/27 -> 52%
    expect(result.subscaleScores).toEqual([]);
  });

  it('하위척도만 있는 검사(Big Five 유형)는 하위척도별로 정규화한다', () => {
    const session = {
      testCode: 'IPIP50',
      testDefinitionVersion: 1,
      rawScore: null,
      band: null,
      subscaleScores: [{ name: 'Extraversion', rawScore: 30, band: '보통' }],
      completedAt: new Date('2026-01-01'),
    };
    const definition = {
      questions: Array.from({ length: 50 }, (_, i) => ({ questionId: `q${i + 1}` })),
      responseScaleMin: 1,
      responseScaleMax: 5,
      scoringConfig: {
        multiplier: 1,
        divisor: 1,
        subscales: [{ name: 'Extraversion', questionIds: Array.from({ length: 10 }, (_, i) => `e${i + 1}`) }],
      },
    };

    const result = buildPersonModelTestResult(session, definition);

    expect(result.rawScore).toBeNull();
    expect(result.band).toBeNull();
    expect(result.subscaleScores).toEqual([
      { name: 'Extraversion', rawScore: 30, band: '보통', normalizedScore: 50 }, // (30-10)/(50-10)=50%
    ]);
  });
});

describe('isSameSessionSet', () => {
  it('순서가 달라도 같은 집합이면 true를 반환한다', () => {
    expect(isSameSessionSet(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(true);
  });

  it('구성 요소가 다르면 false를 반환한다', () => {
    expect(isSameSessionSet(['a', 'b'], ['a', 'c'])).toBe(false);
    expect(isSameSessionSet(['a'], ['a', 'b'])).toBe(false);
  });
});
