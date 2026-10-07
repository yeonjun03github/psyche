import type { Prisma } from '../../src/generated/prisma';
import { ipip50 } from './data/ipip50';
import { phq9 } from './data/phq9';
import { gad7 } from './data/gad7';
import { pss10 } from './data/pss10';
import { rses } from './data/rses';
import { brs } from './data/brs';
import { who5 } from './data/who5';
import { aes } from './data/aes';
import { als18 } from './data/als18';
import { shaps } from './data/shaps';

export const essentialTestDefinitions: Prisma.TestDefinitionCreateInput[] = [
  ipip50,
  phq9,
  gad7,
  pss10,
  rses,
  brs,
  who5,
];

/** 선택 검사 — 필수 검사를 모두 마치지 않아도 응시할 수 있고, 완료하면 통합 리포트 입력에 함께 포함된다. */
export const optionalTestDefinitions: Prisma.TestDefinitionCreateInput[] = [aes, als18, shaps];

export const allTestDefinitions: Prisma.TestDefinitionCreateInput[] = [
  ...essentialTestDefinitions,
  ...optionalTestDefinitions,
];
