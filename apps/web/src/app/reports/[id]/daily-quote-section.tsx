import type { DailyQuote } from '@psyche/shared';

/** 리포트를 다 읽은 뒤 남는 따뜻한 마무리 — 검증된 명언 목록(quote-bank.ts)에서만 가져온 텍스트다. */
export function DailyQuoteSection({ quote }: { quote: DailyQuote }) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-white">
      <h2 className="mb-2 text-sm font-semibold text-neutral-300">🌿 오늘 당신을 위한 명언</h2>
      <p className="mb-1 text-base leading-relaxed">“{quote.quote}”</p>
      <p className="text-sm text-neutral-400">— {quote.author}</p>
    </section>
  );
}
