import Link from 'next/link';
import { cookies } from 'next/headers';
import { api, type AdminReportStats } from '@/lib/api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-constants';

function formatSeconds(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}초`;
}

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(0)}%`;
}

export default async function AdminPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;

  let stats: AdminReportStats | null = null;
  let error: string | null = null;
  try {
    stats = await api.getAdminReportStats(token);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-8 p-8">
      <div>
        <Link href="/" className="text-sm text-neutral-500">
          ← 홈으로
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">관리자 — 리포트 생성 현황</h1>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {stats && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="총 리포트" value={String(stats.totalReports)} />
            <StatCard label="성공률" value={formatPercent(stats.successRate)} />
            <StatCard label="평균 소요시간" value={formatSeconds(stats.averageDurationSeconds)} />
            <StatCard
              label="최소 ~ 최대"
              value={`${formatSeconds(stats.minDurationSeconds)} ~ ${formatSeconds(stats.maxDurationSeconds)}`}
            />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium">상태별 건수</h2>
            <ul className="flex flex-wrap gap-2">
              {stats.byStatus.map((s) => (
                <li
                  key={s.status}
                  className="rounded-full border border-neutral-200 px-3 py-1 text-sm dark:border-neutral-800"
                >
                  {s.status} {s.count}건
                </li>
              ))}
              {stats.byStatus.length === 0 && <li className="text-sm text-neutral-400">데이터 없음</li>}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium">모델별 통계</h2>
            <div className="overflow-x-auto rounded-lg border border-neutral-200 text-sm dark:border-neutral-800">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
                    <th className="px-3 py-2 font-normal">Provider / Model</th>
                    <th className="px-3 py-2 font-normal">건수</th>
                    <th className="px-3 py-2 font-normal">평균 소요시간</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byModel.map((m) => (
                    <tr
                      key={`${m.aiProvider}-${m.aiModel}`}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
                    >
                      <td className="px-3 py-2">
                        {m.aiProvider} / {m.aiModel}
                      </td>
                      <td className="px-3 py-2">{m.count}</td>
                      <td className="px-3 py-2">{formatSeconds(m.averageDurationSeconds)}</td>
                    </tr>
                  ))}
                  {stats.byModel.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-neutral-400" colSpan={3}>
                        데이터 없음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium">최근 실패 ({stats.recentFailures.length})</h2>
            {stats.recentFailures.length === 0 ? (
              <p className="text-sm text-neutral-500">최근 실패한 리포트가 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {stats.recentFailures.map((f) => (
                  <li key={f.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                    <div className="flex items-center justify-between text-neutral-500">
                      <span>{new Date(f.createdAt).toLocaleString('ko-KR')}</span>
                      <span>
                        {f.aiProvider ?? '—'} / {f.aiModel ?? '—'}
                      </span>
                    </div>
                    <p className="mt-1">{f.failureReason ?? '사유 없음'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
