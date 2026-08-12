// Wave 4 Type Definitions

// ═══════════════════════════════════════════════════════════════════
// Phase 1: Alerts & Notifications
// ═══════════════════════════════════════════════════════════════════

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type DiscrepancyType = 'missing_in_research' | 'missing_in_aggregated' | 'significant_deviation';
export type DiscrepancyStatus = 'open' | 'investigating' | 'resolved';
export type NotificationChannel = 'slack' | 'email' | 'log';

export interface Anomaly {
  state: string;
  position: 'governador' | 'senador' | 'presidencial';
  candidateName: string;
  researchPercentage: number;
  aggregatedPercentage: number;
  deviation: number;
  confidence: number;
  severity: Severity;
  timestamp: string;
}

export interface Discrepancy {
  id: string;
  state: string;
  position: 'governador' | 'senador' | 'presidencial';
  candidateName: string;
  type: DiscrepancyType;
  description: string;
  severity: Severity;
  status: DiscrepancyStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

export interface AnomalyAlert {
  anomaly: Anomaly;
  channels: NotificationChannel[];
  emailRecipients?: string[];
  slackMentions?: string[];
}

// ═══════════════════════════════════════════════════════════════════
// Phase 2: Approval & Regional Aggregation
// ═══════════════════════════════════════════════════════════════════

export type Position = 'governador' | 'senador' | 'presidencial';
export type Region = 'norte' | 'nordeste' | 'centro-oeste' | 'sudeste' | 'sul';

export interface ApprovalMetrics {
  position: Position;
  state?: string;
  approval: number;
  disapproval: number;
  neutral: number;
  confidence: number;
  trend?: 'up' | 'down' | 'stable';
  trendStrength?: number;
  periodComparison?: {
    previous: number;
    current: number;
    change: number;
  };
}

export interface RegionalAggregation {
  region: Region;
  position: Position;
  states: StateMetrics[];
  weighted: {
    approval: number;
    disapproval: number;
    neutral: number;
  };
  coverage: number;
  qualityScore: number;
}

export interface StateMetrics {
  state: string;
  approval: number;
  disapproval: number;
  neutral: number;
  population: number;
  weight: number;
}

export interface MultiRegionComparison {
  regions: RegionalAggregation[];
  position: Position;
  timestamp: string;
  topRegion: {
    region: Region;
    approval: number;
  };
  bottomRegion: {
    region: Region;
    approval: number;
  };
}

// ═══════════════════════════════════════════════════════════════════
// Phase 3: Historical Analytics
// ═══════════════════════════════════════════════════════════════════

export type SnapshotSource = 'live' | 'cron' | 'manual';
export type Trend = 'up' | 'down' | 'stable';
export type Consistency = 'high' | 'medium' | 'low';

export interface AggregationSnapshot {
  id: string;
  date: string;
  candidates: CandidateSnapshot[];
  qualityMetrics: {
    coverage: number;
    confidence: number;
    dataPoints: number;
  };
  source: SnapshotSource;
  createdAt: string;
}

export interface CandidateSnapshot {
  name: string;
  state: string;
  position: Position;
  percentage: number;
  confidence: number;
  ranking?: number;
}

export interface CandidateHistory {
  candidate: string;
  state: string;
  position: Position;
  snapshots: HistoryPoint[];
  totalChange: number;
  trend: Trend;
  volatility: number;
}

export interface HistoryPoint {
  date: string;
  percentage: number;
  confidence: number;
  ranking?: number;
}

export interface TrendAnalysis {
  state: string;
  position: Position;
  period: {
    from: string;
    to: string;
    days: number;
  };
  candidates: CandidateTrend[];
  averageVolatility: number;
  mostVolatile: {
    candidate: string;
    volatility: number;
  };
  mostStable: {
    candidate: string;
    volatility: number;
  };
}

export interface CandidateTrend {
  candidate: string;
  trend: Trend;
  trendStrength: number;
  volatility: number;
  consistency: Consistency;
  startValue: number;
  endValue: number;
  change: number;
}

export interface PeriodComparison {
  state: string;
  position: Position;
  period1: {
    from: string;
    to: string;
    candidates: CandidateData[];
  };
  period2: {
    from: string;
    to: string;
    candidates: CandidateData[];
  };
  changes: CandidateChange[];
  greatestGains: CandidateChange[];
  greatestLosses: CandidateChange[];
}

export interface CandidateData {
  name: string;
  percentage: number;
  confidence: number;
}

export interface CandidateChange {
  candidate: string;
  period1Percentage: number;
  period2Percentage: number;
  change: number;
  changePercent: number;
}

// ═══════════════════════════════════════════════════════════════════
// API Response Types
// ═══════════════════════════════════════════════════════════════════

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface DiscrepancyListResponse {
  items: Discrepancy[];
  total: number;
  limit: number;
  offset: number;
}

export interface DiscrepancyStats {
  total: number;
  byState: Record<string, number>;
  bySeverity: Record<Severity, number>;
  byStatus: Record<DiscrepancyStatus, number>;
}
