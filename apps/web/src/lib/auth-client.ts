'use client';

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './auth-constants';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const ACCESS_TOKEN_MAX_AGE = 60 * 15; // apps/api JWT_ACCESS_EXPIRES_IN 기본값과 맞춘 상한.
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // JWT_REFRESH_EXPIRES_IN 기본값과 맞춘 상한.

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

function setAuthCookies(tokens: { accessToken: string; refreshToken: string }): void {
  // 백엔드(Railway)와 프론트(Vercel)가 다른 도메인이라 httpOnly 쿠키를 공유할 수 없다 —
  // 대신 일반 쿠키에 담아 서버 컴포넌트(next/headers)와 클라이언트 양쪽에서 읽는다.
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(tokens.accessToken)}; path=/; max-age=${ACCESS_TOKEN_MAX_AGE}; samesite=lax${secure}`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=${encodeURIComponent(tokens.refreshToken)}; path=/; max-age=${REFRESH_TOKEN_MAX_AGE}; samesite=lax${secure}`;
}

export function clearAuthCookies(): void {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=; path=/; max-age=0`;
}

async function postAuth(path: string, body: unknown): Promise<AuthUser> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? '로그인에 실패했습니다.');
  }
  const data = (await response.json()) as AuthResponse;
  setAuthCookies(data);
  return data.user;
}

export const authClient = {
  loginWithPassword: (email: string, password: string) => postAuth('/auth/login', { email, password }),
  loginWithGoogle: (idToken: string) => postAuth('/auth/google', { idToken }),
};
