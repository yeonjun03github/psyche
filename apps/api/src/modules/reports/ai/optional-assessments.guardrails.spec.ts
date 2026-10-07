import { aes } from '../../../../prisma/seed/data/aes';
import { als18 } from '../../../../prisma/seed/data/als18';
import { shaps } from '../../../../prisma/seed/data/shaps';
import { GenericTestScorer, type ScoringConfigInput } from '../../test-definitions/domain/scoring/generic-test-scorer';
import { buildPersonModelTestResult, type TestDefinitionInput } from '../../integration/domain/person-model.mapper';
import { buildTestScoreView, type ScoreViewDefinitionInput } from '../../integration/domain/test-score-view';
import { buildChatSystemPrompt } from './chat-prompt-builder';
import { buildReportPrompt } from './prompt-builder';

/**
 * LLM의 실제 출력은 테스트할 수 없으므로, "모델이 해서는 안 되는 서술"을 막는 지시문이 프롬프트에 빠지지
 * 않았는지와, 모델이 오해할 수 있는 입력(임의 구간 라벨 등)이 만들어지지 않는지를 고정한다.
 * 규칙 문구가 지워지거나 약해지면 이 테스트가 실패한다.
 */

interface SeedLike extends TestDefinitionInput, ScoreViewDefinitionInput {
  questions: { questionId: string; reverseScored: boolean }[];
  scoringConfig: ScoringConfigInput & ScoreViewDefinitionInput['scoringConfig'];
}

const scorer = new GenericTestScorer();

function viewOf(definition: unknown, code: string, valueOf: (i: number) => number) {
  const seed = definition as SeedLike;
  const answers = seed.questions.map((q, i) => ({ questionId: q.questionId, value: valueOf(i) }));
  const scored = scorer.score(answers, seed.questions, seed.responseScaleMin, seed.responseScaleMax, seed.scoringConfig);
  const result = buildPersonModelTestResult(
    {
      testCode: code,
      testDefinitionVersion: 1,
      rawScore: scored.rawScore,
      band: scored.band,
      subscaleScores: scored.subscaleScores,
      alternateScores: scored.alternateScores,
      completedAt: new Date('2026-10-01T00:00:00Z'),
    },
    seed,
  );
  return buildTestScoreView(result, seed);
}

// AES 51점(모두 2) / ALS 평균 2.39 / SHAPS 차원 31·이분 3(절단점 이상)
const AES_VIEW = viewOf(aes, 'AES', () => 2);
const ALS_VIEW = viewOf(als18, 'ALS18', (i) => (i % 4) + 1);
const SHAPS_VIEW = viewOf(shaps, 'SHAPS', (i) => (i < 3 ? 2 : 3));

/** 테스트 이름 / 기대하는 프롬프트 한 줄 조각들 — 요청된 12개 필드를 검사별로 확인한다. */
describe('검사 메타데이터 → AI 프롬프트 전달 (필드별)', () => {
  const { userPrompt } = buildReportPrompt({ testResults: [AES_VIEW, ALS_VIEW, SHAPS_VIEW] });
  const block = (code: string) => {
    const marker = userPrompt.indexOf(`(${code})\n`);
    const start = userPrompt.lastIndexOf('\n- ', marker) + 1;
    const next = userPrompt.indexOf('\n- ', marker);
    const nextSection = userPrompt.indexOf('\n\n', marker);
    const end = [next, nextSection].filter((n) => n > 0).sort((a, b) => a - b)[0];
    return userPrompt.slice(start, end);
  };

  it.each([
    [
      'AES',
      {
        testName: 'AES-S (무의욕증 평가척도, 자가보고) (AES)',
        concept: '측정 개념: 무의욕(apathy)',
        rawScoreAndRange: '원점수 51점 (범위 18–72)',
        normalizedScore: '0-100 환산(상대 위치, 원점수 아님): 61/100',
        band: '해석 구간: 없음(확립된 절단점 없음)',
        scoreDirection: '점수 방향: 총점이 높을수록 무의욕 경향이 강함(18~72점)',
        cutoffAvailable: '절단점: 없음',
        translationStatus: '번역·한국어판 상태: 비공식 번역(한국어판 신뢰도·타당도 미검증)',
        cautions: '해석 시 주의사항: 확립된 절단점이 없어',
      },
    ],
    [
      'ALS18',
      {
        testName: 'ALS-18 (정서적 불안정성 척도 단축판)',
        concept: '측정 개념: 정서적 불안정성(affective lability)',
        rawScoreAndRange: '원점수 2.39점 (범위 1–4)',
        normalizedScore: '0-100 환산(상대 위치, 원점수 아님): 46/100',
        band: '해석 구간: 없음(확립된 절단점 없음)',
        scoreDirection: '점수 방향: 평균이 높을수록 정서적 불안정성이 강함',
        cutoffAvailable: '절단점: 없음',
        translationStatus: '번역·한국어판 상태: 번역·타당화 논문이 있는 한국판(출처 기재 기준, 이 앱의 문항 문구는 원문 대조 미완료)',
        cautions: '점수가 높아도 특정 정신질환이나 기분장애를 의미하지 않으며 진단에 쓸 수 없다',
        subscales: [
          '불안/우울(AD): 원점수 2점 (범위 1–4) | 0-100 환산(상대 위치, 원점수 아님): 33/100',
          '우울/들뜸(DE): 원점수 2.38점 (범위 1–4) | 0-100 환산(상대 위치, 원점수 아님): 46/100',
          '분노(ANGER): 원점수 2.80점 (범위 1–4) | 0-100 환산(상대 위치, 원점수 아님): 60/100',
        ],
      },
    ],
    [
      'SHAPS',
      {
        testName: 'SHAPS (쾌감 경험 척도) (SHAPS)',
        concept: '측정 개념: 무쾌감(anhedonia)',
        rawScoreAndRange: '원점수 31점 (범위 14–56)',
        normalizedScore: '0-100 환산(상대 위치, 원점수 아님): 40/100',
        band: '해석 구간: 없음(이 점수에는 절단점 없음 — 절단점은 다른 점수에만 있음)',
        scoreDirection: '점수 방향: 주 점수(차원 채점, 14~56점)는 높을수록 쾌감 반응이 낮음',
        cutoffAvailable: '절단점: 있음(아래 해석 구간 참고) — 원판(영어) 기준이며 이 한국어 번역본에서는 검증되지 않았음',
        translationStatus: '번역·한국어판 상태: 비공식 번역(한국어판 신뢰도·타당도 미검증)',
        cautions: '두 점수를 하나로 합치거나 서로 변환하지 않는다',
        alternateScores: [
          '이분 채점(원판): 원점수 3점 (범위 0–14) | 해석 구간: 절단점 이상(3점 이상)',
        ],
      },
    ],
  ] as const)('%s: 요청된 모든 필드가 프롬프트에 정확히 들어간다', (code, expected) => {
    const text = block(code);
    expect(text).toContain(expected.testName);
    expect(text).toContain(expected.concept);
    expect(text).toContain(expected.rawScoreAndRange); // rawScore + rawScoreRange
    expect(text).toContain(expected.normalizedScore);
    expect(text).toContain(expected.band); // band/interpretation
    expect(text).toContain(expected.scoreDirection);
    expect(text).toContain(expected.cutoffAvailable);
    expect(text).toContain(expected.translationStatus);
    expect(text).toContain(expected.cautions); // interpretationCautions
    if ('subscales' in expected) {
      expect(text).toContain('하위척도:');
      for (const line of expected.subscales) expect(text).toContain(line);
    }
    if ('alternateScores' in expected) {
      expect(text).toContain('보조 점수(주 점수와 별개의 점수, 서로 환산하지 않음)');
      for (const line of expected.alternateScores) expect(text).toContain(line);
    }
  });

  it('값이 비어 있을 때 "null"/"undefined" 문자열이 프롬프트에 새지 않는다', () => {
    const body = userPrompt.slice(0, userPrompt.indexOf('--- 명언 후보 목록'));
    expect(body).not.toMatch(/\bnull\b|undefined|NaN/);
  });
});

describe('AI 오해석 방지 — 시스템 프롬프트 지시문 고정', () => {
  const { systemPrompt } = buildReportPrompt({ testResults: [AES_VIEW, ALS_VIEW, SHAPS_VIEW] });
  const chatPrompt = buildChatSystemPrompt({
    testScores: [AES_VIEW, ALS_VIEW, SHAPS_VIEW],
    sections: {} as Parameters<typeof buildChatSystemPrompt>[0]['sections'],
  });

  it('AES 점수 높음 → "직장 때문에 무기력하다" 식 원인 단정 금지', () => {
    expect(systemPrompt).toContain('AES(무의욕): 점수가 높다고 해서 무기력의 원인');
    expect(systemPrompt).toContain('"직장 때문에 무기력하다"처럼');
    expect(systemPrompt).toContain('그 사건을 무기력의 원인으로 단정하지 마십시오');
    expect(chatPrompt).toContain('AES 점수로');
    expect(chatPrompt).toContain('무기력의 원인을 추정하지 말고');
  });

  it('ALS 점수 높음 → 특정 기분장애/양극성장애 진단·암시 금지', () => {
    expect(systemPrompt).toContain('기분장애(양극성장애, 경계성');
    expect(systemPrompt).toContain('진단하거나 암시하지 마십시오');
    expect(chatPrompt).toContain('ALS-18 점수로 특정 정신질환이나 기분장애를 진단·암시하지 말며');
  });

  it('SHAPS 절단점 이상 → "비정상"이라 부르거나 우울증 진단과 동일시 금지', () => {
    expect(systemPrompt).toContain('"비정상"이라 부르거나 우울증 진단과 동일시하지');
    expect(systemPrompt).toContain('한국어 번역본에서 검증되지 않았습니다');
    expect(chatPrompt).toContain('SHAPS 결과를 우울증 진단과 동일시하지 마십시오');
  });

  it('성격검사와 새 검사가 함께 존재한다는 이유만으로 인과관계를 만들지 않는다', () => {
    expect(systemPrompt).toContain('성격검사(Big Five)를 포함한 다른 검사와 함께 높거나 낮게 나타난 것은 함께');
    expect(systemPrompt).toContain('두 점수가 동시에 존재한다는 이유만으로 "A 때문에 B"라는');
    // 기존 일반 원칙(상관 ≠ 인과)도 그대로 유지
    expect(systemPrompt).toContain('상관)과, 하나가 다른 하나의 원인이라는 것');
    expect(systemPrompt).toContain('성격 특성(예: 높은 성실성)은 성격적 경향을 보여주는 자료일 뿐');
    expect(chatPrompt).toContain('검사 간 함께 나타난 점수를 인과로 해석하지 마십시오');
  });

  it('사용자 메모의 최근 사건을 증상의 원인으로 단정하지 않는다(사실 아님 표기 + 규칙 유지)', () => {
    const { userPrompt } = buildReportPrompt({
      testResults: [AES_VIEW],
      reportContext: '최근 직장을 옮겼고 야근이 많아요',
    });
    expect(userPrompt).toContain('--- 사용자가 남긴 참고 메모(사실 아님) ---');
    expect(userPrompt).toContain('최근 직장을 옮겼고 야근이 많아요');
    expect(systemPrompt).toContain('사용자 메모(수검자가 보고한 최근 상황)는 원인이 아니라 "수검자가 보고한 상황"입니다');
    expect(systemPrompt).toContain('사용자 메모를 검사 결과의 원인으로');
    expect(systemPrompt).toContain('사실·보고·해석·가설');
  });

  it('비공식 번역 검사는 확신도를 낮추도록 지시하고, 미실시 선택 검사를 "정상"으로 해석하지 않게 한다', () => {
    expect(systemPrompt).toContain('해당 검사에 의존한 주장의 confidence를 HIGH로 두지 마십시오');
    expect(systemPrompt).toContain('결과가 없다고 해서 그 상태가 "정상"이라고');
  });
});

describe('절단점이 없는 검사에서는 정상/비정상 라벨을 만들지 않는다', () => {
  const CLINICAL_LABEL = /정상|비정상|경미|중등도|심각|중증/;

  it.each([
    ['AES', aes],
    ['ALS18', als18],
  ] as const)('%s: 시드에 밴드(구간 라벨)가 하나도 정의되어 있지 않다', (_code, definition) => {
    const seed = definition as SeedLike;
    expect(seed.scoringConfig.bands).toEqual([]);
    for (const sub of seed.scoringConfig.subscales as unknown as { bands: unknown[] }[]) {
      expect(sub.bands).toEqual([]);
    }
  });

  it('SHAPS: 절단점은 이분 점수에만 있고 라벨은 "절단점 미만/이상"뿐이며 임상 구간 단어를 쓰지 않는다', () => {
    const seed = shaps as unknown as SeedLike & { scoringConfig: { alternateScores: { bands: { label: string; description: string }[] }[] } };
    expect(seed.scoringConfig.bands).toEqual([]);
    for (const band of seed.scoringConfig.alternateScores[0].bands) {
      expect(`${band.label} ${band.description}`).not.toMatch(CLINICAL_LABEL);
    }
  });

  it('어떤 입력에서도 새 검사의 점수 뷰에 임상 구간 라벨이 생기지 않는다 (최소~최대 전 구간)', () => {
    for (let value = 1; value <= 4; value++) {
      for (const [definition, code] of [
        [aes, 'AES'],
        [als18, 'ALS18'],
        [shaps, 'SHAPS'],
      ] as const) {
        const v = viewOf(definition, code, () => value);
        expect(v.band).toBeNull();
        for (const s of v.subscaleScores) expect(s.band).toBeNull();
        for (const a of v.alternateScores) expect(a.band ?? '').not.toMatch(CLINICAL_LABEL);
      }
    }
  });
});
