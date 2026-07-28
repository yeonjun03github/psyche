'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Modal } from '@/components/modal';

export function ResetProgressButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      await api.resetInProgressSessions();
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
        disabled={disabled}
        className="text-sm text-neutral-500 underline disabled:cursor-not-allowed disabled:text-neutral-300 disabled:no-underline dark:disabled:text-neutral-700"
      >
        진행 중인 검사 초기화
      </button>

      {confirming && (
        <Modal>
          <p className="mb-4">
            진행 중인 검사를 모두 취소합니다. <strong>완료된 검사 결과는 삭제되지 않습니다.</strong>
          </p>
          {error && <p className="mb-4 text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {resetting ? '초기화 중...' : '초기화'}
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
