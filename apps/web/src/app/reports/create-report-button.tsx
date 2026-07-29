'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type ReportPreviewDto } from '@/lib/api';

type Step = 'idle' | 'previewing' | 'confirming' | 'creating';

export function CreateReportButton() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [preview, setPreview] = useState<ReportPreviewDto | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [context, setContext] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleOpenPreview() {
    setStep('previewing');
    setError(null);
    try {
      const result = await api.getReportPreview();
      setPreview(result);
      setAcknowledged(false);
      setStep('confirming');
    } catch (e) {
      setError((e as Error).message);
      setStep('idle');
    }
  }

  async function handleConfirm() {
    setStep('creating');
    try {
      const report = await api.createReport({
        acknowledgeDateSpanWarning: preview?.requiresConfirmation ? acknowledged : undefined,
        context: context.trim() || undefined,
      });
      router.push(`/reports/${report.id}`);
    } catch (e) {
      setError((e as Error).message);
      setStep('confirming');
    }
  }

  if (step === 'idle' || step === 'previewing') {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={handleOpenPreview}
          disabled={step === 'previewing'}
          className="inline-block w-fit rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {step === 'previewing' ? '확인 중...' : '새 리포트 생성하기'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (!preview) return null;

  if (!preview.ready) {
    return (
      <div className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
        <p className="mb-2 font-medium">아직 완료하지 않은 필수 검사가 있습니다.</p>
        <p className="text-neutral-500">{preview.missingTestCodes.join(', ')}</p>
        <button onClick={() => setStep('idle')} className="mt-3 text-sm underline">
          닫기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div>
        <p className="mb-2 text-sm font-medium">다음 검사 결과로 리포트를 생성합니다</p>
        <ul className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          {preview.items.map((item) => (
            <li key={item.testCode} className="flex justify-between">
              <span>{item.testName}</span>
              <span className="text-neutral-400">{new Date(item.completedAt).toLocaleDateString('ko-KR')}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          참고 메모 <span className="font-normal text-neutral-500">(선택, 다음 리포트에 재사용되지 않습니다)</span>
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="예: 최근 이직 준비 중, 시험 기간, 가족 갈등, 수면 문제 등"
          className="w-full rounded-lg border border-neutral-200 p-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
        />
      </div>

      {preview.requiresConfirmation && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="mb-2">
            검사들을 완료한 시점 사이 간격이 {preview.dateSpanDays}일로 넓습니다 (기준: {preview.warningThresholdDays}
            일). 서로 다른 시기의 상태가 섞여 리포트가 부정확할 수 있습니다.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            이 점을 확인했으며 그래도 생성하겠습니다
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={step === 'creating' || (preview.requiresConfirmation && !acknowledged)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {step === 'creating' ? '생성 요청 중...' : '생성하기'}
        </button>
        <button onClick={() => setStep('idle')} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
          취소
        </button>
      </div>
    </div>
  );
}
