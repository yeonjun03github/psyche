import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { EnvConfig } from '../../../config/env.validation';
import type { Role } from '../../../generated/prisma';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
    if (!token) {
      throw new UnauthorizedException('인증 토큰이 없습니다.');
    }

    try {
      request.user = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      return true;
    } catch {
      throw new UnauthorizedException('토큰이 유효하지 않거나 만료되었습니다.');
    }
  }
}
