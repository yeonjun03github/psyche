import type { AIReportSections } from '@psyche/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
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

export interface ReportDto {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  sections: AIReportSections | null;
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
  getTests: () => request<TestSummary[]>('/tests'),
  getTest: (code: string) => request<TestDetail>(`/tests/${code}`),
  startSession: (code: string) => request<SessionDto>(`/tests/${code}/sessions`, { method: 'POST' }),
  restartSession: (code: string) => request<SessionDto>(`/tests/${code}/restart`, { method: 'POST' }),
  getSession: (id: string) => request<SessionDto>(`/sessions/${id}`),
  getSessions: () => request<SessionDto[]>('/sessions'),
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
  createReport: (acknowledgeDateSpanWarning?: boolean) =>
    request<ReportDto>('/reports', { method: 'POST', body: JSON.stringify({ acknowledgeDateSpanWarning }) }),
  getReport: (id: string) => request<ReportDto>(`/reports/${id}`),
  getReports: () => request<ReportDto[]>('/reports'),
  deleteReport: (id: string) => request<void>(`/reports/${id}`, { method: 'DELETE' }),
};
