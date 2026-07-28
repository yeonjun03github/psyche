import type { Prisma } from '../../../src/generated/prisma';

/**
 * Rosenberg Self-Esteem Scale (RSES)
 * 출처: Rosenberg (1965). 저작권자 승인 없이도 연구/교육 목적 사용이 널리 허용되는 검사다.
 * 2, 5, 6, 8, 9번 문항은 부정적으로 표현되어 있어 역채점한다.
 */

const AGREEMENT_4 = [
  { value: 0, label: '전혀 그렇지 않다' },
  { value: 1, label: '그렇지 않다' },
  { value: 2, label: '그렇다' },
  { value: 3, label: '매우 그렇다' },
];

const ITEM_TEXTS: [string, string, boolean][] = [
  ['q1', '나는 내 자신에 대해 대체로 만족한다.', false],
  ['q2', '때때로 나는 내가 전혀 쓸모없는 사람이라고 생각한다.', true],
  ['q3', '나는 내가 좋은 자질을 많이 가지고 있다고 느낀다.', false],
  ['q4', '나는 대부분의 다른 사람들만큼 일을 잘 할 수 있다.', false],
  ['q5', '나는 자랑할 것이 별로 없다고 느낀다.', true],
  ['q6', '나는 때때로 내가 쓸모없다고 느낀다.', true],
  ['q7', '나는 내가 적어도 다른 사람들만큼 가치 있는 사람이라고 느낀다.', false],
  ['q8', '나는 나 자신을 좀 더 존중할 수 있었으면 좋겠다.', true],
  ['q9', '전반적으로, 나는 내가 실패자라고 생각하는 경향이 있다.', true],
  ['q10', '나는 나 자신에 대해 긍정적인 태도를 가지고 있다.', false],
];

export const rses: Prisma.TestDefinitionCreateInput = {
  code: 'RSES',
  name: '로젠버그 자아존중감 척도 (RSES)',
  category: 'ESSENTIAL',
  description: '자기 자신에 대한 전반적인 가치와 태도를 평가하는 10문항 자기보고식 검사입니다.',
  estimatedMinutes: 3,
  responseScaleMin: 0,
  responseScaleMax: 3,
  license: {
    required: false,
    notice: 'Rosenberg (1965). 연구·교육 목적 사용에 별도 승인이 필요하지 않다.',
    url: '',
  },
  questions: ITEM_TEXTS.map(([questionId, text, reverseScored], i) => ({
    questionId,
    order: i + 1,
    text,
    type: 'LIKERT4',
    options: AGREEMENT_4,
    reverseScored,
  })),
  scoringConfig: {
    multiplier: 1,
    divisor: 1,
    subscales: [],
    bands: [
      { min: 0, max: 15, label: '낮음', description: '자아존중감이 낮은 편입니다.' },
      { min: 16, max: 25, label: '보통', description: '자아존중감이 보통 수준입니다.' },
      { min: 26, max: 30, label: '높음', description: '자아존중감이 높은 편입니다.' },
    ],
    riskFlags: [],
  },
};
