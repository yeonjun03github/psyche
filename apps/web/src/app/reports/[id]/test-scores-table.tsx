import type { TestScoreItem } from '@/lib/api';

/**
 * AI 서술은 본문에 검사명/점수를 나열하지 않도록 지시받았다(prompt-builder.ts) — 그래서 실제
 * 검사 점수는 서술과 분리된 이 표로 따로 보여준다.
 *
 * 세 값을 서로 다른 열로 분리한다 — "26/100 경미"처럼 한 칸에 섞으면 원점수·0-100 환산·해석 구간을
 * 구분할 수 없다.
 * - 원점수: 검사 고유 척도의 점수. 항상 이론상 범위와 함께 표시한다.
 * - 0-100 환산: 원점수가 범위 안에서 어디쯤인지 보여주는 상대 위치(원점수도 임상 기준도 아니다).
 * - 해석 구간: 확립된 기준이 있는 검사에만 표시한다. 없으면 임의 구간을 만들지 않는다.
 * IPIP-50(Big Five)처럼 하위척도만 있는 검사는 전체 점수 없이 하위척도 행만 나온다.
 */

interface ScoreRow {
  key: string;
  label: string;
  sublabel?: string;
  raw: string;
  normalized: string;
  band: string;
}

function bandText(band: string | null, hasCutoff: boolean | undefined): string {
  if (band) return band;
  return hasCutoff === false ? '기준 없음' : '—';
}

function buildRows(item: TestScoreItem): ScoreRow[] {
  const rows: ScoreRow[] = [];
  const hasCutoff = item.meta?.hasCutoff;
  const hasDetail = item.subscaleScores.length > 0 || (item.alternateScores?.length ?? 0) > 0;

  if (item.normalizedScore != null) {
    rows.push({
      key: `${item.testCode}-overall`,
      label: hasDetail ? `${item.testName} · ${item.scoreLabel ?? '전체'}` : item.testName,
      sublabel: item.meta?.scoreDirection,
      raw: item.displayRawScore ?? '—',
      normalized: String(item.normalizedScore),
      band: bandText(item.band, hasCutoff),
    });
  }
  for (const s of item.subscaleScores) {
    rows.push({
      key: `${item.testCode}-${s.name}`,
      label: `${item.testName} · ${s.name}`,
      raw: s.displayRawScore ?? '—',
      normalized: String(s.normalizedScore),
      band: bandText(s.band, hasCutoff),
    });
  }
  for (const a of item.alternateScores ?? []) {
    rows.push({
      key: `${item.testCode}-alt-${a.key}`,
      label: `${item.testName} · ${a.name}`,
      raw: a.displayRawScore,
      normalized: '—',
      band: a.band ?? '—',
    });
  }
  return rows;
}

export function TestScoresTable({ items }: { items: TestScoreItem[] }) {
  const unofficial = items.filter((item) => item.meta?.translationStatus === 'UNOFFICIAL_TRANSLATION');

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 text-sm dark:border-neutral-800">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-normal">검사</th>
            <th className="px-3 py-2 font-normal">원점수 (범위)</th>
            <th className="px-3 py-2 font-normal">0–100 환산</th>
            <th className="px-3 py-2 font-normal">해석 구간</th>
          </tr>
        </thead>
        <tbody>
          {items.flatMap(buildRows).map((row) => (
            <tr key={row.key} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
              <td className="px-3 py-2">
                {row.label}
                {row.sublabel && <p className="mt-0.5 text-xs text-neutral-400">{row.sublabel}</p>}
              </td>
              <td className="whitespace-nowrap px-3 py-2">{row.raw}</td>
              <td className="px-3 py-2">{row.normalized}</td>
              <td className="px-3 py-2 text-neutral-500">{row.band}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col gap-1 px-3 py-2 text-xs text-neutral-400">
        <p>
          원점수는 각 검사 고유 척도의 점수입니다. 0–100 환산은 원점수가 범위 안에서 어디쯤인지 옮긴 상대 위치일 뿐
          원점수나 임상 기준이 아니며, 해석 구간은 확립된 기준이 있는 검사에만 표시됩니다. 아래 서술은 이 결과들을
          종합 해석한 내용입니다.
        </p>
        {unofficial.map((item) => (
          <p key={item.testCode}>
            ※ {item.testName}은(는) 비공식 번역본으로, 한국어판의 신뢰도·타당도가 검증되지 않았습니다.
          </p>
        ))}
      </div>
    </div>
  );
}
