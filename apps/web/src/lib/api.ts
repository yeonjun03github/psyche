import { redirect } from 'next/navigation';
import type { AIReportSections, ClaimSectionKey, DailyQuote, FeedbackVerdict, SectionFeedback } from '@psyche/shared';
import { ACCESS_TOKEN_COOKIE } from './auth-constants';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

/**
 * 브라우저(클라이언트 컴포넌트)에서만 동작한다 — 서버 컴포넌트는 `next/headers`의 cookies()로
 * 직접 읽은 토큰을 각 api.* 호출의 마지막 인자로 넘겨야 한다(이 파일은 클라이언트 번들에도
 * 포함되므로 next/headers를 여기서 import할 수 없다).
 */
function getBrowserToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ACCESS_TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * redirect()가 던지는 NEXT_REDIRECT 에러는 절대 .catch()로 삼키면 안 된다(리다이렉트가
 * 무효화됨) — request()를 감싼 .catch()가 있는 호출부에서는 반드시 이걸로 걸러 재던져야 한다.
 */
export function isRedirectError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'digest' in error && String((error as { digest: unknown }).digest).startsWith('NEXT_REDIRECT');
}

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const authToken = token ?? getBrowserToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  if (response.status === 401) {
    // redirect()는 렌더링 중(서버 컴포넌트)에서만 동작한다 — 이 함수는 useEffect 콜백 등
    // 이벤트 핸들러성 컨텍스트(클라이언트)에서도 호출되므로 그 경우 하드 네비게이션으로 대체한다.
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
      return new Promise<T>(() => {}); // 페이지 이동이 시작된 뒤로는 호출부가 이어받지 않게 한다.
    }
    redirect('/login');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `요청 실패 (${response.status})`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export interface TestSummary {
  id: string;
  code: string;
  name: string;
  category: 'ESSENTIAL' | 'OPTIONAL';
  description: string;
  estimatedMinutes: number;
  license: { required: boolean; notice?: string; url?: string };
}

export interface QuestionOption {
  value: number;
  label: string;
}

export interface Question {
  questionId: string;
  order: number;
  text: string;
  type: string;
  options: QuestionOption[];
  reverseScored: boolean;
}

export interface TestDetail extends TestSummary {
  responseScaleMin: number;
  responseScaleMax: number;
  questions: Question[];
}

export interface SubscaleScore {
  name: string;
  rawScore: number;
  band: string;
}

export interface Answer {
  questionId: string;
  value: number;
  answeredAt: string;
}

export interface SessionDto {
  id: string;
  userId: string;
  testCode: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  answers: Answer[];
  currentPosition: number;
  startedAt: string;
  completedAt: string | null;
  rawScore: number | null;
  band: string | null;
  subscaleScores: SubscaleScore[];
  riskTriggered: boolean;
}

export interface SaveAnswerResult {
  session: SessionDto;
  riskFlag: boolean;
  message: string | null;
}

export interface TestDiff {
  testCode: string;
  previousNormalizedScore: number | null;
  currentNormalizedScore: number | null;
  delta: number | null;
  previousBand: string | null;
  currentBand: string | null;
  subscaleDiffs: { name: string; previousNormalizedScore: number; currentNormalizedScore: number; delta: number }[];
}

export interface ComparisonSummary {
  daysSincePrevious: number;
  testDiffs: TestDiff[];
}

export interface TestScoreItem {
  testCode: string;
  testName: string;
  normalizedScore: number | null;
  band: string | null;
  subscaleScores: { name: string; normalizedScore: number; band: string }[];
}

export interface ReportDto {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  context: string | null;
  sections: AIReportSections | null;
  feedback: SectionFeedback[];
  /** findOne(상세 조회)에서만 채워진다 — 목록 조회에는 없다. 리포트 서술은 점수를 본문에 나열하지
   *  않도록 지시받아서, 실제 검사 점수는 여기서 별도로 노출한다. */
  testScores?: TestScoreItem[];
  /** findOne(상세 조회)에서만 즉석 계산되어 채워진다 — 목록 조회에는 없다 */
  comparisonSummary?: ComparisonSummary | null;
  /** findOne(상세 조회)에서만 dailyQuoteId를 검증된 명언 목록으로 조회해 채워진다 */
  dailyQuote?: DailyQuote | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ReportPreviewItem {
  testCode: string;
  testName: string;
  sessionId: string;
  completedAt: string;
  band: string | null;
  rawScore: number | null;
}

export interface ReportPreviewDto {
  items: ReportPreviewItem[];
  missingTestCodes: string[];
  ready: boolean;
  dateSpanDays: number;
  warningThresholdDays: number;
  requiresConfirmation: boolean;
}

export const api = {
  // 서버 컴포넌트(page.tsx)에서 호출할 때만 두 번째 인자로 next/headers의 cookies()에서 읽은
  // 토큰을 넘긴다 — 클라이언트 컴포넌트는 생략하면 request()가 document.cookie에서 알아서 읽는다.
  getTests: (token?: string) => request<TestSummary[]>('/tests', undefined, token),
  getTest: (code: string, token?: string) => request<TestDetail>(`/tests/${code}`, undefined, token),
  startSession: (code: string) => request<SessionDto>(`/tests/${code}/sessions`, { method: 'POST' }),
  restartSession: (code: string) => request<SessionDto>(`/tests/${code}/restart`, { method: 'POST' }),
  getSession: (id: string) => request<SessionDto>(`/sessions/${id}`),
  getSessions: (token?: string) => request<SessionDto[]>('/sessions', undefined, token),
  saveAnswer: (sessionId: string, questionId: string, value: number) =>
    request<SaveAnswerResult>(`/sessions/${sessionId}/answers`, {
      method: 'PATCH',
      body: JSON.stringify({ questionId, value }),
    }),
  submitSession: (sessionId: string) =>
    request<SessionDto>(`/sessions/${sessionId}/submit`, { method: 'POST' }),
  resetInProgressSessions: () => request<{ abandonedCount: number }>('/sessions/reset', { method: 'POST' }),
  resetAllSessions: () =>
    request<{ deletedSessionCount: number; deletedPersonModelCount: number; deletedReportCount: number }>(
      '/sessions/reset-all',
      { method: 'POST' },
    ),
  getReportPreview: () => request<ReportPreviewDto>('/reports/preview'),
  createReport: (payload: { acknowledgeDateSpanWarning?: boolean; context?: string }) =>
    request<ReportDto>('/reports', { method: 'POST', body: JSON.stringify(payload) }),
  getReport: (id: string) => request<ReportDto>(`/reports/${id}`),
  getReports: (token?: string) => request<ReportDto[]>('/reports', undefined, token),
  deleteReport: (id: string) => request<void>(`/reports/${id}`, { method: 'DELETE' }),
  submitReportFeedback: (reportId: string, payload: { section: ClaimSectionKey; verdict: FeedbackVerdict; note?: string }) =>
    request<ReportDto>(`/reports/${reportId}/feedback`, { method: 'PATCH', body: JSON.stringify(payload) }),
};
