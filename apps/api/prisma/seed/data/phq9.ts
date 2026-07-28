import type { Prisma } from '../../../src/generated/prisma';

/**
 * PHQ-9 (Patient Health Questionnaire-9)
 * 출처: Kroenke, Spitzer & Williams (2001); Pfizer가 저작권을 보유하나 임상/연구/교육 목적의
 * 사용·복제·배포를 무료로 허용한다(별도 승인 불필요).
 * 9번 문항은 자살/자해 사고를 다루므로 안전장치(riskFlags)의 근거가 된다.
 */

const FREQUENCY_4 = [
  { value: 0, label: '전혀 없음' },
  { value: 1, label: '며칠 동안' },
  { value: 2, label: '일주일 중 절반 이상' },
  { value: 3, label: '거의 매일' },
];

const ITEM_TEXTS: [string, string][] = [
  ['q1', '일 또는 여가 활동을 하는 데 흥미나 즐거움을 느끼지 못함'],
  ['q2', '기분이 가라앉거나, 우울하거나, 희망이 없다고 느낌'],
  ['q3', '잠이 들거나 계속 잠을 자는 것이 어려움, 또는 잠을 너무 많이 잠'],
  ['q4', '피곤하다고 느끼거나 기운이 거의 없음'],
  ['q5', '입맛이 없거나 과식을 함'],
  ['q6', '자신을 부정적으로 봄 — 혹은 자신이 실패자라고 느끼거나 자신 또는 가족을 실망시켰다고 느낌'],
  ['q7', '신문을 읽거나 텔레비전을 보는 것과 같은 일에 집중하는 것이 어려움'],
  [
    'q8',
    '다른 사람들이 눈치챌 정도로 너무 느리게 움직이거나 말을 함, 또는 반대로 평상시보다 많이 움직이고 안절부절 못함',
  ],
  ['q9', '자신이 죽는 것이 더 낫다고 생각하거나 어떤 식으로든 자신을 해칠 것이라고 생각함'],
];

export const phq9: Prisma.TestDefinitionCreateInput = {
  code: 'PHQ9',
  name: 'PHQ-9 (우울증 선별검사)',
  category: 'ESSENTIAL',
  description: '지난 2주 동안 우울 증상을 얼마나 자주 경험했는지 평가하는 9문항 자기보고식 검사입니다.',
  estimatedMinutes: 3,
  responseScaleMin: 0,
  responseScaleMax: 3,
  license: {
    required: false,
    notice: 'Pfizer, Kroenke/Spitzer/Williams. 출처 표기 시 임상·연구·교육 목적 무료 사용 가능.',
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
      { min: 0, max: 4, label: '정상', description: '우울 증상이 거의 없는 수준입니다.' },
      { min: 5, max: 9, label: '경미', description: '경미한 우울 증상이 있습니다.' },
      { min: 10, max: 14, label: '중등도', description: '중등도의 우울 증상이 있습니다.' },
      { min: 15, max: 19, label: '중등도-중증', description: '중등도에서 중증 사이의 우울 증상이 있습니다.' },
      { min: 20, max: 27, label: '중증', description: '중증 수준의 우울 증상이 있습니다.' },
    ],
    riskFlags: [
      {
        questionId: 'q9',
        triggerValue: 1,
        message:
          '자신을 해치고 싶다는 생각을 언급하셨습니다. 혼자 견디지 않으셔도 됩니다. 지금 바로 도움을 받을 수 있는 곳이 있습니다.',
      },
    ],
  },
};
