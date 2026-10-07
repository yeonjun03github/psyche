import type { Prisma } from '../../../src/generated/prisma';

/**
 * AES-S (Apathy Evaluation Scale, Self-rated version) 18문항
 * 출처: Marin, Biedrzycki & Firinciogullari (1991). Psychiatry Res, 38(2), 143-162.
 * 한국어 문항은 영문 원문을 바탕으로 한 번역이며 공식 표준화 한국어판이 아니다.
 * 6, 10, 11번만 원점수 그대로, 나머지 15문항은 역채점한다(스케일 1-4 → 5 - 응답값).
 * 총점 18-72, 높을수록 무의욕(apathy) 경향이 강하다. 확립된 절단점이 없어 bands는 비워 둔다.
 *
 * TODO(확인 필요, docs/OPTIONAL_ASSESSMENTS.md 참고): 이용 허락 조건(저작권), 역채점 문항 구성(6, 10, 11번 제외),
 * 응답 라벨, 번역 품질을 원문 논문과 대조해야 한다. 한국어판 규준·절단점은 없는 것으로 취급한다.
 */

const TRUE_4 = [
  { value: 1, label: '전혀 아니다' },
  { value: 2, label: '약간 그렇다' },
  { value: 3, label: '어느 정도 그렇다' },
  { value: 4, label: '매우 그렇다' },
];

const ITEM_TEXTS: [string, string, boolean][] = [
  ['q1', '나는 여러 가지 일에 관심이 있다.', true],
  ['q2', '나는 하루 동안 해야 할 일을 해낸다.', true],
  ['q3', '스스로 어떤 일을 시작하는 것은 나에게 중요하다.', true],
  ['q4', '나는 새로운 경험을 하는 것에 관심이 있다.', true],
  ['q5', '나는 새로운 것을 배우는 데 관심이 있다.', true],
  ['q6', '나는 어떤 일에도 노력을 거의 기울이지 않는다.', false],
  ['q7', '나는 매사에 열정을 가지고 임한다.', true],
  ['q8', '일을 끝까지 해내는 것은 나에게 중요하다.', true],
  ['q9', '나는 내가 관심 있는 일을 하는 데 시간을 보낸다.', true],
  ['q10', '누군가 매일 나에게 무엇을 해야 할지 말해줘야 한다.', false],
  ['q11', '나는 내 문제에 대해 마땅히 그래야 하는 것보다 덜 신경 쓴다.', false],
  ['q12', '나는 친구가 있다.', true],
  ['q13', '친구들과 만나는 것은 나에게 중요하다.', true],
  ['q14', '좋은 일이 생기면 나는 신이 난다.', true],
  ['q15', '나는 내 문제를 정확히 이해하고 있다.', true],
  ['q16', '하루 동안 해야 할 일을 해내는 것은 나에게 중요하다.', true],
  ['q17', '나는 주도적으로 행동한다.', true],
  ['q18', '나는 의욕이 있다.', true],
];

export const aes: Prisma.TestDefinitionCreateInput = {
  code: 'AES',
  name: 'AES-S (무의욕증 평가척도, 자가보고)',
  category: 'OPTIONAL',
  description:
    '지난 4주 동안의 의욕·주도성·관심 수준을 평가하는 18문항 자기보고식 검사입니다. 비공식 번역본이며 절단점이 없는 척도입니다.',
  estimatedMinutes: 3,
  responseScaleMin: 1,
  responseScaleMax: 4,
  license: {
    required: false,
    notice:
      '이 한국어 문항은 영문 원문을 바탕으로 한 비공식 번역이며 표준화된 한국어판이 아닙니다. Marin, Biedrzycki & Firinciogullari (1991). 이용 허락 조건은 확인되지 않았습니다.',
    url: '',
  },
  questions: ITEM_TEXTS.map(([questionId, text, reverseScored], i) => ({
    questionId,
    order: i + 1,
    text,
    type: 'LIKERT4',
    options: TRUE_4,
    reverseScored,
  })),
  scoringConfig: {
    multiplier: 1,
    divisor: 1,
    subscales: [],
    // 자가보고판의 정상/비정상 절단점은 연구·연령대에 따라 차이가 커서 임의로 제시하지 않는다.
    bands: [],
    riskFlags: [],
  },
  meta: {
    concept: '무의욕(apathy) — 목표 지향적 행동, 관심, 주도성, 정서 반응의 저하',
    scoreDirection: '총점이 높을수록 무의욕 경향이 강함(18~72점)',
    scoreLabel: '총점',
    hasCutoff: false,
    translationStatus: 'UNOFFICIAL_TRANSLATION',
    translationNote: '영문 원문 기반 비공식 번역. 한국어판의 신뢰도·타당도는 검증되지 않았다.',
    interpretationCaveats: [
      '확립된 절단점이 없어 점수만으로 정상/비정상을 구분하지 않는다.',
      '무의욕은 우울, 피로, 수면, 신체 질환, 약물 등 다양한 상황과 함께 나타날 수 있어 점수만으로 원인을 추정할 수 없다.',
      '자가보고 점수이며 진단 도구가 아니다.',
    ],
  },
};
