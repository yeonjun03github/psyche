import type { PsychNickname } from '@psyche/shared';

/** 리포트 최상단의 따뜻한 오프닝 훅 — 본문 임상 섹션과는 다른, 살짝 강조된 카드로 보여준다. */
export function PsychNicknameSection({ nickname }: { nickname: PsychNickname }) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold text-neutral-500">🧩 당신의 심리 별명</h2>
      <p className="mb-2 text-lg font-semibold">“{nickname.nickname}”</p>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{nickname.explanation}</p>
    </section>
  );
}
