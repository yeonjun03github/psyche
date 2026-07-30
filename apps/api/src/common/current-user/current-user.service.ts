import { Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../modules/auth/guards/jwt-auth.guard';

/**
 * 요청 스코프(REQUEST)로 동작한다 — JwtAuthGuard(전역)가 request.user에 채워 넣은
 * 인증된 사용자를 그대로 반환한다. Sessions/Reports 등 이 서비스의 소비자는
 * Auth 도입 전후로 코드를 바꿀 필요가 없도록 getUserId()의 시그니처를 유지한다.
 */
@Injectable({ scope: Scope.REQUEST })
export class CurrentUserService {
  constructor(@Inject(REQUEST) private readonly request: Request & { user?: AccessTokenPayload }) {}

  async getUserId(): Promise<string> {
    if (!this.request.user) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }
    return this.request.user.sub;
  }
}
