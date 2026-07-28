import { TestSessionClient } from './session-client';

export default async function TestSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ restart?: string }>;
}) {
  const { code } = await params;
  const { restart } = await searchParams;
  return <TestSessionClient code={code} restart={restart === '1'} />;
}
