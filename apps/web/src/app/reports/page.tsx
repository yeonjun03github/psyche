import Link from 'next/link';
import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-constants';
import { CreateReportButton } from './create-report-button';
import { ReportListItem } from './report-list-item';

export default async function ReportsPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const reports = await api.getReports(token);

  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col gap-6 p-8">
      <Link href="/" className="text-sm text-neutral-500">
        ← 대시보드
      </Link>
      <h1 className="text-2xl font-semibold">통합 리포트</h1>

      <CreateReportButton />

      <ul className="flex flex-col gap-2">
        {reports.map((report) => (
          <li key={report.id}>
            <ReportListItem report={report} />
          </li>
        ))}
        {reports.length === 0 && <p className="text-sm text-neutral-500">아직 생성된 리포트가 없습니다.</p>}
      </ul>
    </main>
  );
}
