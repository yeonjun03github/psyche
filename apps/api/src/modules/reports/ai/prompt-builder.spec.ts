import { buildReportPrompt } from './prompt-builder';

describe('buildReportPrompt', () => {
  it('진단 금지·통합 서술·가설 어조 지침을 시스템 프롬프트에 포함한다', () => {
    const { systemPrompt } = buildReportPrompt({ testResults: [] });
    expect(systemPrompt).toContain('진단');
    expect(systemPrompt).toContain('가설');
    expect(systemPrompt).toContain('overallSummary');
    expect(systemPrompt).toContain('recommendedRetestTiming');
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
});
