import { z } from 'zod';

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
});

export type ReportSections = z.infer<typeof reportSectionsSchema>;

export const reportSectionsJsonSchema = z.toJSONSchema(reportSectionsSchema) as Record<string, unknown>;
