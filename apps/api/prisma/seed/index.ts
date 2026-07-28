import type { Prisma } from '../../src/generated/prisma';
import { ipip50 } from './data/ipip50';
import { phq9 } from './data/phq9';
import { gad7 } from './data/gad7';
import { pss10 } from './data/pss10';
import { rses } from './data/rses';
import { brs } from './data/brs';
import { who5 } from './data/who5';

export const essentialTestDefinitions: Prisma.TestDefinitionCreateInput[] = [
  ipip50,
  phq9,
  gad7,
  pss10,
  rses,
  brs,
  who5,
];
