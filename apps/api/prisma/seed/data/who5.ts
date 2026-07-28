import type { Prisma } from '../../../src/generated/prisma';

/**
 * WHO-5 Well-Being Index
 * 출처: WHO Regional Office for Europe (1998). 세계보건기구가 비상업적 목적의
 * 자유로운 사용·복제·번역을 공식적으로 허용한다.
 * 원점수(0-25)에 4를 곱해 0-100 백분율 점수로 환산한다.
 */

const FREQUENCY_6 = [
  { value: 0, label: '전혀 그렇지 않았다' },
  { value: 1, label: '가끔 그랬다' },
  { value: 2, label: '절반보다 적게 그랬다' },
  { value: 3, label: '절반 이상 그랬다' },
  { value: 4, label: '대부분 그랬다' },
  { value: 5, label: '항상 그랬다' },
];

const ITEM_TEXTS: [string, string][] = [
  ['q1', '나는 명랑하고 기분이 좋았다.'],
  ['q2', '나는 차분하고 편안함을 느꼈다.'],
  ['q3', '나는 활기차고 활력이 넘쳤다.'],
  ['q4', '나는 상쾌하고 잘 쉬었다는 느낌으로 잠에서 깼다.'],
  ['q5', '나의 일상은 흥미로운 일들로 가득 차 있었다.'],
];

export const who5: Prisma.TestDefinitionCreateInput = {
  code: 'WHO5',
  name: 'WHO-5 (세계보건기구 웰빙 지수)',
  category: 'ESSENTIAL',
  description: '지난 2주 동안의 주관적인 심리적 웰빙 수준을 평가하는 5문항 자기보고식 검사입니다.',
  estimatedMinutes: 2,
  responseScaleMin: 0,
  responseScaleMax: 5,
  license: {
    required: false,
    notice: 'WHO Regional Office for Europe (1998). 비상업적 목적 사용·번역이 공식적으로 허용됨.',
    url: 'https://www.who-5.org',
  },
  questions: ITEM_TEXTS.map(([questionId, text], i) => ({
    questionId,
    order: i + 1,
    text,
    type: 'LIKERT6',
    options: FREQUENCY_6,
    reverseScored: false,
  })),
  scoringConfig: {
    multiplier: 4,
    divisor: 1,
    subscales: [],
    bands: [
      { min: 0, max: 50, label: '낮음', description: '웰빙 수준이 낮아 추가적인 평가가 권장됩니다.' },
      { min: 51, max: 100, label: '양호', description: '웰빙 수준이 양호합니다.' },
    ],
    riskFlags: [],
  },
};
