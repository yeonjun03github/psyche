import type { Prisma } from '../../../src/generated/prisma';

/**
 * GAD-7 (Generalized Anxiety Disorder 7-item scale)
 * 출처: Spitzer, Kroenke, Williams & Löwe (2006); Pfizer. PHQ-9와 동일하게
 * 출처 표기 시 임상/연구/교육 목적 무료 사용이 허용된다.
 */

const FREQUENCY_4 = [
  { value: 0, label: '전혀 없음' },
  { value: 1, label: '며칠 동안' },
  { value: 2, label: '일주일 중 절반 이상' },
  { value: 3, label: '거의 매일' },
];

const ITEM_TEXTS: [string, string][] = [
  ['q1', '초조하거나 불안하거나 조마조마하게 느낀다'],
  ['q2', '걱정하는 것을 멈추거나 조절할 수가 없다'],
  ['q3', '여러 가지 것들에 대해 걱정을 너무 많이 한다'],
  ['q4', '편안하게 있기가 어렵다'],
  ['q5', '너무 안절부절 못해서 가만히 있기가 힘들다'],
  ['q6', '쉽게 짜증이 나거나 화가 난다'],
  ['q7', '마치 끔찍한 일이 생길 것처럼 두렵게 느껴진다'],
];

export const gad7: Prisma.TestDefinitionCreateInput = {
  code: 'GAD7',
  name: 'GAD-7 (범불안장애 선별검사)',
  category: 'ESSENTIAL',
  description: '지난 2주 동안 불안 증상을 얼마나 자주 경험했는지 평가하는 7문항 자기보고식 검사입니다.',
  estimatedMinutes: 2,
  responseScaleMin: 0,
  responseScaleMax: 3,
  license: {
    required: false,
    notice: 'Pfizer, Spitzer/Kroenke/Williams/Löwe. 출처 표기 시 임상·연구·교육 목적 무료 사용 가능.',
    url: 'https://www.phqscreeners.com',
  },
  questions: ITEM_TEXTS.map(([questionId, text], i) => ({
    questionId,
    order: i + 1,
    text,
    type: 'LIKERT4',
    options: FREQUENCY_4,
    reverseScored: false,
  })),
  scoringConfig: {
    multiplier: 1,
    divisor: 1,
    subscales: [],
    bands: [
      { min: 0, max: 4, label: '정상', description: '불안 증상이 거의 없는 수준입니다.' },
      { min: 5, max: 9, label: '경미', description: '경미한 불안 증상이 있습니다.' },
      { min: 10, max: 14, label: '중등도', description: '중등도의 불안 증상이 있습니다.' },
      { min: 15, max: 21, label: '중증', description: '중증 수준의 불안 증상이 있습니다.' },
    ],
    riskFlags: [],
  },
};
