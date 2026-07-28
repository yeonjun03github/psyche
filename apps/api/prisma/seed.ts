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

/** 개인용 도구이므로 공개 회원가입이 없다 — 유일한 계정을 여기서만 생성한다. */
async function seedOwnerUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? 'me@psyche.local';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme123!';
  const name = process.env.ADMIN_NAME ?? 'Owner';

  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log(`계정이 이미 존재합니다: ${existing.email}`);
    return;
  }

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });
  console.log(`계정 생성 완료: ${user.email}`);
}

async function main(): Promise<void> {
  await seedTestDefinitions();
  await seedOwnerUser();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
