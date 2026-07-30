import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** JwtAuthGuard(전역)를 건너뛰고 인증 없이 접근을 허용한다. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
