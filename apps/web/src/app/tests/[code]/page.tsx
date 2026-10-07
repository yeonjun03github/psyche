import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { api, isRedirectError, type SessionDto, type TestDetail } from '@/lib/api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-constants';

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatRaw(value: number, range?: { min: number; max: number }): string {
  return range ? `${formatNumber(value)}점 (범위 ${formatNumber(range.min)}–${formatNumber(range.max)})` : `${formatNumber(value)}점`;
}

/**
 * 완료한 응시 한 건의 결과. 원점수는 항상 범위와 함께 보여주고, 해석 구간(band)은 검사에 확립된 기준이
 * 있을 때만 표시한다. 하위척도·보조 점수(예: SHAPS 이분 점수)도 전체 점수와 따로 보존해서 보여준다.
 */
function ResultCard({ session, test }: { session: SessionDto; test: TestDetail }) {
  const ranges = test.scoreRanges;
  const hasCutoff = test.meta?.hasCutoff;
  const rows: { key: string; label: string; value: string; band: string | null }[] = [];

  if (session.rawScore !== null) {
    rows.push({
      key: 'overall',
      label: ranges?.scoreLabel ?? '원점수',
      value: formatRaw(session.rawScore, ranges?.overall ?? undefined),
      band: session.band,
    });
  }
  for (const s of session.subscaleScores) {
    rows.push({
      key: `sub-${s.name}`,
      label: s.name,
      value: formatRaw(s.rawScore, ranges?.subscales.find((r) => r.name === s.name)),
      band: s.band,
    });
  }
  for (const a of session.alternateScores ?? []) {
    rows.push({
      key: `alt-${a.key}`,
      label: a.name,
      value: formatRaw(a.rawScore, ranges?.alternateScores.find((r) => r.key === a.key)),
      band: a.band,
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800"
        >
          <span>{row.label}</span>
          <span className="text-right text-neutral-500">
            {row.value}
            {row.band ? (
              <>
                {' · '}
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{row.band}</span>
              </>
            ) : hasCutoff === false ? (
              <span className="block text-xs text-neutral-400">확립된 해석 기준(절단점) 없음</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 측정 개념·점수 방향·번역 상태·주의사항. 비공식 번역이면 숨기지 않고 눈에 띄게 알린다. */
function TestMetaNotice({ meta }: { meta: NonNullable<TestDetail['meta']> }) {
  const unofficial = meta.translationStatus === 'UNOFFICIAL_TRANSLATION';
  return (
    <div className="flex flex-col gap-2 text-xs text-neutral-500">
      {unofficial && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <span className="font-medium">비공식 번역본입니다.</span>{' '}
          {meta.translationNote ?? '한국어판의 신뢰도·타당도가 검증되지 않았습니다.'}
        </p>
      )}
      {!unofficial && meta.translationNote && <p>{meta.translationNote}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt>측정 개념</dt>
        <dd>{meta.concept}</dd>
        <dt>점수 방향</dt>
        <dd>{meta.scoreDirection}</dd>
        <dt>절단점</dt>
        <dd>{meta.hasCutoff ? '일부 점수에만 있음(결과 화면 참고)' : '없음'}</dd>
      </dl>
      {meta.interpretationCaveats.length > 0 && (
        <ul className="list-disc pl-4">
          {meta.interpretationCaveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      )}
      <p>이 결과는 자가 보고 척도 점수일 뿐 임상적 진단이 아닙니다.</p>
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
      {test.meta && <TestMetaNotice meta={test.meta} />}
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
                <ResultCard session={session} test={test} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
