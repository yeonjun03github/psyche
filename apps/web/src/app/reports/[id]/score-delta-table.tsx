import type { ComparisonSummary } from '@/lib/api';

function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/** 순수 숫자 비교만 보여준다 — "개선/악화" 같은 라벨링은 하지 않는다(그 판단은 아래 서술의 몫). */
export function ScoreDeltaTable({ summary }: { summary: ComparisonSummary }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 text-sm dark:border-neutral-800">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-normal">검사</th>
            <th className="px-3 py-2 font-normal">이전</th>
            <th className="px-3 py-2 font-normal">현재</th>
            <th className="px-3 py-2 font-normal">변화량</th>
          </tr>
        </thead>
        <tbody>
          {summary.testDiffs.map((d) => (
            <tr key={d.testCode} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
              <td className="px-3 py-2">{d.testCode}</td>
              <td className="px-3 py-2 text-neutral-500">
                {d.previousNormalizedScore != null ? `${d.previousNormalizedScore}/100 (${d.previousBand})` : '—'}
              </td>
              <td className="px-3 py-2">
                {d.currentNormalizedScore != null ? `${d.currentNormalizedScore}/100 (${d.currentBand})` : '—'}
              </td>
              <td className="px-3 py-2">{formatDelta(d.delta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-neutral-400">
        이전 리포트로부터 {summary.daysSincePrevious}일 경과 — 위 수치는 순수 비교이며, 해석은 아래 서술을 참고하세요.
      </p>
    </div>
  );
}
