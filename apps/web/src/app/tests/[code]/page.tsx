import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { api, isRedirectError, type SessionDto } from '@/lib/api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-constants';

function ResultCard({ session }: { session: SessionDto }) {
  if (session.subscaleScores.length > 0) {
    return (
      <ul className="flex flex-col gap-2">
        {session.subscaleScores.map((s) => (
          <li
            key={s.name}
            className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800"
          >
            <span>{s.name}</span>
            <span className="text-neutral-500">
              {s.rawScore}점 · {s.band}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="rounded-lg border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
      <p>
        원점수 {session.rawScore}점 · <span className="font-medium">{session.band}</span>
      </p>
    </div>
  );
}

export default async function TestIntroPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const [test, sessions] = await Promise.all([
    api.getTest(code, token).catch((e) => {
      if (isRedirectError(e)) throw e;
      return null;
    }),
    api.getSessions(token),
  ]);
  if (!test) notFound();

  const mySessions = sessions.filter((s) => s.testCode === test.code);
  const inProgress = mySessions.find((s) => s.status === 'IN_PROGRESS');
  const completedHistory = mySessions
    .filter((s) => s.status === 'COMPLETED')
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());
  const everAttempted = mySessions.length > 0;

  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col gap-6 p-8">
      <Link href="/" className="text-sm text-neutral-500">
        ← 대시보드
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{test.name}</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{test.description}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm text-neutral-500">
        <dt>문항 수</dt>
        <dd>{test.questions?.length ?? '-'}문항</dd>
        <dt>예상 소요 시간</dt>
        <dd>약 {test.estimatedMinutes}분</dd>
      </dl>
      {test.license.notice && (
        <p className="rounded-md bg-neutral-100 p-3 text-xs text-neutral-500 dark:bg-neutral-900">
          {test.license.notice}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {inProgress && (
          <Link
            href={`/tests/${test.code}/session`}
            className="inline-block w-fit rounded-lg bg-neutral-900 px-5 py-2.5 text-center text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            진행 중인 검사 이어서 하기
          </Link>
        )}
        <Link
          href={everAttempted ? `/tests/${test.code}/session?restart=1` : `/tests/${test.code}/session`}
          className={
            inProgress
              ? 'inline-block w-fit rounded-lg border border-neutral-300 px-5 py-2.5 text-center text-sm font-medium dark:border-neutral-700'
              : 'inline-block w-fit rounded-lg bg-neutral-900 px-5 py-2.5 text-center text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900'
          }
        >
          {everAttempted ? '다시 검사하기' : '시작하기'}
        </Link>
      </div>

      {completedHistory.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">이전 검사 결과</h2>
          <ul className="flex flex-col gap-3">
            {completedHistory.map((session) => (
              <li key={session.id}>
                <p className="mb-1 text-xs text-neutral-400">
                  {new Date(session.completedAt!).toLocaleString('ko-KR')}
                </p>
                <ResultCard session={session} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
