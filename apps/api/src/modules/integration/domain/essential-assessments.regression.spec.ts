import { ESSENTIAL_TEST_CODES } from '@psyche/shared';
import { ipip50 } from '../../../../prisma/seed/data/ipip50';
import { phq9 } from '../../../../prisma/seed/data/phq9';
import { gad7 } from '../../../../prisma/seed/data/gad7';
import { pss10 } from '../../../../prisma/seed/data/pss10';
import { rses } from '../../../../prisma/seed/data/rses';
import { brs } from '../../../../prisma/seed/data/brs';
import { who5 } from '../../../../prisma/seed/data/who5';
import { GenericTestScorer, type ScoringConfigInput } from '../../test-definitions/domain/scoring/generic-test-scorer';
import { buildReportPrompt } from '../../reports/ai/prompt-builder';
import { buildPersonModelTestResult, type TestDefinitionInput } from './person-model.mapper';
import { buildTestScoreView, type ScoreViewDefinitionInput } from './test-score-view';

/**
 * 선택 검사 도입(채점기 확장, 원점수/환산 분리, 프롬프트 변경) 이후에도 필수 7종의 채점·표시·프롬프트가
 * 바뀌지 않았음을 고정한다. 기대값은 변경 전(HEAD) 채점기로 직접 계산한 값과 일치함을 확인한 뒤 고정했다.
 */

interface SeedLike extends TestDefinitionInput, ScoreViewDefinitionInput {
  scaleMin?: number;
  questions: { questionId: string; reverseScored: boolean }[];
  scoringConfig: ScoringConfigInput & ScoreViewDefinitionInput['scoringConfig'];
}

const scorer = new GenericTestScorer();

function view(definition: unknown, code: string, value: 'min' | 'max') {
  const seed = definition as SeedLike;
  const v = value === 'min' ? seed.responseScaleMin : seed.responseScaleMax;
  const answers = seed.questions.map((q) => ({ questionId: q.questionId, value: v }));
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
  return { scored, view: buildTestScoreView(result, seed) };
}

describe('필수 7종 회귀', () => {
  it('필수 검사 코드 구성과 순서가 그대로다', () => {
    expect([...ESSENTIAL_TEST_CODES]).toEqual(['IPIP50', 'PHQ9', 'GAD7', 'PSS10', 'RSES', 'BRS', 'WHO5']);
  });

  it.each([
    // [정의, 코드, 모든 응답=최소일 때 원점수/밴드, 모든 응답=최대일 때 원점수/밴드]
    ['PHQ9', phq9, [0, '정상'], [27, '중증']],
    ['GAD7', gad7, [0, '정상'], [21, '중증']],
    ['PSS10', pss10, [16, '보통'], [24, '보통']], // 4문항 역채점이라 전부 같은 응답이면 중간 값
    ['RSES', rses, [15, '낮음'], [15, '낮음']], // 5문항 역채점
    ['BRS', brs, [3, '보통'], [3, '보통']], // 3문항 역채점, 평균
    ['WHO5', who5, [0, '낮음'], [100, '양호']], // 원점수 x4
  ] as const)('%s: 채점 결과(원점수·밴드)가 변경 전과 같다', (code, definition, min, max) => {
    const lo = view(definition, code, 'min').scored;
    const hi = view(definition, code, 'max').scored;
    expect([lo.rawScore, lo.band]).toEqual(min);
    expect([hi.rawScore, hi.band]).toEqual(max);
    expect(lo.alternateScores).toEqual([]);
    expect(lo.subscaleScores).toEqual([]);
  });

  it('IPIP-50: 하위척도만 반환하고 전체 점수는 없다(기존 구조 유지)', () => {
    const { scored, view: v } = view(ipip50, 'IPIP50', 'min');
    expect(scored.rawScore).toBeNull();
    expect(scored.band).toBeNull();
    expect(scored.subscaleScores.map((s) => [s.name, s.rawScore, s.band])).toEqual([
      ['Extraversion', 30, '보통'],
      ['Agreeableness', 26, '보통'],
      ['Conscientiousness', 26, '보통'],
      ['EmotionalStability', 42, '높음'],
      ['Intellect', 22, '낮음'],
    ]);
    expect(v.rawScore).toBeNull();
    expect(v.normalizedScore).toBeNull();
    expect(v.displayRawScore).toBeNull();
    expect(v.subscaleScores[0]).toMatchObject({ rawScore: 30, normalizedScore: 50, band: '보통' });
    expect(v.subscaleScores[0].displayRawScore).toBe('30점 (범위 10–50)');
  });

  it('표시 값: 원점수+범위, 0-100 환산, 밴드가 서로 다른 필드로 기존 검사에도 제공된다', () => {
    const phq = view(phq9, 'PHQ9', 'max').view;
    expect(phq).toMatchObject({ displayRawScore: '27점 (범위 0–27)', normalizedScore: 100, band: '중증', meta: null });
    const who = view(who5, 'WHO5', 'max').view;
    expect(who).toMatchObject({ displayRawScore: '100점 (범위 0–100)', normalizedScore: 100, band: '양호', scoreLabel: '환산 점수' });
    const b = view(brs, 'BRS', 'min').view;
    expect(b).toMatchObject({ displayRawScore: '3점 (범위 1–5)', normalizedScore: 50, band: '보통', scoreLabel: '평균 점수' });
    const pss = view(pss10, 'PSS10', 'min').view;
    expect(pss).toMatchObject({ displayRawScore: '16점 (범위 0–40)', normalizedScore: 40, scoreLabel: '총점' });
  });

  it('필수 검사는 메타데이터가 없어 프롬프트에 "검사 정보" 블록이 생기지 않고, 정규화 점수·밴드는 그대로 전달된다', () => {
    const testResults = [
      view(phq9, 'PHQ9', 'max').view,
      view(who5, 'WHO5', 'max').view,
      view(ipip50, 'IPIP50', 'min').view,
    ];
    const { userPrompt } = buildReportPrompt({ testResults });
    expect(userPrompt).not.toContain('검사 정보');
    expect(userPrompt).not.toContain('번역·한국어판 상태');
    expect(userPrompt).toContain('PHQ-9 (우울증 선별검사) (PHQ9)'.replace('PHQ-9 (우울증 선별검사)', testResults[0].testName));
    expect(userPrompt).toContain('원점수 27점 (범위 0–27) | 0-100 환산(상대 위치, 원점수 아님): 100/100 | 해석 구간: 중증');
    expect(userPrompt).toContain('원점수 100점 (범위 0–100) | 0-100 환산(상대 위치, 원점수 아님): 100/100 | 해석 구간: 양호');
    expect(userPrompt).toContain('Extraversion: 원점수 30점 (범위 10–50) | 0-100 환산(상대 위치, 원점수 아님): 50/100 | 해석 구간: 보통');
  });
});
