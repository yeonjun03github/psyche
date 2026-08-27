import { summarizeFeedbackHistory } from './feedback-summary';

describe('summarizeFeedbackHistory', () => {
  it('여러 리포트의 피드백을 섹션별로 집계한다', () => {
    const report1Feedback = [
      { section: 'possibleRelevance', verdict: 'REJECTED' as const, note: '아니에요', updatedAt: new Date('2026-01-01') },
    ];
    const report2Feedback = [
      { section: 'possibleRelevance', verdict: 'REJECTED' as const, note: '이번에도 아님', updatedAt: new Date('2026-02-01') },
      { section: 'confirmedStrength', verdict: 'CONFIRMED' as const, note: null, updatedAt: new Date('2026-02-01') },
    ];

    const result = summarizeFeedbackHistory([report1Feedback, report2Feedback]);

    expect(result).toEqual(
      expect.arrayContaining([
        {
          section: 'possibleRelevance',
          confirmedCount: 0,
          partiallyConfirmedCount: 0,
          rejectedCount: 2,
          latestNote: '이번에도 아님',
        },
        {
          section: 'confirmedStrength',
          confirmedCount: 1,
          partiallyConfirmedCount: 0,
          rejectedCount: 0,
          latestNote: null,
        },
      ]),
    );
  });

  it('피드백이 없으면 빈 배열을 반환한다', () => {
    expect(summarizeFeedbackHistory([])).toEqual([]);
    expect(summarizeFeedbackHistory([[]])).toEqual([]);
  });

  it('가장 최근 항목의 메모를 latestNote로 사용한다(시간순 무관하게 입력해도)', () => {
    const feedback = [
      { section: 'crossTestPatterns', verdict: 'PARTIALLY_CONFIRMED' as const, note: '오래된 메모', updatedAt: new Date('2026-01-01') },
      { section: 'crossTestPatterns', verdict: 'PARTIALLY_CONFIRMED' as const, note: '최신 메모', updatedAt: new Date('2026-03-01') },
    ];

    const result = summarizeFeedbackHistory([feedback]);
    expect(result[0].latestNote).toBe('최신 메모');
  });
});
