import { aes } from '../../../../prisma/seed/data/aes';
import { als18 } from '../../../../prisma/seed/data/als18';
import { shaps } from '../../../../prisma/seed/data/shaps';
import { GenericTestScorer, type ScoringConfigInput } from '../../test-definitions/domain/scoring/generic-test-scorer';
import { buildPersonModelTestResult, type TestDefinitionInput } from '../../integration/domain/person-model.mapper';
import { buildTestScoreView, type ScoreViewDefinitionInput } from '../../integration/domain/test-score-view';
import { buildChatSystemPrompt } from './chat-prompt-builder';
import { buildReportPrompt } from './prompt-builder';

interface SeedLike extends TestDefinitionInput, ScoreViewDefinitionInput {
  questions: { questionId: string; reverseScored: boolean }[];
  scoringConfig: ScoringConfigInput & ScoreViewDefinitionInput['scoringConfig'];
}

const scorer = new GenericTestScorer();

function viewOf(definition: unknown, testCode: string, valueOf: (index: number) => number) {
  const seed = definition as SeedLike;
  const answers = seed.questions.map((q, i) => ({ questionId: q.questionId, value: valueOf(i) }));
  const scored = scorer.score(answers, seed.questions, seed.responseScaleMin, seed.responseScaleMax, seed.scoringConfig);
  const result = buildPersonModelTestResult(
    {
      testCode,
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

describe('AI 리포트 프롬프트 — 선택 검사 메타데이터 전달', () => {
  const testResults = [
    viewOf(aes, 'AES', () => 2),
    viewOf(als18, 'ALS18', (i) => (i % 4) + 1),
    viewOf(shaps, 'SHAPS', (i) => (i < 3 ? 2 : 3)),
  ];
  const { systemPrompt, userPrompt } = buildReportPrompt({ testResults });

  it('검사명과 측정 개념이 전달된다', () => {
    expect(userPrompt).toContain('AES-S (무의욕증 평가척도, 자가보고) (AES)');
    expect(userPrompt).toContain('측정 개념: 무의욕(apathy)');
    expect(userPrompt).toContain('측정 개념: 정서적 불안정성(affective lability)');
    expect(userPrompt).toContain('측정 개념: 무쾌감(anhedonia)');
  });

  it('원점수가 점수 범위와 함께 전달되고, 0-100 환산은 원점수가 아니라고 명시된다', () => {
    // AES 모두 2점 응답: 역채점 15문항 (5-2)=3점 + 비역채점 3문항 2점 = 51
    expect(userPrompt).toContain('원점수 51점 (범위 18–72)');
    expect(userPrompt).toContain('0-100 환산(상대 위치, 원점수 아님)');
  });

  it('점수 방향과 절단점 유무, 번역 상태가 검사별로 전달된다', () => {
    expect(userPrompt).toContain('점수 방향: 총점이 높을수록 무의욕 경향이 강함(18~72점)');
    expect(userPrompt).toContain('절단점: 없음');
    expect(userPrompt).toContain('절단점: 있음(아래 해석 구간 참고)');
    expect(userPrompt).toContain('비공식 번역(한국어판 신뢰도·타당도 미검증)');
    expect(userPrompt).toContain('번역·타당화 논문이 있는 한국판');
  });

  it('해석 구간이 없는 검사는 band를 만들지 않고 "없음(확립된 절단점 없음)"으로 전달된다', () => {
    expect(userPrompt).toContain('해석 구간: 없음(확립된 절단점 없음)');
    expect(userPrompt).not.toContain('(null)');
    expect(userPrompt).toContain('해석 구간: 없음(이 점수에는 절단점 없음 — 절단점은 다른 점수에만 있음)'); // SHAPS 차원 점수
  });

  it('ALS-18 하위척도가 각각 원점수 범위와 함께 전달된다', () => {
    expect(userPrompt).toContain('하위척도:');
    expect(userPrompt).toContain('불안/우울(AD): 원점수');
    expect(userPrompt).toContain('우울/들뜸(DE): 원점수');
    expect(userPrompt).toContain('분노(ANGER): 원점수');
    expect(userPrompt).toContain('(범위 1–4)');
  });

  it('SHAPS 이분 점수가 차원 점수와 별개의 보조 점수로 함께 전달된다', () => {
    expect(userPrompt).toContain('차원 채점 총점: 원점수 ');
    expect(userPrompt).toContain('(범위 14–56)');
    expect(userPrompt).toContain('보조 점수(주 점수와 별개의 점수, 서로 환산하지 않음)');
    expect(userPrompt).toContain('이분 채점(원판): 원점수 3점 (범위 0–14) | 해석 구간: 절단점 이상(3점 이상)');
  });

  it('해석 시 주의사항이 전달된다', () => {
    expect(userPrompt).toContain('해석 시 주의사항:');
    expect(userPrompt).toContain('진단');
  });

  it('시스템 프롬프트에 새 검사 해석 규칙과 기존 사실·보고·해석·가설 원칙이 모두 있다', () => {
    expect(systemPrompt).toContain('AES(무의욕): 점수가 높다고 해서 무기력의 원인');
    expect(systemPrompt).toContain('ALS-18(정서적 불안정성): 점수가 높다고 해서 특정 정신질환이나 기분장애(양극성장애, 경계성');
    expect(systemPrompt).toContain('SHAPS(무쾌감)');
    expect(systemPrompt).toContain('우울증 진단과 동일시하지');
    expect(systemPrompt).toContain('두 점수가 동시에 존재한다는 이유만으로');
    expect(systemPrompt).toContain('사실·보고·해석·가설');
    expect(systemPrompt).toContain('선택 검사는 완료한 경우에만 결과가 주어집니다');
  });
});

describe('기존 검사 프롬프트 회귀', () => {
  it('원점수·메타데이터가 없는 기존 형식 입력은 이전과 같은 정규화 점수 형식으로 출력된다', () => {
    const { userPrompt } = buildReportPrompt({
      testResults: [
        { testCode: 'PHQ9', testName: 'PHQ-9', normalizedScore: 48, band: '중등도', subscaleScores: [] },
        {
          testCode: 'IPIP50',
          testName: 'IPIP-50',
          normalizedScore: null,
          band: null,
          subscaleScores: [{ name: '외향성', normalizedScore: 70, band: '높음' }],
        },
      ],
    });
    expect(userPrompt).toContain('- PHQ-9 (PHQ9): 정규화 점수 48/100 (중등도)');
    expect(userPrompt).toContain('    - 외향성: 정규화 점수 70/100 (높음)');
  });
});

describe('후속 질문(chat) 프롬프트 — 점수 구분', () => {
  it('원점수와 0-100 환산, 보조 점수, 비공식 번역 여부를 구분해서 전달한다', () => {
    const views = [viewOf(shaps, 'SHAPS', (i) => (i < 3 ? 2 : 3)), viewOf(aes, 'AES', () => 2)];
    const prompt = buildChatSystemPrompt({
      testScores: views,
      sections: {} as Parameters<typeof buildChatSystemPrompt>[0]['sections'],
    });
    expect(prompt).toContain('원점수 ');
    expect(prompt).toContain('0-100 환산(상대 위치)');
    expect(prompt).toContain('보조 점수 이분 채점(원판): 원점수 3점 (범위 0–14) (절단점 이상(3점 이상))');
    expect(prompt).toContain('비공식 번역');
    expect(prompt).not.toContain('(null)');
  });
});
