'use client';

import { useState } from 'react';
import type { ClaimSectionKey, FeedbackVerdict, SectionFeedback } from '@psyche/shared';
import { api } from '@/lib/api';

const VERDICT_LABEL: Record<FeedbackVerdict, string> = {
  CONFIRMED: '맞다',
  PARTIALLY_CONFIRMED: '일부 맞다',
  REJECTED: '아니다',
};
const VERDICTS: FeedbackVerdict[] = ['CONFIRMED', 'PARTIALLY_CONFIRMED', 'REJECTED'];

export function FeedbackControls({
  reportId,
  section,
  existing,
}: {
  reportId: string;
  section: ClaimSectionKey;
  existing: SectionFeedback | null;
}) {
  const [feedback, setFeedback] = useState(existing);
  const [note, setNote] = useState(existing?.note ?? '');
  const [showNote, setShowNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(verdict: FeedbackVerdict, noteValue: string) {
    setSubmitting(true);
    try {
      const updated = await api.submitReportFeedback(reportId, {
        section,
        verdict,
        note: noteValue.trim() || undefined,
      });
      setFeedback(updated.feedback.find((f) => f.section === section) ?? null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-neutral-400">이 해석이 맞나요?</span>
      {VERDICTS.map((v) => (
        <button
          key={v}
          onClick={() => submit(v, note)}
          disabled={submitting}
          className={`rounded-full border px-2 py-0.5 disabled:opacity-50 ${
            feedback?.verdict === v
              ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
              : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
          }`}
        >
          {VERDICT_LABEL[v]}
        </button>
      ))}
      <button onClick={() => setShowNote((s) => !s)} className="text-neutral-400 underline">
        메모
      </button>
      {showNote && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => feedback && submit(feedback.verdict, note)}
          maxLength={500}
          placeholder="메모(선택)"
          className="min-w-40 flex-1 rounded border border-neutral-200 px-2 py-0.5 dark:border-neutral-800 dark:bg-neutral-950"
        />
      )}
    </div>
  );
}
