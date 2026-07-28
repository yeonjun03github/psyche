'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type ReportDto } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기 중',
  PROCESSING: '생성 중',
  COMPLETED: '완료',
  FAILED: '실패',
};

export function ReportListItem({ report }: { report: ReportDto }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteReport(report.id);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
        <span>이 리포트를 삭제하시겠습니까? 되돌릴 수 없습니다.</span>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-red-600 px-3 py-1 text-white disabled:opacity-50"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="rounded-md border border-neutral-300 px-3 py-1 dark:border-neutral-700"
          >
            취소
          </button>
        </div>
        {error && <p className="text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
      <Link href={`/reports/${report.id}`} className="flex flex-1 items-center justify-between hover:underline">
        <span>{new Date(report.createdAt).toLocaleString('ko-KR')}</span>
        <span className="text-neutral-500">{STATUS_LABEL[report.status]}</span>
      </Link>
      <button
        onClick={() => setConfirming(true)}
        className="text-neutral-400 hover:text-red-600"
        aria-label="리포트 삭제"
      >
        삭제
      </button>
    </div>
  );
}
