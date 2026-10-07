import type { Prisma } from '../../../src/generated/prisma';

/**
 * ALS-18 (Affective Lability Scale - Short Form, 한국판 정서적 불안정성 척도 단축판)
 * 원척도: Harvey, Greenberg & Serper (1989) / 단축판: Oliver & Simons (2004)
 * 한국어 번역·타당화: 황성훈 (2015). 한국심리학회지: 임상, 34(3), 625-648. 부록 1.
 * 하위척도: 불안/우울(AD) · 우울/들뜸(DE) · 분노(ANGER).
 * 채점은 문항 합산값을 문항 수로 나눈 평균(1-4점)이다 — 전체 평균은 18문항, 하위척도 평균은 각 하위척도의
 * 문항 수(5/8/5)로 나눈다. 모든 문항은 역채점하지 않는다.
 * 확립된 절단점이 없어 bands는 비워 둔다.
 *
 * TODO(확인 필요, docs/OPTIONAL_ASSESSMENTS.md 참고):
 * - 문항 문구가 황성훈(2015) 부록 1 원문과 글자 단위로 일치하는지 대조한다(현재는 제공받은 JSX 파일을 그대로 옮김).
 * - 한국어판의 사용 허락 조건(저작권)을 확인한다.
 * - "번역·타당화 논문이 있다"는 사실은 출처 기재일 뿐이며, 이 앱에서 규준·절단점을 쓸 수 있다는 뜻이 아니다.
 */

const APPLY_4 = [
  { value: 1, label: '전혀 해당되지 않는다' },
  { value: 2, label: '해당되지 않는 편이다' },
  { value: 3, label: '해당되는 편이다' },
  { value: 4, label: '매우 해당된다' },
];

export const ALS18_SUBSCALE_NAMES = {
  AD: '불안/우울(AD)',
  DE: '우울/들뜸(DE)',
  ANGER: '분노(ANGER)',
} as const;

const ITEM_TEXTS: [string, string][] = [
  ['q1', '때로 나는 여느 다른 사람들처럼 편히 이완되었다고 느낀다. 그런데 몇 분이 안 되어서 신경이 너무 과민해져서 현기증이 나고 어질어질해 진다.'],
  ['q2', '나는 기운과 에너지가 거의 없다가 곧 이어서 대부분의 사람들과 거의 동일한 수준의 기운과 에너지가 생기는 때가 있다.'],
  ['q3', '나는 어떤 순간에 괜찮은 기분을 느낄 수 있다. 그런데 그 다음 순간에는 긴장되고 초조하며 신경이 과민해진다.'],
  ['q4', '나는 내 성질을 매우 잘 조절할 수 있는 상태에서 전혀 조절할 수 없는 상태로 자주 전환된다.'],
  ['q5', '많은 경우 나는 신경이 과민하고 긴장이 된다. 그러다가 갑자기 매우 슬프고 울적해 한다.'],
  ['q6', '가끔 나는 어떤 것 때문에 극도로 불안한 상태였다가 그것 때문에 매우 울적해 하는 상태로 바뀐다.'],
  ['q7', '나는 완벽하게 차분한 상태와 긴장되고 과민한 상태를 왔다갔다 한다.'],
  ['q8', '나는 한 순간 완벽하게 차분하다가 그 다음 순간에는 아주 작은 일에도 격하게 화를 내는 때가 있다.'],
  ['q9', '나는 괜찮은 기분이 되려고 하지만, 곧이어 너무 화가 나서 뭔가를 칠 것만 같은 경우가 자주 있다.'],
  ['q10', '나는 분명하게 생각하고 집중을 잘 할 수 있는 때가 있다. 그런데 그 다음 순간에는 집중해서 분명하게 생각하기가 매우 어려운 경우가 가끔 있다.'],
  ['q11', '나는 매우 화가 나서 고함을 거의 멈출 수 없는 때가 있고 얼마 지나지 않아 내가 고함을 지른다는 것을 전혀 생각할 수도 없는 때가 있다.'],
  ['q12', '나는 극도로 에너지가 넘치는 상태와 에너지가 거의 없어서 내가 가고자 하는 곳에 가는 것도 큰 노력이 드는 상태를 왔다 갔다 한다.'],
  ['q13', '내 자신에 대해 매우 경이롭게 느끼나 곧 이어서 내가 그저 여느 다른 사람과 거의 같을 따름이라고 느끼곤 하는 경우가 있다.'],
  ['q14', '나는 너무 화가 나서 심장이 요동치고 부들부들 떨다가 얼마 지나지 않아서 꽤 편하게 이완되는 경우가 있다.'],
  ['q15', '나는 생산성이 매우 떨어지는 상태와 여느 다른 사람수준으로 생산적인 상태를 오고 간다.'],
  ['q16', '한순간 나는 기운과 에너지가 넘치다가 그 다음순간에는 일을 하기가 힘들 정도로 기운과 에너지가 없는 것 같은 경우가 가끔 있다.'],
  ['q17', '나는 평소에 비해, 그리고 대부분의 사람들에 비해 더 많은 기운과 에너지를 느끼다가 곧 이어서 여느 다른 사람들 수준의 기운과 에너지를 느끼는 때가 있다.'],
  ['q18', '가끔 나는 모든 것을 매우 느린 속도로 하고 있다고 느끼다가, 곧 이어서 여느 다른 사람만큼의 속도로 하고 있음을 느낀다.'],
];

const toQuestionIds = (ids: number[]): string[] => ids.map((n) => `q${n}`);
const AD_ITEMS = toQuestionIds([1, 3, 5, 6, 7]);
const DE_ITEMS = toQuestionIds([2, 10, 12, 13, 15, 16, 17, 18]);
const ANGER_ITEMS = toQuestionIds([4, 8, 9, 11, 14]);

export const als18: Prisma.TestDefinitionCreateInput = {
  code: 'ALS18',
  name: 'ALS-18 (정서적 불안정성 척도 단축판)',
  category: 'OPTIONAL',
  description:
    '평소 기분과 에너지가 얼마나 급격하게 오가는지(정서적 불안정성)를 평가하는 18문항 자기보고식 검사입니다. 전체 평균과 3개 하위척도 평균을 제공하며 절단점은 없습니다.',
  estimatedMinutes: 4,
  responseScaleMin: 1,
  responseScaleMax: 4,
  license: {
    required: false,
    notice:
      '한국어 번역·타당화: 황성훈 (2015). 한국심리학회지: 임상, 34(3), 625-648. 원척도: Harvey, Greenberg & Serper (1989); Oliver & Simons (2004). 이용 허락 조건은 확인되지 않았습니다.',
    url: '',
  },
  questions: ITEM_TEXTS.map(([questionId, text], i) => ({
    questionId,
    order: i + 1,
    text,
    type: 'LIKERT4',
    options: APPLY_4,
    reverseScored: false,
  })),
  scoringConfig: {
    multiplier: 1,
    // 전체 평균: 18문항 합 ÷ 18
    divisor: 18,
    reportOverallWithSubscales: true,
    bands: [],
    subscales: [
      { name: ALS18_SUBSCALE_NAMES.AD, questionIds: AD_ITEMS, divisor: AD_ITEMS.length, bands: [] },
      { name: ALS18_SUBSCALE_NAMES.DE, questionIds: DE_ITEMS, divisor: DE_ITEMS.length, bands: [] },
      { name: ALS18_SUBSCALE_NAMES.ANGER, questionIds: ANGER_ITEMS, divisor: ANGER_ITEMS.length, bands: [] },
    ],
    riskFlags: [],
  },
  meta: {
    concept: '정서적 불안정성(affective lability) — 기분이 짧은 시간 안에 급격하고 예측하기 어렵게 오가는 경향',
    scoreDirection: '평균이 높을수록 정서적 불안정성이 강함(전체·하위척도 모두 1~4점 평균)',
    scoreLabel: '전체 평균',
    hasCutoff: false,
    translationStatus: 'PUBLISHED_KOREAN_VERSION',
    translationNote:
      '황성훈(2015)이 번역·타당화한 한국판. 이 앱에 옮겨진 문항 문구는 논문 부록 원문과의 대조가 필요하다.',
    interpretationCaveats: [
      '확립된 절단점이 없어 점수만으로 정상/비정상을 구분하지 않는다.',
      '점수가 높아도 특정 정신질환이나 기분장애를 의미하지 않으며 진단에 쓸 수 없다.',
      '하위척도(불안/우울, 우울/들뜸, 분노)는 기분 전환의 방향을 나눈 것으로, 서로 다른 점수를 하나의 전체 점수로 대체하지 않는다.',
    ],
  },
};
