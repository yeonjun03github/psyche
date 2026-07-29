export type FeedbackVerdict = 'CONFIRMED' | 'PARTIALLY_CONFIRMED' | 'REJECTED';

export interface FeedbackEntry {
  section: string;
  verdict: FeedbackVerdict;
  note: string | null;
  updatedAt: Date;
}

export interface FeedbackTally {
  section: string;
  confirmedCount: number;
  partiallyConfirmedCount: number;
  rejectedCount: number;
  latestNote: string | null;
}

/**
 * 과거 리포트들에 남긴 피드백을 섹션별로 집계(카운트)만 한다. "N번 부정됐으니 이 가설은
 * 틀렸다" 같은 판단은 절대 내리지 않는다 — 그 해석은 전적으로 프롬프트를 통해 LLM에게 맡긴다.
 */
export function summarizeFeedbackHistory(pastFeedback: FeedbackEntry[][]): FeedbackTally[] {
  const bySection = new Map<string, FeedbackEntry[]>();
  for (const entry of pastFeedback.flat()) {
    const entries = bySection.get(entry.section) ?? [];
    entries.push(entry);
    bySection.set(entry.section, entries);
  }

  return [...bySection.entries()].map(([section, entries]) => {
    const mostRecent = [...entries].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    return {
      section,
      confirmedCount: entries.filter((e) => e.verdict === 'CONFIRMED').length,
      partiallyConfirmedCount: entries.filter((e) => e.verdict === 'PARTIALLY_CONFIRMED').length,
      rejectedCount: entries.filter((e) => e.verdict === 'REJECTED').length,
      latestNote: mostRecent?.note ?? null,
    };
  });
}
