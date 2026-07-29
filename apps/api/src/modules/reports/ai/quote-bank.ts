export interface QuoteBankEntry {
  id: string;
  quote: string;
  author: string;
  /** LLM이 리포트 주제와 의미적으로 매칭할 때 참고하는 태그 — 채점/규칙에는 쓰이지 않는다. */
  themes: string[];
}

/**
 * "오늘 당신을 위한 명언" 섹션의 유일한 명언 출처. LLM이 명언 텍스트를 직접 다시 생성하지 않고
 * 여기 있는 항목의 id만 고르게 해서, 화면에 나가는 인용문·저자가 항상 검증된 원문 그대로이도록
 * 보장한다(할루시네이션/오귀속을 구조적으로 차단). 저자와 문구 둘 다 고확신인 것만 포함했고,
 * 출처 논란이 있는 유명 문구(예: "아리스토텔레스: 우리는 반복하는 행동의 결과다" — 실제로는
 * Will Durant의 요약구)는 의도적으로 제외했다. 새 항목을 추가할 때도 같은 기준을 지킬 것.
 */
export const QUOTE_BANK: QuoteBankEntry[] = [
  {
    id: 'shelley-winter-spring',
    quote: '겨울이 오면 봄도 멀지 않으리.',
    author: '퍼시 비시 셸리',
    themes: ['희망', '회복', '인내', '무기력'],
  },
  {
    id: 'camus-invincible-summer',
    quote: '한겨울에도 내 안에는 그 무엇으로도 꺾을 수 없는 여름이 있다는 것을 깨달았다.',
    author: '알베르 카뮈',
    themes: ['회복탄력성', '희망', '시련', '내면의 힘'],
  },
  {
    id: 'frankl-choose-attitude',
    quote: '모든 것을 빼앗겨도 단 하나, 어떤 상황에서도 자신의 태도를 선택하는 자유만은 빼앗을 수 없다.',
    author: '빅터 프랭클',
    themes: ['주체성', '극복', '존엄', '상황 대처'],
  },
  {
    id: 'rogers-accept-then-change',
    quote: '있는 그대로의 나를 받아들일 때, 비로소 변화할 수 있다.',
    author: '칼 로저스',
    themes: ['자기수용', '성장', '완벽주의', '자기비판'],
  },
  {
    id: 'jung-unconscious-fate',
    quote: '무의식을 의식화하지 않으면, 그것이 삶의 방향을 결정하고 우리는 그것을 운명이라 부른다.',
    author: '칼 융',
    themes: ['자기이해', '통찰', '성장'],
  },
  {
    id: 'keller-face-sunshine',
    quote: '얼굴을 태양 쪽으로 향하면 그림자를 볼 수 없다.',
    author: '헬렌 켈러',
    themes: ['긍정', '희망', '관점 전환'],
  },
  {
    id: 'curie-understand-not-fear',
    quote: '인생에서 두려워할 것은 없다. 다만 이해해야 할 뿐이다.',
    author: '마리 퀴리',
    themes: ['불안', '이해', '용기'],
  },
  {
    id: 'roosevelt-no-consent-inferior',
    quote: '그 누구도 당신의 동의 없이는 당신에게 열등감을 느끼게 할 수 없다.',
    author: '엘리너 루스벨트',
    themes: ['자존감', '자기존엄', '타인 시선'],
  },
  {
    id: 'angelou-remember-feeling',
    quote: '사람들은 당신이 한 말과 행동은 잊어도, 당신이 그들에게 느끼게 한 감정만은 잊지 않는다.',
    author: '마야 안젤루',
    themes: ['관계', '연결', '배려'],
  },
  {
    id: 'laotzu-thousand-miles',
    quote: '천 리 길도 한 걸음부터.',
    author: '노자, 《도덕경》',
    themes: ['시작', '꾸준함', '작은 변화', '개선'],
  },
  {
    id: 'shakespeare-doubts-traitors',
    quote: '우리의 의심은 배신자다. 시도해보기를 두려워하다가, 얻을 수 있었던 좋은 것을 놓치게 만든다.',
    author: '윌리엄 셰익스피어, 《자에는 자로》',
    themes: ['용기', '도전', '시도', '망설임'],
  },
  {
    id: 'hemingway-strong-broken-places',
    quote: '세상은 모든 이를 무너뜨리지만, 그 후 많은 이들이 부서진 자리에서 더 강해진다.',
    author: '어니스트 헤밍웨이, 《무기여 잘 있거라》',
    themes: ['회복탄력성', '시련 이후 성장', '상처'],
  },
  {
    id: 'lorde-self-preservation',
    quote: '자신을 돌보는 것은 방종이 아니라 자기 보존이다.',
    author: '오드리 로드',
    themes: ['자기돌봄', '휴식', '자존감', '소진'],
  },
];

export const QUOTE_IDS = QUOTE_BANK.map((q) => q.id) as [string, ...string[]];

export function findQuoteById(id: string): QuoteBankEntry | undefined {
  return QUOTE_BANK.find((q) => q.id === id);
}
