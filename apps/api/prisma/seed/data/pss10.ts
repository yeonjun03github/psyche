import type { Prisma } from '../../../src/generated/prisma';

/**
 * PSS-10 (Perceived Stress Scale, 10-item version)
 * 출처: Cohen, Kamarck & Mermelstein (1983). 저자가 저작권을 보유하나
 * 출처를 표기하면 연구/임상 목적으로 무료 사용이 널리 허용된다.
 * 4, 5, 7, 8번 문항은 긍정적으로 표현되어 있어 역채점한다.
 */

const FREQUENCY_5 = [
  { value: 0, label: '전혀 없었다' },
  { value: 1, label: '거의 없었다' },
  { value: 2, label: '때때로 있었다' },
  { value: 3, label: '자주 있었다' },
  { value: 4, label: '매우 자주 있었다' },
];

const ITEM_TEXTS: [string, string, boolean][] = [
  ['q1', '예상치 못한 일 때문에 속상했던 적이 얼마나 있었습니까?', false],
  ['q2', '인생에서 중요한 일들을 조절할 수 없다고 느낀 적이 얼마나 있었습니까?', false],
  ['q3', '신경이 예민해지고 스트레스를 받았다고 느낀 적이 얼마나 있었습니까?', false],
  ['q4', '개인적인 문제들을 다루는 능력에 대해 자신감을 느낀 적이 얼마나 있었습니까?', true],
  ['q5', '일이 자신이 원하는 대로 진행되고 있다고 느낀 적이 얼마나 있었습니까?', true],
  ['q6', '해야 할 모든 일을 감당할 수 없다고 느낀 적이 얼마나 있었습니까?', false],
  ['q7', '일상의 짜증을 잘 조절할 수 있었던 적이 얼마나 있었습니까?', true],
  ['q8', '최상의 상태에 있다고 느낀 적이 얼마나 있었습니까?', true],
  ['q9', '자신의 통제 밖에 있는 일 때문에 화가 난 적이 얼마나 있었습니까?', false],
  ['q10', '어려운 일들이 너무 쌓여서 극복할 수 없다고 느낀 적이 얼마나 있었습니까?', false],
];

export const pss10: Prisma.TestDefinitionCreateInput = {
  code: 'PSS10',
  name: 'PSS-10 (지각된 스트레스 척도)',
  category: 'ESSENTIAL',
  description: '지난 한 달 동안 삶을 얼마나 예측 불가능하고 통제 불가능하며 과중하다고 느꼈는지 평가하는 검사입니다.',
  estimatedMinutes: 3,
  responseScaleMin: 0,
  responseScaleMax: 4,
  license: {
    required: false,
    notice: 'Cohen, Kamarck & Mermelstein (1983). 출처 표기 시 연구·임상 목적 무료 사용 가능.',
    url: 'https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html',
  },
  questions: ITEM_TEXTS.map(([questionId, text, reverseScored], i) => ({
    questionId,
    order: i + 1,
    text,
    type: 'LIKERT5',
    options: FREQUENCY_5,
    reverseScored,
  })),
  scoringConfig: {
    multiplier: 1,
    divisor: 1,
    subscales: [],
    bands: [
      { min: 0, max: 13, label: '낮음', description: '지각된 스트레스 수준이 낮습니다.' },
      { min: 14, max: 26, label: '보통', description: '지각된 스트레스 수준이 보통입니다.' },
      { min: 27, max: 40, label: '높음', description: '지각된 스트레스 수준이 높습니다.' },
    ],
    riskFlags: [],
  },
};
