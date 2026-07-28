import Link from 'next/link';
import { api } from '@/lib/api';
import { ResetProgressButton } from './reset-progress-button';
import { ResetAllButton } from './reset-all-button';

/**
 * 대시보드에 보여줄 대표 세션을 고른다. ABANDONED는 "무효화된 시도"라 대표로 삼지 않는다 —
 * 진행 중인 세션이 있으면 그것을, 없으면 가장 최근에 완료된 세션을 대표로 보여준다.
 * (완료된 검사를 초기화해도 결과 자체는 지워지지 않으므로 "시작 전"으로 보이면 안 된다.)
 */
function representativeSessionByCode(sessions: Awaited<ReturnType<typeof api.getSessions>>, code: string) {
  const forCode = sessions.filter((s) => s.testCode === code);
  const inProgress = forCode.find((s) => s.status === 'IN_PROGRESS');
  if (inProgress) return inProgress;

  return forCode
    .filter((s) => s.status === 'COMPLETED')
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())[0];
}

export default async function Home() {
  const [tests, sessions, reports] = await Promise.all([
    api.getTests(),
    api.getSessions(),
    api.getReports(),
  ]);

  const essentialTests = tests.filter((t) => t.category === 'ESSENTIAL');
  const completedCount = essentialTests.filter(
    (t) => representativeSessionByCode(sessions, t.code)?.status === 'COMPLETED',
  ).length;
  const canCreateReport = completedCount === essentialTests.length;
  const hasInProgress = essentialTests.some(
    (t) => representativeSessionByCode(sessions, t.code)?.status === 'IN_PROGRESS',
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Psyche</h1>
        <p className="mt-1 text-sm text-neutral-500">
          여러 심리검사 결과를 AI가 통합 해석하는 심리 리포트 플랫폼
        </p>
      </header>

      <section>
        <div className="mb-3 flex flex-col items-start gap-1">
          <h2 className="text-lg font-medium">필수 검사 ({completedCount}/{essentialTests.length})</h2>
          <ResetProgressButton disabled={!hasInProgress} />
          <ResetAllButton />
        </div>
        <ul className="flex flex-col gap-2">
          {essentialTests.map((test) => {
            const session = representativeSessionByCode(sessions, test.code);
            const status = session?.status ?? 'NOT_STARTED';
            const label =
              status === 'COMPLETED' ? `완료 (${session!.band ?? '결과 확인'})` : status === 'IN_PROGRESS' ? '진행 중' : '시작 전';

            return (
              <li key={test.code}>
                <Link
                  href={`/tests/${test.code}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <span>{test.name}</span>
                  <span className="text-neutral-500">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">통합 리포트</h2>
        {canCreateReport ? (
          <Link
            href="/reports"
            className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            리포트 생성하기
          </Link>
        ) : (
          <p className="text-sm text-neutral-500">필수 검사를 모두 완료하면 통합 리포트를 생성할 수 있습니다.</p>
        )}
        {reports.length > 0 && (
          <Link href="/reports" className="mt-3 block text-sm text-neutral-500 underline">
            지난 리포트 보기 ({reports.length})
          </Link>
        )}
      </section>
    </main>
  );
}
