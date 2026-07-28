import type { Prisma } from '../../../src/generated/prisma';

/**
 * Brief Resilience Scale (BRS)
 * 출처: Smith, Dalen, Wiggins, Tooley, Christopher & Bernard (2008).
 * 출처 표기 시 연구/임상 목적 무료 사용이 허용된다.
 * 2, 4, 6번 문항은 부정적으로 표현되어 있어 역채점하며, 최종 점수는 평균(합 ÷ 6)이다.
 */

const AGREEMENT_5 = [
  { value: 1, label: '전혀 그렇지 않다' },
  { value: 2, label: '그렇지 않다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' },
];

const ITEM_TEXTS: [string, string, boolean][] = [
  ['q1', '나는 힘든 일이 있어도 빨리 회복하는 편이다.', false],
  ['q2', '나는 스트레스가 되는 사건을 겪어내는 데 어려움을 느낀다.', true],
  ['q3', '스트레스가 되는 사건으로부터 회복하는 데 오래 걸리지 않는다.', false],
  ['q4', '나쁜 일이 생기면 다시 회복하기가 힘들다.', true],
  ['q5', '나는 대체로 어려운 시기를 큰 어려움 없이 이겨낸다.', false],
  ['q6', '나는 인생의 좌절을 극복하는 데 오랜 시간이 걸리는 편이다.', true],
];

export const brs: Prisma.TestDefinitionCreateInput = {
  code: 'BRS',
  name: 'BRS (간이 회복탄력성 척도)',
  category: 'ESSENTIAL',
  description: '스트레스나 역경으로부터 얼마나 빨리 회복하는지를 평가하는 6문항 자기보고식 검사입니다.',
  estimatedMinutes: 2,
  responseScaleMin: 1,
  responseScaleMax: 5,
  license: {
    required: false,
    notice: 'Smith et al. (2008). 출처 표기 시 연구·임상 목적 무료 사용 가능.',
    url: '',
  },
  questions: ITEM_TEXTS.map(([questionId, text, reverseScored], i) => ({
    questionId,
    order: i + 1,
    text,
    type: 'LIKERT5',
    options: AGREEMENT_5,
    reverseScored,
  })),
  scoringConfig: {
    multiplier: 1,
    divisor: 6,
    subscales: [],
    bands: [
      { min: 1.0, max: 2.99, label: '낮음', description: '회복탄력성이 낮은 편입니다.' },
      { min: 3.0, max: 4.3, label: '보통', description: '회복탄력성이 보통 수준입니다.' },
      { min: 4.31, max: 5.0, label: '높음', description: '회복탄력성이 높은 편입니다.' },
    ],
    riskFlags: [],
  },
};
