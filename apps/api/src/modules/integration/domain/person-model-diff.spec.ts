import { diffPersonModels } from './person-model-diff';

describe('diffPersonModels', () => {
  it('경과일과 검사별 점수/밴드 델타를 계산한다', () => {
    const previous = {
      generatedAt: new Date('2026-01-01'),
      testResults: [{ testCode: 'PHQ9', normalizedScore: 70, band: '중등도-중증', subscaleScores: [] }],
    };
    const current = {
      generatedAt: new Date('2026-01-11'),
      testResults: [{ testCode: 'PHQ9', normalizedScore: 40, band: '경도', subscaleScores: [] }],
    };

    const result = diffPersonModels(previous, current);

    expect(result.daysSincePrevious).toBe(10);
    expect(result.testDiffs).toEqual([
      {
        testCode: 'PHQ9',
        previousNormalizedScore: 70,
        currentNormalizedScore: 40,
        delta: -30,
        previousBand: '중등도-중증',
        currentBand: '경도',
        subscaleDiffs: [],
      },
    ]);
  });

  it('이전 결과에 없던 검사는 previous 값이 null이고 delta도 null이다', () => {
    const previous = { generatedAt: new Date('2026-01-01'), testResults: [] };
    const current = {
      generatedAt: new Date('2026-01-11'),
      testResults: [{ testCode: 'GAD7', normalizedScore: 50, band: '중등도', subscaleScores: [] }],
    };

    const result = diffPersonModels(previous, current);
    expect(result.testDiffs[0].previousNormalizedScore).toBeNull();
    expect(result.testDiffs[0].delta).toBeNull();
  });

  it('양쪽에 모두 존재하는 하위척도만 diff하고, 개선/악화 같은 방향 판정 필드는 절대 포함하지 않는다', () => {
    const previous = {
      generatedAt: new Date('2026-01-01'),
      testResults: [
        {
          testCode: 'IPIP50',
          normalizedScore: null,
          band: null,
          subscaleScores: [{ name: 'Extraversion', normalizedScore: 40 }],
        },
      ],
    };
    const current = {
      generatedAt: new Date('2026-04-01'),
      testResults: [
        {
          testCode: 'IPIP50',
          normalizedScore: null,
          band: null,
          subscaleScores: [
            { name: 'Extraversion', normalizedScore: 55 },
            { name: 'Neuroticism', normalizedScore: 30 }, // previous에 없던 신규 하위척도
          ],
        },
      ],
    };

    const result = diffPersonModels(previous, current);
    expect(result.testDiffs[0].subscaleDiffs).toEqual([
      { name: 'Extraversion', previousNormalizedScore: 40, currentNormalizedScore: 55, delta: 15 },
    ]);

    const json = JSON.stringify(result);
    expect(json).not.toMatch(/improved|worsened|direction/i);
  });
});
