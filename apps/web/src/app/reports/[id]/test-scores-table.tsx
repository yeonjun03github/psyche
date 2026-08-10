import type { TestScoreItem } from '@/lib/api';

/**
 * AI 서술은 본문에 검사명/점수를 나열하지 않도록 지시받았다(prompt-builder.ts) — 그래서 실제
 * 검사 점수는 서술과 분리된 이 표로 따로 보여준다. IPIP-50(Big Five)처럼 하위척도만 있는 검사는
 * normalizedScore가 없고 subscaleScores만 있다(schema.prisma 주석 참고).
 */
export function TestScoresTable({ items }: { items: TestScoreItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 text-sm dark:border-neutral-800">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-normal">검사</th>
            <th className="px-3 py-2 font-normal">점수</th>
            <th className="px-3 py-2 font-normal">결과</th>
          </tr>
        </thead>
        <tbody>
          {items.flatMap((item) =>
            item.normalizedScore != null
              ? [
                  <tr key={item.testCode} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                    <td className="px-3 py-2">{item.testName}</td>
                    <td className="px-3 py-2">{item.normalizedScore}/100</td>
                    <td className="px-3 py-2 text-neutral-500">{item.band ?? '—'}</td>
                  </tr>,
                ]
              : item.subscaleScores.map((s) => (
                  <tr
                    key={`${item.testCode}-${s.name}`}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
                  >
                    <td className="px-3 py-2">
                      {item.testName} · {s.name}
                    </td>
                    <td className="px-3 py-2">{s.normalizedScore}/100</td>
                    <td className="px-3 py-2 text-neutral-500">{s.band}</td>
                  </tr>
                )),
          )}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-neutral-400">
        위 수치는 각 검사의 표준화 점수이며, 아래 서술은 이 결과들을 종합 해석한 내용입니다.
      </p>
    </div>
  );
}
