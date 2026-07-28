'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type SessionDto, type TestDetail } from '@/lib/api';
import { Modal } from '@/components/modal';

export function TestSessionClient({ code, restart }: { code: string; restart: boolean }) {
  const router = useRouter();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [session, setSession] = useState<SessionDto | null>(null);
  const [riskMessage, setRiskMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 개발 모드의 React StrictMode는 effect를 의도적으로 두 번 실행한다. 세션 시작 API는
  // 멱등하지 않으므로(호출할 때마다 진행 중 세션이 없으면 새로 만듦) 가드 없이 두 번 부르면
  // 같은 검사에 진행 중 세션이 중복 생성되어 대시보드에 "완료했는데도 진행 중"으로 보이는
  // 원인이 된다. ref로 최초 1회만 실제 호출되도록 막는다.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    Promise.all([api.getTest(code), restart ? api.restartSession(code) : api.startSession(code)])
      .then(([testDetail, sessionDto]) => {
        setTest(testDetail);
        setSession(sessionDto);
      })
      .catch((e) => setError((e as Error).message));
  }, [code, restart]);

  if (error) {
    return <ErrorView message={error} />;
  }
  if (!test || !session) {
    return <CenteredMessage>불러오는 중...</CenteredMessage>;
  }

  const answeredIds = new Set(session.answers.map((a) => a.questionId));
  const questions = [...test.questions].sort((a, b) => a.order - b.order);
  const nextQuestion = questions.find((q) => !answeredIds.has(q.questionId));
  const progress = answeredIds.size;

  async function handleAnswer(value: number) {
    if (!nextQuestion || !session) return;
    try {
      const result = await api.saveAnswer(session.id, nextQuestion.questionId, value);
      setSession(result.session);
      if (result.riskFlag && result.message) {
        setRiskMessage(result.message);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleSubmit() {
    if (!session) return;
    setSubmitting(true);
    try {
      await api.submitSession(session.id);
      router.push(`/tests/${code}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col gap-6 p-8">
      <div>
        <p className="text-sm text-neutral-500">
          {test.name} · {progress}/{questions.length}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100"
            style={{ width: `${(progress / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {nextQuestion ? (
        <div className="flex flex-col gap-4">
          <p className="text-lg">{nextQuestion.text}</p>
          <div className="flex flex-col gap-2">
            {nextQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className="rounded-lg border border-neutral-200 px-4 py-3 text-left text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500">모든 문항에 응답했습니다.</p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {submitting ? '제출 중...' : '제출하기'}
          </button>
        </div>
      )}

      {riskMessage && <RiskModal message={riskMessage} onClose={() => setRiskMessage(null)} />}
    </main>
  );
}

function RiskModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <Modal>
      <p className="mb-4">{message}</p>
      <p className="mb-4 text-neutral-500">
        자살예방상담전화 1393 · 정신건강 상담전화 1577-0199 · 생명의전화 1588-9191
      </p>
      <button
        onClick={onClose}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        확인했습니다
      </button>
    </Modal>
  );
}

function ErrorView({ message }: { message: string }) {
  return <CenteredMessage>오류가 발생했습니다: {message}</CenteredMessage>;
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 items-center justify-center p-8 text-sm text-neutral-500">{children}</main>;
}
