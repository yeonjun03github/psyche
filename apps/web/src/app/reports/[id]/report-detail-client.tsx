'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AI_REPORT_SECTION_LABELS, CLAIM_SECTION_KEYS, type ClaimSectionKey } from '@psyche/shared';
import { api, type ReportDto } from '@/lib/api';
import { ConfidenceBadge } from './confidence-badge';
import { FeedbackControls } from './feedback-controls';
import { ScoreDeltaTable } from './score-delta-table';
import { FunMbtiSection } from './fun-mbti-section';

const CLAIM_SECTION_SET: Set<string> = new Set(CLAIM_SECTION_KEYS);

export function ReportDetailClient({ id }: { id: string }) {
  const [report, setReport] = useState<ReportDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const dto = await api.getReport(id);
        if (cancelled) return;
        setReport(dto);
        if (dto.status === 'PENDING' || dto.status === 'PROCESSING') {
          timer = setTimeout(poll, 3000);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  if (error) {
    return <CenteredMessage>오류가 발생했습니다: {error}</CenteredMessage>;
  }
  if (!report) {
    return <CenteredMessage>불러오는 중...</CenteredMessage>;
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link href="/reports" className="text-sm text-neutral-500">
        ← 리포트 목록
      </Link>

      {(report.status === 'PENDING' || report.status === 'PROCESSING') && (
        <CenteredMessage>AI가 리포트를 생성하고 있습니다...</CenteredMessage>
      )}

      {report.status === 'FAILED' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          리포트 생성에 실패했습니다: {report.failureReason}
        </div>
      )}

      {report.status === 'COMPLETED' && report.sections && (
        <>
          <p className="rounded-md bg-neutral-100 p-3 text-xs text-neutral-500 dark:bg-neutral-900">
            본 리포트는 의학적 진단이 아니며 전문가 상담을 대체하지 않습니다.
          </p>

          {report.context && (
            <p className="rounded-md border border-neutral-200 p-3 text-xs text-neutral-500 dark:border-neutral-800">
              이 리포트를 생성할 때 남긴 참고 메모: “{report.context}”
            </p>
          )}

          {report.comparisonSummary && <ScoreDeltaTable summary={report.comparisonSummary} />}

          {(Object.keys(AI_REPORT_SECTION_LABELS) as (keyof typeof AI_REPORT_SECTION_LABELS)[]).map((key) => {
            const value = report.sections![key];
            if (value == null) return null; // 종단 비교 섹션은 이전 리포트가 없으면 null

            const confidence = report.sections!.claimsConfidence.find((c) => c.section === key);
            const isClaimSection = CLAIM_SECTION_SET.has(key);

            return (
              <section key={key}>
                <h2 className="mb-1 text-sm font-semibold text-neutral-500">{AI_REPORT_SECTION_LABELS[key]}</h2>
                <p className="leading-relaxed">{value}</p>
                {confidence && (
                  <ConfidenceBadge
                    confidence={confidence.confidence}
                    evidence={confidence.evidence}
                    reason={confidence.reason}
                  />
                )}
                {isClaimSection && (
                  <FeedbackControls
                    reportId={report.id}
                    section={key as ClaimSectionKey}
                    existing={report.feedback.find((f) => f.section === key) ?? null}
                  />
                )}
              </section>
            );
          })}

          {report.sections.funMbtiGuess && <FunMbtiSection guess={report.sections.funMbtiGuess} />}
        </>
      )}
    </main>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return <p className="p-8 text-sm text-neutral-500">{children}</p>;
}
