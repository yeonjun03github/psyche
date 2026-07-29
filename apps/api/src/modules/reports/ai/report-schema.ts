import { z } from 'zod';
import { CLAIM_SECTION_KEYS, MBTI_TYPES } from '@psyche/shared';

const claimConfidenceSchema = z.object({
  section: z.enum(CLAIM_SECTION_KEYS),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  evidence: z.array(z.string()), // 근거로 삼은 testCode들 — confidence가 낮으면 비어있을 수 있음
  reason: z.string().nullable(), // nullable(optional 아님): OpenAI strict 모드가 모든 키를 required로 요구
});

const mbtiCandidateSchema = z.object({
  type: z.enum(MBTI_TYPES),
  percentage: z.number().min(0).max(100),
});

/** 재미 보너스 이스터에그 — 항상 서로 다른 유형 3개를 제시해 하나로 단정하지 않도록 강제한다. */
const funMbtiGuessSchema = z.object({
  topCandidates: z.array(mbtiCandidateSchema).length(3),
  reasoning: z.string().min(1),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

/**
 * packages/shared/src/types/ai-report.ts의 AIReportSections와 1:1 대응된다.
 * AIProvider가 반환한 JSON은 반드시 이 스키마를 통과해야 AIReport.sections에 저장된다.
 */
export const reportSectionsSchema = z.object({
  overallSummary: z.string().min(1),
  personalityProfile: z.string().min(1),
  currentMentalHealthStatus: z.string().min(1),
  primaryConcern: z.string().min(1),
  primaryStrength: z.string().min(1),
  crossTestCorrelations: z.string().min(1),
  possibleCausalHypotheses: z.string().min(1),
  maintainingFactors: z.string().min(1),
  aggravatingFactors: z.string().min(1),
  highestLeverageChangeFactor: z.string().min(1),
  priorityIssues: z.string().min(1),
  improvementRoadmap: z.string().min(1),
  metricsToTrack: z.string().min(1),
  recommendedRetestTiming: z.string().min(1),
  // 이전 PersonModel이 없으면(첫 리포트) 5개 전부 null이어야 한다 — processor에서 방어적으로도 강제한다.
  changesSincePrevious: z.string().nullable(),
  improvedAreas: z.string().nullable(),
  worsenedAreas: z.string().nullable(),
  unchangedAreas: z.string().nullable(),
  areasToWatch: z.string().nullable(),
  claimsConfidence: z.array(claimConfidenceSchema),
  funMbtiGuess: funMbtiGuessSchema,
});

export type ReportSections = z.infer<typeof reportSectionsSchema>;

export const reportSectionsJsonSchema = z.toJSONSchema(reportSectionsSchema) as Record<string, unknown>;
