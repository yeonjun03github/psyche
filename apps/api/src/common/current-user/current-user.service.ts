import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 개인용 도구 범위에서는 사용자가 정확히 1명이므로, 실제 JWT 인증(Phase 8)이
 * 붙기 전까지는 이 서비스가 그 유일한 User를 "현재 사용자"로 반환한다.
 * 이후 Auth가 구현되면 이 서비스만 요청 컨텍스트의 인증된 사용자로 교체하면 되고,
 * 이를 사용하는 Sessions/Reports 등의 코드는 변경할 필요가 없다.
 */
@Injectable()
export class CurrentUserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserId(): Promise<string> {
    const user = await this.prisma.user.findFirst();
    if (!user) {
      throw new InternalServerErrorException(
        '계정이 존재하지 않습니다. `pnpm prisma:seed`로 계정을 먼저 생성하세요.',
      );
    }
    return user.id;
  }
}
