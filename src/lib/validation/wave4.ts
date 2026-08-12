import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════
// Phase 1: Alerts & Notifications
// ═══════════════════════════════════════════════════════════════════

const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
const PositionSchema = z.enum(['governador', 'senador', 'presidencial']);
const NotificationChannelSchema = z.enum(['slack', 'email', 'log']);
const DiscrepancyTypeSchema = z.enum(['missing_in_research', 'missing_in_tse', 'name_mismatch', 'status_change']);
const DiscrepancyStatusSchema = z.enum(['verified', 'dismissed', 'escalated', 'pending']);

export const AnomalySchema = z.object({
  state: z.string().length(2).toUpperCase(),
  position: PositionSchema,
  candidateName: z.string().min(1),
  researchPercentage: z.number().min(0).max(100),
  aggregatedPercentage: z.number().min(0).max(100),
  deviation: z.number().min(0),
  confidence: z.number().min(0).max(1),
  severity: SeveritySchema,
  timestamp: z.string().datetime(),
});

export const AnomalyAlertSchema = z.object({
  anomaly: AnomalySchema,
  channels: z.array(NotificationChannelSchema).min(1),
  emailRecipients: z.array(z.string().email()).optional(),
  slackMentions: z.array(z.string()).optional(),
});

export const DiscrepancyCreateSchema = z.object({
  state: z.string().length(2).toUpperCase(),
  position: PositionSchema,
  candidateName: z.string().min(1),
  type: DiscrepancyTypeSchema,
  description: z.string().min(1),
  severity: SeveritySchema,
  notes: z.string().optional(),
});

export const DiscrepancyUpdateSchema = z.object({
  status: DiscrepancyStatusSchema.optional(),
  notes: z.string().optional(),
  resolvedBy: z.string().optional(),
});

export const DiscrepancyFilterSchema = z.object({
  state: z.string().length(2).toUpperCase().optional(),
  position: PositionSchema.optional(),
  severity: SeveritySchema.optional(),
  status: DiscrepancyStatusSchema.optional(),
  type: DiscrepancyTypeSchema.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ═══════════════════════════════════════════════════════════════════
// Phase 2: Approval & Regional Aggregation
// ═══════════════════════════════════════════════════════════════════

const RegionSchema = z.enum(['norte', 'nordeste', 'centro-oeste', 'sudeste', 'sul']);

export const ApprovalMetricsQuerySchema = z.object({
  position: PositionSchema,
  state: z.string().length(2).toUpperCase().optional(),
  days: z.coerce.number().min(1).max(365).default(30),
});

export const RegionalAggregationQuerySchema = z.object({
  region: RegionSchema,
  position: PositionSchema,
  days: z.coerce.number().min(1).max(365).default(30),
});

export const MultiRegionComparisonSchema = z.object({
  regions: z.array(RegionSchema).min(1),
  position: PositionSchema,
  days: z.coerce.number().min(1).max(365).default(30),
});

// ═══════════════════════════════════════════════════════════════════
// Phase 3: Historical Analytics
// ═══════════════════════════════════════════════════════════════════

const TrendSchema = z.enum(['up', 'down', 'stable']);
const ConsistencySchema = z.enum(['high', 'medium', 'low']);

export const CandidateHistoryQuerySchema = z.object({
  candidate: z.string().min(1),
  state: z.string().length(2).toUpperCase(),
  position: PositionSchema.optional(),
  days: z.coerce.number().min(1).max(365).default(90),
});

export const TrendAnalysisQuerySchema = z.object({
  state: z.string().length(2).toUpperCase(),
  position: PositionSchema.optional(),
  candidate: z.string().optional(),
  days: z.coerce.number().min(1).max(365).default(30),
});

export const PeriodComparisonQuerySchema = z.object({
  state: z.string().length(2).toUpperCase(),
  position: PositionSchema.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  days: z.coerce.number().min(1).max(365).default(30),
});

export const SnapshotRecordSchema = z.object({
  date: z.string().date(),
  candidates: z.array(
    z.object({
      name: z.string().min(1),
      state: z.string().length(2).toUpperCase(),
      position: PositionSchema,
      percentage: z.number().min(0).max(100),
      confidence: z.number().min(0).max(1),
    })
  ).min(1),
  source: z.enum(['live', 'cron', 'manual']).default('manual'),
});

// ═══════════════════════════════════════════════════════════════════
// Type Exports
// ═══════════════════════════════════════════════════════════════════

export type Anomaly = z.infer<typeof AnomalySchema>;
export type AnomalyAlert = z.infer<typeof AnomalyAlertSchema>;
export type DiscrepancyCreate = z.infer<typeof DiscrepancyCreateSchema>;
export type DiscrepancyUpdate = z.infer<typeof DiscrepancyUpdateSchema>;
export type DiscrepancyFilter = z.infer<typeof DiscrepancyFilterSchema>;
export type ApprovalMetricsQuery = z.infer<typeof ApprovalMetricsQuerySchema>;
export type RegionalAggregationQuery = z.infer<typeof RegionalAggregationQuerySchema>;
export type MultiRegionComparison = z.infer<typeof MultiRegionComparisonSchema>;
export type CandidateHistoryQuery = z.infer<typeof CandidateHistoryQuerySchema>;
export type TrendAnalysisQuery = z.infer<typeof TrendAnalysisQuerySchema>;
export type PeriodComparisonQuery = z.infer<typeof PeriodComparisonQuerySchema>;
export type SnapshotRecord = z.infer<typeof SnapshotRecordSchema>;
