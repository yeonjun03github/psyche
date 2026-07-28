'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Modal } from '@/components/modal';

export function ResetAllButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      await api.resetAllSessions();
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-600 underline hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
      >
        검사 결과 모두 초기화
      </button>

      {confirming && (
        <Modal>
          <p className="mb-4">
            <strong className="text-red-600 dark:text-red-500">완료된 결과를 포함해</strong> 모든 검사 응시 기록과
            지금까지 생성된 통합 리포트가 전부 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          {error && <p className="mb-4 text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {resetting ? '삭제 중...' : '모두 삭제'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={resetting}
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
            >
              취소
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
