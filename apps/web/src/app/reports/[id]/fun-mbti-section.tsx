import type { FunMbtiGuess } from '@psyche/shared';

const CONFIDENCE_LABEL: Record<string, string> = { HIGH: '확신 높음', MEDIUM: '확신 보통', LOW: '확신 낮음' };

/**
 * 리포트의 핵심 분석이 아닌 보너스 이스터에그 — 점선 테두리·옅은 배경·별도 disclaimer로
 * 위 심리 분석 섹션들과 시각적으로 확실히 구분해, "Big Five보다 중요해 보이는" 인상을 피한다.
 * 핵심 해석이 아니므로 피드백 버튼(FeedbackControls)은 의도적으로 붙이지 않는다.
 */
export function FunMbtiSection({ guess }: { guess: FunMbtiGuess }) {
  return (
    <section className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
      <h2 className="mb-1 text-sm font-semibold text-neutral-500">🎭 당신과 가장 가까운 MBTI</h2>
      <p className="mb-3 text-xs text-neutral-400">
        재미로 보는 보너스 콘텐츠입니다. 실제 MBTI 검사 결과가 아니라, 위 심리검사 결과를 AI가 MBTI
        관점으로 재해석한 참고용 추정입니다.
      </p>
      <ul className="mb-3 flex flex-col gap-1">
        {guess.topCandidates.map((c) => (
          <li key={c.type} className="flex items-center justify-between text-sm">
            <span className="font-medium">{c.type}</span>
            <span className="text-neutral-500">{c.percentage}%</span>
          </li>
        ))}
      </ul>
      <p className="mb-2 text-sm leading-relaxed">{guess.reasoning}</p>
      <span className="text-xs text-neutral-400">{CONFIDENCE_LABEL[guess.confidence] ?? guess.confidence}</span>
    </section>
  );
}
