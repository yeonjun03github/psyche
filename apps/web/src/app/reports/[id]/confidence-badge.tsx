import type { ConfidenceLevel } from '@psyche/shared';

const LABEL: Record<ConfidenceLevel, string> = { HIGH: '확신 높음', MEDIUM: '확신 보통', LOW: '확신 낮음' };
const COLOR: Record<ConfidenceLevel, string> = {
  HIGH: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  LOW: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

export function ConfidenceBadge({
  confidence,
  evidence,
  reason,
}: {
  confidence: ConfidenceLevel;
  evidence: string[];
  reason: string | null;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
      <span className={`rounded-full px-2 py-0.5 font-medium ${COLOR[confidence]}`}>{LABEL[confidence]}</span>
      {evidence.length > 0 && <span className="text-neutral-500">근거: {evidence.join(', ')}</span>}
      {reason && <span className="text-neutral-500">사유: {reason}</span>}
    </div>
  );
}
