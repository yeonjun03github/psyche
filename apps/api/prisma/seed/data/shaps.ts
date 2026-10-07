import type { Prisma } from '../../../src/generated/prisma';

/**
 * SHAPS (Snaith-Hamilton Pleasure Scale) 14문항
 * 출처: Snaith et al. (1995). Br J Psychiatry, 167(1), 99-103. 차원 채점: Franken et al. (2007). J Affect Disord, 99, 83-89.
 * 한국어 문항은 영문 원문을 바탕으로 한 번역이며 공식 표준화 한국어판이 아니다.
 *
 * 채점 방향 — 모든 문항은 "즐거움을 느낀다"는 서술이므로 찬성(그렇다/매우 그렇다)일수록 쾌감이 높다.
 * 그래서 14문항 전부 reverseScored=true로 두어 "5 - 응답값"(1-4 스케일)이 되게 하고, 이를 기준으로 한다.
 * - 주 점수(rawScore, 차원 채점): 보정된 점수의 합, 14-56. 높을수록 쾌감 반응이 낮은(무쾌감 경향이 강한) 쪽.
 * - 보조 점수(이분 채점, 원판): 보정된 점수가 3 이상(= 원응답 1-2, 비찬성)이면 1점, 합 0-14. 3점 이상이면 절단점 이상.
 * 두 점수는 서로 변환하지 않고 각각 저장한다.
 *
 * TODO(확인 필요, docs/OPTIONAL_ASSESSMENTS.md 참고):
 * - 이분 절단점(3점 이상)은 원판(영어) 기준이다. 이 한국어 번역본에서 검증되지 않았으므로 진단 기준으로 쓰지 않는다.
 * - 차원 채점(Franken et al., 2007)의 방향·범위(14-56)를 원문 논문과 대조한다.
 * - 번역본의 이용 허락(저작권/라이선스) 조건과 번역 품질(역번역 등)을 확인한다.
 */

const AGREE_4 = [
  { value: 1, label: '전혀 그렇지 않다' },
  { value: 2, label: '그렇지 않다' },
  { value: 3, label: '그렇다' },
  { value: 4, label: '매우 그렇다' },
];

// 원척도에서 일부 문항은 가장 긍정적인 응답 라벨이 "definitely agree"다. 채점 방향은 동일하다.
const AGREE_4_DEFINITELY = [
  { value: 1, label: '전혀 그렇지 않다' },
  { value: 2, label: '그렇지 않다' },
  { value: 3, label: '그렇다' },
  { value: 4, label: '확실히 그렇다' },
];

const ITEM_TEXTS: [string, string, boolean][] = [
  ['q1', '나는 내가 가장 좋아하는 TV나 라디오 프로그램을 즐길 것이다.', false],
  ['q2', '나는 가족이나 친한 친구들과 함께 있는 것을 즐길 것이다.', true],
  ['q3', '나는 취미와 여가 활동에서 즐거움을 느낄 것이다.', false],
  ['q4', '나는 내가 가장 좋아하는 음식을 즐길 수 있을 것이다.', true],
  ['q5', '나는 따뜻한 목욕이나 상쾌한 샤워를 즐길 것이다.', true],
  ['q6', '나는 꽃향기, 상쾌한 바닷바람, 또는 갓 구운 빵 냄새에서 즐거움을 느낄 것이다.', false],
  ['q7', '나는 다른 사람들의 웃는 얼굴을 보는 것을 즐길 것이다.', true],
  ['q8', '나는 외모에 신경을 썼을 때 단정해 보이는 것을 즐길 것이다.', false],
  ['q9', '나는 책, 잡지, 신문을 읽는 것을 즐길 것이다.', true],
  ['q10', '나는 차 한 잔, 커피 한 잔, 또는 내가 가장 좋아하는 음료를 즐길 것이다.', false],
  ['q11', '나는 맑고 화창한 날씨나 친구의 전화 같은 작은 일들에서 즐거움을 느낄 것이다.', false],
  ['q12', '나는 아름다운 풍경이나 전망을 즐길 수 있을 것이다.', true],
  ['q13', '나는 다른 사람을 도울 때 즐거움을 느낄 것이다.', false],
  ['q14', '나는 다른 사람에게 칭찬을 받을 때 즐거움을 느낄 것이다.', true],
];

export const shaps: Prisma.TestDefinitionCreateInput = {
  code: 'SHAPS',
  name: 'SHAPS (쾌감 경험 척도)',
  category: 'OPTIONAL',
  description:
    '최근 며칠 동안 일상의 즐거운 경험에서 쾌감을 느낄 수 있는 정도(무쾌감 경향)를 평가하는 14문항 자기보고식 검사입니다. 비공식 번역본입니다.',
  estimatedMinutes: 3,
  responseScaleMin: 1,
  responseScaleMax: 4,
  license: {
    required: false,
    notice:
      '이 한국어 문항은 영문 원문을 바탕으로 한 비공식 번역이며 표준화된 한국어판이 아닙니다. Snaith et al. (1995); Franken et al. (2007). 이용 허락 조건은 확인되지 않았습니다.',
    url: '',
  },
  questions: ITEM_TEXTS.map(([questionId, text, usesDefinitely], i) => ({
    questionId,
    order: i + 1,
    text,
    type: 'LIKERT4',
    options: usesDefinitely ? AGREE_4_DEFINITELY : AGREE_4,
    // 방향 보정 목적의 역채점(위 주석 참고) — 문항 문구가 부정형이라는 뜻이 아니다.
    reverseScored: true,
  })),
  scoringConfig: {
    multiplier: 1,
    divisor: 1,
    subscales: [],
    // 주 점수(차원 채점)에는 확립된 절단점이 없다.
    bands: [],
    alternateScores: [
      {
        key: 'binary',
        name: '이분 채점(원판)',
        kind: 'BINARY_SUM',
        threshold: 3,
        min: 0,
        max: 14,
        bands: [
          { min: 0, max: 2, label: '절단점 미만(2점 이하)', description: '원판(영어) 기준 절단점(3점) 미만입니다. 한국어 번역본에서는 검증되지 않았습니다.' },
          { min: 3, max: 14, label: '절단점 이상(3점 이상)', description: '원판(영어) 기준 절단점(3점) 이상입니다. 한국어 번역본에서는 검증되지 않았으며 진단 기준이 아닙니다.' },
        ],
      },
    ],
    riskFlags: [],
  },
  meta: {
    concept: '무쾌감(anhedonia) — 일상의 즐거운 자극에서 쾌감을 경험하는 능력의 저하',
    scoreDirection:
      '주 점수(차원 채점, 14~56점)는 높을수록 쾌감 반응이 낮음. 보조 점수(이분 채점, 0~14점)는 높을수록 쾌감을 느끼지 못한다고 답한 문항이 많음',
    scoreLabel: '차원 채점 총점',
    hasCutoff: true,
    translationStatus: 'UNOFFICIAL_TRANSLATION',
    translationNote:
      '영문 원문 기반 비공식 번역. 한국어판의 신뢰도·타당도는 검증되지 않았다. 이분 채점의 절단점(3점)은 원판 영어 기준이며 한국어 번역본에서 검증되지 않았다.',
    interpretationCaveats: [
      '절단점은 이분 채점(원판)에만 있으며 차원 채점에는 없다. 두 점수를 하나로 합치거나 서로 변환하지 않는다.',
      '무쾌감 경향은 우울증과 같은 의미가 아니며, 이 결과를 우울증 진단으로 해석할 수 없다.',
      '문항은 "즐길 것이다"라는 가정형 서술이라 실제 최근 경험과 다를 수 있다.',
    ],
  },
};
