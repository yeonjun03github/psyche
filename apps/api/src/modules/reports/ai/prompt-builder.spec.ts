import { buildReportPrompt } from './prompt-builder';

describe('buildReportPrompt', () => {
  it('진단 금지·통합 서술·가설 어조 지침을 시스템 프롬프트에 포함한다', () => {
    const { systemPrompt } = buildReportPrompt({ testResults: [] });
    expect(systemPrompt).toContain('진단');
    expect(systemPrompt).toContain('가설');
    expect(systemPrompt).toContain('overallSummary');
    expect(systemPrompt).toContain('retestGuidance');
  });

  it('단일 척도 검사와 하위척도 검사를 모두 사용자 프롬프트에 반영한다', () => {
    const { userPrompt } = buildReportPrompt({
      testResults: [
        { testCode: 'PHQ9', testName: 'PHQ-9', normalizedScore: 67, band: '중등도-중증', subscaleScores: [] },
        {
          testCode: 'IPIP50',
          testName: 'IPIP-50',
          normalizedScore: null,
          band: null,
          subscaleScores: [{ name: 'Extraversion', normalizedScore: 50, band: '보통' }],
        },
      ],
    });

    expect(userPrompt).toContain('PHQ-9');
    expect(userPrompt).toContain('67/100');
    expect(userPrompt).toContain('Extraversion');
    expect(userPrompt).toContain('50/100');
  });

  it('사용자 참고 메모는 "사실 아님" 라벨과 함께 포함하고, 없으면 블록을 생략한다', () => {
    const withContext = buildReportPrompt({ testResults: [], reportContext: '최근 이직 준비 중' });
    expect(withContext.userPrompt).toContain('사실 아님');
    expect(withContext.userPrompt).toContain('최근 이직 준비 중');

    const withoutContext = buildReportPrompt({ testResults: [] });
    expect(withoutContext.userPrompt).not.toContain('참고 메모');
  });

  it('검사 완료 시점 정보를 실제 날짜와 함께 포함한다', () => {
    const { userPrompt } = buildReportPrompt({
      testResults: [],
      timeline: {
        entries: [
          { testCode: 'PHQ9', testName: 'PHQ-9', completedAt: new Date('2026-01-01') },
          { testCode: 'IPIP50', testName: 'IPIP-50', completedAt: new Date('2026-07-12') },
        ],
        spanDays: 192,
        maxGapDays: 192,
      },
    });

    expect(userPrompt).toContain('PHQ-9 (PHQ9): 2026-01-01');
    expect(userPrompt).toContain('IPIP-50 (IPIP50): 2026-07-12');
    expect(userPrompt).toContain('전체 검사 기간: 192일');
    expect(userPrompt).toContain('검사 간 최대 간격: 192일');
  });

  it('previousComparison이 null이면 "첫 리포트"임을, 값이 있으면 순수 수치 변화를 전달한다', () => {
    const first = buildReportPrompt({ testResults: [], previousComparison: null });
    expect(first.userPrompt).toContain('첫 리포트');

    const withDiff = buildReportPrompt({
      testResults: [],
      previousComparison: {
        daysSincePrevious: 90,
        testDiffs: [
          {
            testCode: 'PHQ9',
            previousNormalizedScore: 70,
            currentNormalizedScore: 40,
            delta: -30,
            previousBand: '중등도-중증',
            currentBand: '경도',
            subscaleDiffs: [],
          },
        ],
      },
    });
    expect(withDiff.userPrompt).toContain('90일 경과');
    expect(withDiff.userPrompt).toContain('변화량 -30');
    // 코드가 "개선/악화"를 판정하지 않는다는 것을 프롬프트 텍스트에서도 보장
    expect(withDiff.userPrompt).not.toMatch(/개선되었|악화되었|improved|worsened/i);
  });

  it('과거 피드백 집계를 "확정된 사실 아님"이라는 라벨과 함께 포함한다', () => {
    const { userPrompt } = buildReportPrompt({
      testResults: [],
      priorFeedback: [
        { section: 'possibleRelevance', confirmedCount: 0, partiallyConfirmedCount: 0, rejectedCount: 2, latestNote: '아니에요' },
      ],
    });

    expect(userPrompt).toContain('확정된 사실 아님');
    expect(userPrompt).toContain('아니다 2회');
    expect(userPrompt).toContain('아니에요');
  });

  it('시스템 프롬프트에 확신도(claimsConfidence) 지침을 포함한다', () => {
    const { systemPrompt } = buildReportPrompt({ testResults: [] });
    expect(systemPrompt).toContain('claimsConfidence');
    expect(systemPrompt).toContain('HIGH');
  });
});
