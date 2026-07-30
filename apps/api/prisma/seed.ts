import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma';
import { essentialTestDefinitions } from './seed/index';

const prisma = new PrismaClient();

async function seedTestDefinitions(): Promise<void> {
  for (const testDefinition of essentialTestDefinitions) {
    const { code, ...data } = testDefinition;
    await prisma.testDefinition.upsert({
      where: { code },
      create: testDefinition,
      update: data,
    });
    console.log(`시드 완료: ${code}`);
  }
}

/** 비밀번호 로그인이 가능한 유일한 관리자 계정을 생성한다. 일반 사용자는 Google 로그인으로 가입한다. */
async function seedOwnerUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? 'me@psyche.local';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme123!';
  const name = process.env.ADMIN_NAME ?? 'Owner';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`계정이 이미 존재합니다: ${existing.email}`);
    return;
  }

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name, role: 'ADMIN' } });
  console.log(`계정 생성 완료: ${user.email}`);
}

/**
 * Auth 도입 전(role 필드가 스키마에 없던 시절)에 만들어진 기존 User 문서에는
 * role이 아예 없다 — Prisma는 필수 필드가 없는 문서를 읽을 때 실패하므로, 타입 레이어를
 * 우회하는 raw 커맨드로 한 번만 채워준다(이미 role이 있으면 대상이 없어 아무 일도 안 함).
 */
async function backfillMissingRole(): Promise<void> {
  const result = await prisma.$runCommandRaw({
    update: 'users',
    updates: [{ q: { role: { $exists: false } }, u: { $set: { role: 'ADMIN' } }, multi: true }],
  });
  const modified = (result as { nModified?: number }).nModified ?? 0;
  if (modified > 0) {
    console.log(`role 필드 백필 완료: ${modified}건`);
  }
}

async function main(): Promise<void> {
  await seedTestDefinitions();
  await seedOwnerUser();
  await backfillMissingRole();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
