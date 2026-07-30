import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth-constants';

const PUBLIC_PATHS = ['/login'];
const ACCESS_TOKEN_MAX_AGE = 60 * 15; // JWT_ACCESS_EXPIRES_IN 기본값(15m)과 맞춘 상한.
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // JWT_REFRESH_EXPIRES_IN 기본값(7d)과 맞춘 상한.

/** signature 검증은 하지 않는다 — 만료 여부만 보고 선제적으로 갱신할지 판단하는 용도. */
function isExpiredOrInvalid(token: string): boolean {
  try {
    const payloadSegment = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadSegment, 'base64').toString('utf-8')) as { exp?: number };
    if (typeof payload.exp !== 'number') return true;
    return Date.now() >= payload.exp * 1000 - 5_000; // 5초 여유
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken && !isExpiredOrInvalid(accessToken)) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
    const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!refreshResponse.ok) {
      throw new Error('refresh failed');
    }
    const tokens = (await refreshResponse.json()) as { accessToken: string; refreshToken: string };

    // 갱신된 토큰을 현재 요청에도 즉시 반영해야 서버 컴포넌트가 만료된 쿠키를 읽지 않는다.
    request.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken);
    const response = NextResponse.next({ request });
    response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE,
      sameSite: 'lax',
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      sameSite: 'lax',
    });
    return response;
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
