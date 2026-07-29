/** 리포트에서 AI가 가장 중요하게 본 단 한 문장 — 인용구처럼 크고 굵게 강조해 여운을 남긴다. */
export function KeyInsightLine({ line }: { line: string }) {
  return (
    <section className="border-l-4 border-neutral-300 pl-4 dark:border-neutral-700">
      <h2 className="mb-1 text-sm font-semibold text-neutral-500">🎁 AI가 보는 한 줄</h2>
      <p className="text-lg leading-relaxed font-medium italic">“{line}”</p>
    </section>
  );
}
