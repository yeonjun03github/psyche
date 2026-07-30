import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { OAuth2Client } from 'google-auth-library';
import type { EnvConfig } from '../../config/env.validation';
import type { Role, User } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: { id: string; email: string; name: string; role: Role };
}

interface RefreshTokenPayload {
  sub: string;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {
    this.googleClient = new OAuth2Client(this.config.get('GOOGLE_CLIENT_ID', { infer: true }));
  }

  async loginWithPassword(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    return this.issueTokens(user);
  }

  async loginWithGoogle(idToken: string): Promise<AuthResult> {
    const ticket = await this.googleClient
      .verifyIdToken({ idToken, audience: this.config.get('GOOGLE_CLIENT_ID', { infer: true }) })
      .catch(() => null);
    const payload = ticket?.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Google 인증에 실패했습니다.');
    }

    const user = await this.findOrCreateGoogleUser(payload.sub, payload.email, payload.name ?? payload.email);
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('리프레시 토큰이 유효하지 않거나 만료되었습니다.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('계정을 찾을 수 없습니다.');
    }
    return this.signTokenPair(user.id, user.role);
  }

  /** googleId로 못 찾으면 이메일로 기존 계정(예: 비밀번호로 만든 admin)에 연동하고, 그마저 없으면 새로 만든다. */
  private async findOrCreateGoogleUser(googleId: string, email: string, name: string): Promise<User> {
    const existingByGoogleId = await this.prisma.user.findUnique({ where: { googleId } });
    if (existingByGoogleId) {
      return existingByGoogleId;
    }

    const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      return this.prisma.user.update({ where: { id: existingByEmail.id }, data: { googleId } });
    }

    const adminEmail = this.config.get('ADMIN_EMAIL', { infer: true });
    return this.prisma.user.create({
      data: { email, name, googleId, role: email === adminEmail ? 'ADMIN' : 'USER' },
    });
  }

  private issueTokens(user: User): AuthResult {
    return { ...this.signTokenPair(user.id, user.role), user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  private signTokenPair(userId: string, role: Role): TokenPair {
    const accessToken = this.jwtService.sign(
      { sub: userId, role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
      },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
      },
    );
    return { accessToken, refreshToken };
  }
}
