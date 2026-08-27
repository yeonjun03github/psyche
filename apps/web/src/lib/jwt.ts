/**
 * 화면에 "관리자" 메뉴를 보여줄지 결정하는 용도로만 쓴다 — 서명 검증 없이 payload만 읽는다.
 * 실제 접근 제어는 항상 API(JwtAuthGuard + role 체크)가 한다.
 */
export function decodeAccessTokenRole(token: string | undefined): 'ADMIN' | 'USER' | undefined {
  if (!token) return undefined;
  try {
    const payloadSegment = token.split('.')[1];
    const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { role?: string };
    return payload.role === 'ADMIN' || payload.role === 'USER' ? payload.role : undefined;
  } catch {
    return undefined;
  }
}
