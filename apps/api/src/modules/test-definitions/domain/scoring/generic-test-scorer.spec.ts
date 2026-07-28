import { GenericTestScorer } from './generic-test-scorer';

describe('GenericTestScorer', () => {
  const scorer = new GenericTestScorer();

  it('단순 합산 검사(PHQ-9 유형)의 점수와 밴드를 계산한다', () => {
    const questions = Array.from({ length: 9 }, (_, i) => ({
      questionId: `q${i + 1}`,
      reverseScored: false,
    }));
    const answers = questions.map((q) => ({ questionId: q.questionId, value: 2 }));

    const result = scorer.score(answers, questions, 0, 3, {
      multiplier: 1,
      divisor: 1,
      subscales: [],
      bands: [
        { min: 0, max: 4, label: '최소', description: '' },
        { min: 5, max: 9, label: '경미', description: '' },
        { min: 10, max: 14, label: '중등도', description: '' },
        { min: 15, max: 19, label: '중등도 이상', description: '' },
        { min: 20, max: 27, label: '심각', description: '' },
      ],
    });

    expect(result.rawScore).toBe(18);
    expect(result.band).toBe('중등도 이상');
    expect(result.subscaleScores).toEqual([]);
  });

  it('역채점 문항을 응답 스케일 기준으로 보정한다(PSS-10 유형)', () => {
    const questions = [
      { questionId: 'q1', reverseScored: false },
      { questionId: 'q2', reverseScored: true },
    ];
    // 0-4 스케일에서 역채점: adjusted = 4 - value
    const answers = [
      { questionId: 'q1', value: 3 },
      { questionId: 'q2', value: 1 }, // adjusted -> 3
    ];

    const result = scorer.score(answers, questions, 0, 4, {
      multiplier: 1,
      divisor: 1,
      subscales: [],
      bands: [{ min: 0, max: 40, label: '전체', description: '' }],
    });

    expect(result.rawScore).toBe(6);
  });

  it('평균 계산 검사(BRS 유형)에서 divisor로 나눈다', () => {
    const questions = [
      { questionId: 'q1', reverseScored: false },
      { questionId: 'q2', reverseScored: true },
    ];
    // 1-5 스케일: q1=5, q2 raw=1 -> adjusted = (1+5)-1 = 5
    const answers = [
      { questionId: 'q1', value: 5 },
      { questionId: 'q2', value: 1 },
    ];

    const result = scorer.score(answers, questions, 1, 5, {
      multiplier: 1,
      divisor: 2,
      subscales: [],
      bands: [{ min: 1, max: 5, label: '전체', description: '' }],
    });

    expect(result.rawScore).toBe(5); // (5+5)/2 = 5
  });

  it('WHO-5 유형처럼 multiplier로 백분율 환산한다', () => {
    const questions = Array.from({ length: 5 }, (_, i) => ({
      questionId: `q${i + 1}`,
      reverseScored: false,
    }));
    const answers = questions.map((q) => ({ questionId: q.questionId, value: 3 }));

    const result = scorer.score(answers, questions, 0, 5, {
      multiplier: 4,
      divisor: 1,
      subscales: [],
      bands: [{ min: 0, max: 100, label: '전체', description: '' }],
    });

    expect(result.rawScore).toBe(60); // sum=15, ×4 = 60
  });

  it('하위척도만 있는 검사(Big Five 유형)는 전체 rawScore/band 없이 하위척도별로 계산한다', () => {
    const questions = [
      { questionId: 'e1', reverseScored: false },
      { questionId: 'e2', reverseScored: true },
      { questionId: 'a1', reverseScored: false },
    ];
    const answers = [
      { questionId: 'e1', value: 5 },
      { questionId: 'e2', value: 1 }, // adjusted -> 5 (1-5 스케일)
      { questionId: 'a1', value: 3 },
    ];

    const result = scorer.score(answers, questions, 1, 5, {
      multiplier: 1,
      divisor: 1,
      subscales: [
        {
          name: 'Extraversion',
          questionIds: ['e1', 'e2'],
          bands: [{ min: 2, max: 10, label: '높음', description: '' }],
        },
        {
          name: 'Agreeableness',
          questionIds: ['a1'],
          bands: [{ min: 1, max: 5, label: '보통', description: '' }],
        },
      ],
      bands: [],
    });

    expect(result.rawScore).toBeNull();
    expect(result.band).toBeNull();
    expect(result.subscaleScores).toEqual([
      { name: 'Extraversion', rawScore: 10, band: '높음' },
      { name: 'Agreeableness', rawScore: 3, band: '보통' },
    ]);
  });
});
