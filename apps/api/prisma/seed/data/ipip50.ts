import type { Prisma } from '../../../src/generated/prisma';

/**
 * IPIP Big-Five Factor Markers (50-item version)
 * 출처: Goldberg (1992), International Personality Item Pool(ipip.ori.org).
 * 영문 원문항은 완전한 공개 도메인(Public Domain)이며 별도 승인 없이 자유롭게 사용·수정·재배포할 수 있다.
 * BFI-2(저작권 보유)가 아닌 이 검사를 선택한 이유: 검사 선정 원칙 2번("가능하면 공개적으로
 * 사용 가능한 검사를 우선 사용") 준수.
 *
 * 한국어 문항은 영문 원문을 최대한 충실하게 옮긴 자체 번역이며, 학술적으로 검증된 한국어
 * 역번역본은 아니다. 개인 사용 목적의 정확도에는 문제가 없으나, 외부 공개 시에는 검증된
 * 한국어 번역으로 교체를 권장한다.
 */

const ACCURACY_5 = [
  { value: 1, label: '전혀 아니다' },
  { value: 2, label: '아니다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그렇다' },
  { value: 5, label: '매우 그렇다' },
];

// [questionId, 영문 원문(참고), 한글 번역, 역채점 여부]
const FACTORS: { name: string; prefix: string; items: [string, string, boolean][] }[] = [
  {
    name: 'Extraversion',
    prefix: 'e',
    items: [
      ['Am the life of the party', '나는 모임의 분위기를 이끄는 사람이다.', false],
      ["Don't talk a lot", '나는 말을 많이 하지 않는다.', true],
      ['Feel comfortable around people', '나는 사람들과 함께 있으면 편안하다.', false],
      ['Keep in the background', '나는 나서지 않고 뒤에 머무는 편이다.', true],
      ['Start conversations', '나는 먼저 대화를 시작한다.', false],
      ['Have little to say', '나는 할 말이 별로 없다.', true],
      ['Talk to a lot of different people at parties', '나는 모임에서 다양한 사람들과 이야기를 나눈다.', false],
      ["Don't like to draw attention to myself", '나는 다른 사람의 주목을 받는 것을 좋아하지 않는다.', true],
      ["Don't mind being the center of attention", '나는 주목의 중심이 되는 것을 개의치 않는다.', false],
      ['Am quiet around strangers', '나는 낯선 사람들과 있을 때 조용한 편이다.', true],
    ],
  },
  {
    name: 'Agreeableness',
    prefix: 'a',
    items: [
      ['Feel little concern for others', '나는 다른 사람에게 별로 관심이 없다.', true],
      ['Am interested in people', '나는 사람들에게 관심이 많다.', false],
      ['Insult people', '나는 사람들을 모욕하곤 한다.', true],
      ["Sympathize with others' feelings", '나는 다른 사람의 감정에 공감한다.', false],
      ["Am not interested in other people's problems", '나는 다른 사람의 문제에 관심이 없다.', true],
      ['Have a soft heart', '나는 마음이 여린 편이다.', false],
      ['Am not really interested in others', '나는 다른 사람에게 진심으로 관심을 갖지 않는다.', true],
      ['Take time out for others', '나는 다른 사람을 위해 시간을 낸다.', false],
      ["Feel others' emotions", '나는 다른 사람의 감정을 잘 느낀다.', false],
      ['Make people feel at ease', '나는 사람들을 편안하게 해준다.', false],
    ],
  },
  {
    name: 'Conscientiousness',
    prefix: 'c',
    items: [
      ['Am always prepared', '나는 항상 준비되어 있다.', false],
      ['Leave my belongings around', '나는 물건을 아무 데나 놓아둔다.', true],
      ['Pay attention to details', '나는 세부 사항에 주의를 기울인다.', false],
      ['Make a mess of things', '나는 일을 엉망으로 만들곤 한다.', true],
      ['Get chores done right away', '나는 해야 할 일을 바로 처리한다.', false],
      [
        'Often forget to put things back in their proper place',
        '나는 물건을 제자리에 두는 것을 자주 잊는다.',
        true,
      ],
      ['Like order', '나는 정돈된 것을 좋아한다.', false],
      ['Shirk my duties', '나는 내 의무를 회피하곤 한다.', true],
      ['Follow a schedule', '나는 일정을 잘 지킨다.', false],
      ['Am exacting in my work', '나는 일을 꼼꼼하게 처리한다.', false],
    ],
  },
  {
    name: 'EmotionalStability',
    prefix: 'es',
    items: [
      ['Get stressed out easily', '나는 쉽게 스트레스를 받는다.', true],
      ['Am relaxed most of the time', '나는 대체로 느긋한 편이다.', false],
      ['Worry about things', '나는 여러 일들을 걱정한다.', true],
      ['Am easily disturbed', '나는 쉽게 동요된다.', true],
      ['Get upset easily', '나는 쉽게 화가 난다.', true],
      ['Change my mood a lot', '나는 기분이 자주 바뀐다.', true],
      ['Have frequent mood swings', '나는 감정 기복이 심하다.', true],
      ['Get irritated easily', '나는 쉽게 짜증이 난다.', true],
      ['Seldom feel blue', '나는 우울함을 거의 느끼지 않는다.', false],
      ['Often feel blue', '나는 자주 우울함을 느낀다.', true],
    ],
  },
  {
    name: 'Intellect',
    prefix: 'i',
    items: [
      ['Have a rich vocabulary', '나는 어휘력이 풍부하다.', false],
      ['Have difficulty understanding abstract ideas', '나는 추상적인 개념을 이해하는 데 어려움을 느낀다.', true],
      ['Have a vivid imagination', '나는 상상력이 풍부하다.', false],
      ['Am not interested in abstract ideas', '나는 추상적인 개념에 관심이 없다.', true],
      ['Have excellent ideas', '나는 훌륭한 아이디어를 낸다.', false],
      ['Do not have a good imagination', '나는 상상력이 부족하다.', true],
      ['Am quick to understand things', '나는 사물을 빠르게 이해한다.', false],
      ['Use difficult words', '나는 어려운 단어를 사용한다.', false],
      ['Spend time reflecting on things', '나는 여러 일들에 대해 곰곰이 생각하는 시간을 갖는다.', false],
      ['Am full of ideas', '나는 아이디어가 넘친다.', false],
    ],
  },
];

const questions: Prisma.QuestionCreateInput[] = [];
let order = 0;
for (const factor of FACTORS) {
  for (let i = 0; i < factor.items.length; i++) {
    const [, text, reverseScored] = factor.items[i];
    order += 1;
    questions.push({
      questionId: `${factor.prefix}${i + 1}`,
      order,
      text,
      type: 'LIKERT5',
      options: ACCURACY_5,
      reverseScored,
    });
  }
}

const TRAIT_BANDS: Prisma.ScoreBandCreateInput[] = [
  { min: 10, max: 23, label: '낮음', description: '해당 특성이 낮게 나타납니다.' },
  { min: 24, max: 36, label: '보통', description: '해당 특성이 보통 수준으로 나타납니다.' },
  { min: 37, max: 50, label: '높음', description: '해당 특성이 높게 나타납니다.' },
];

export const ipip50: Prisma.TestDefinitionCreateInput = {
  code: 'IPIP50',
  name: 'IPIP-50 (성격 5요인 검사)',
  category: 'ESSENTIAL',
  description: '개방성·성실성·외향성·친화성·정서안정성 5개 요인으로 성격 특성을 평가하는 50문항 검사입니다.',
  estimatedMinutes: 10,
  responseScaleMin: 1,
  responseScaleMax: 5,
  license: {
    required: false,
    notice: 'Goldberg (1992), International Personality Item Pool. 완전한 공개 도메인(Public Domain).',
    url: 'https://ipip.ori.org',
  },
  questions,
  scoringConfig: {
    multiplier: 1,
    divisor: 1,
    bands: [],
    subscales: FACTORS.map((factor) => ({
      name: factor.name,
      questionIds: factor.items.map((_, i) => `${factor.prefix}${i + 1}`),
      bands: TRAIT_BANDS,
    })),
    riskFlags: [],
  },
};
