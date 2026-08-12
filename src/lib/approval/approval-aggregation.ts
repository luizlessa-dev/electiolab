/**
 * Approval Rating Aggregation
 *
 * Tracks and aggregates approval/disapproval metrics:
 * - Presidential approval
 * - Governor approval
 * - Trends over time
 */

export interface ApprovalMetrics {
  state?: string // Empty for national (presidencial)
  position: 'presidencial' | 'governador'
  period: number // Days
  approval: number // 0-100%
  disapproval: number // 0-100%
  neutral: number // Don't know/No opinion
  confidence: number // 0-1
  samplesUsed: number
  trend: 'up' | 'down' | 'stable'
  trendMagnitude: number // % change from previous period
  aggregatedAt: Date
}

export interface ApprovalPoll {
  candidateName: string
  approval: number
  disapproval: number
  neutral: number
  marginOfError: number
  instituteName: string
  publishDate: Date
  sampleSize: number
}

export interface ApprovalComparisonPeriod {
  label: string
  days: number
  approval: number
  disapproval: number
  neutral: number
}

class ApprovalAggregation {
  /**
   * Aggregate approval polls for a state/position
   */
  aggregateApprovalPolls(
    polls: ApprovalPoll[],
    state: string | undefined,
    position: 'presidencial' | 'governador',
    referenceDate: Date
  ): ApprovalMetrics {
    if (polls.length === 0) {
      return this.emptyApprovalMetrics(state, position);
    }

    // Weight polls by recency and MoE
    let totalApproval = 0;
    let totalDisapproval = 0;
    let totalNeutral = 0;
    let totalWeight = 0;

    for (const poll of polls) {
      const daysOld = (referenceDate.getTime() - poll.publishDate.getTime()) / (24 * 60 * 60 * 1000);
      const recencyWeight = Math.pow(0.5, daysOld / 14); // 14-day half-life
      const moeWeight = 1 / (1 + 0.4 * poll.marginOfError);
      const weight = recencyWeight * moeWeight;

      totalApproval += poll.approval * weight;
      totalDisapproval += poll.disapproval * weight;
      totalNeutral += poll.neutral * weight;
      totalWeight += weight;
    }

    const aggregatedApproval = totalApproval / totalWeight;
    const aggregatedDisapproval = totalDisapproval / totalWeight;
    const aggregatedNeutral = totalNeutral / totalWeight;

    // Calculate confidence
    const stdDev = this.calculateStdDev(
      polls.map(p => p.approval),
      aggregatedApproval
    );
    const avgSampleSize = polls.reduce((sum, p) => sum + p.sampleSize, 0) / polls.length;
    const ci95 = 1.96 * (stdDev / Math.sqrt(avgSampleSize));
    const confidence = Math.max(0, Math.min(1, 1 - ci95 / 10));

    // Calculate trend (simplified: compare with older polls)
    const trend = this.calculateTrend(polls, 14);

    return {
      state,
      position,
      period: 30,
      approval: Math.round(aggregatedApproval * 10) / 10,
      disapproval: Math.round(aggregatedDisapproval * 10) / 10,
      neutral: Math.round(aggregatedNeutral * 10) / 10,
      confidence,
      samplesUsed: polls.length,
      trend: trend.direction,
      trendMagnitude: trend.magnitude,
      aggregatedAt: referenceDate,
    };
  }

  /**
   * Compare approval between two periods
   */
  compareApprovalPeriods(
    oldPolls: ApprovalPoll[],
    newPolls: ApprovalPoll[],
    referenceDate: Date,
    position: 'presidencial' | 'governador'
  ): {
    previous: ApprovalMetrics
    current: ApprovalMetrics
    changes: {
      approvalChange: number
      disapprovalChange: number
      trend: 'improving' | 'declining' | 'stable'
    }
  } {
    const previous = this.aggregateApprovalPolls(oldPolls, undefined, position, referenceDate);
    const current = this.aggregateApprovalPolls(newPolls, undefined, position, referenceDate);

    const approvalChange = current.approval - previous.approval;
    const disapprovalChange = current.disapproval - previous.disapproval;

    let trend: 'improving' | 'declining' | 'stable';
    if (Math.abs(approvalChange) < 2) {
      trend = 'stable';
    } else if (approvalChange > 0) {
      trend = 'improving';
    } else {
      trend = 'declining';
    }

    return {
      previous,
      current,
      changes: {
        approvalChange: Math.round(approvalChange * 10) / 10,
        disapprovalChange: Math.round(disapprovalChange * 10) / 10,
        trend,
      },
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(
    polls: ApprovalPoll[],
    days: number
  ): { direction: 'up' | 'down' | 'stable'; magnitude: number } {
    if (polls.length < 2) {
      return { direction: 'stable', magnitude: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldPolls = polls.filter(p => p.publishDate < cutoffDate).map(p => p.approval);
    const newPolls = polls.filter(p => p.publishDate >= cutoffDate).map(p => p.approval);

    if (oldPolls.length === 0 || newPolls.length === 0) {
      return { direction: 'stable', magnitude: 0 };
    }

    const oldAvg = oldPolls.reduce((sum, a) => sum + a, 0) / oldPolls.length;
    const newAvg = newPolls.reduce((sum, a) => sum + a, 0) / newPolls.length;
    const change = newAvg - oldAvg;

    let direction: 'up' | 'down' | 'stable';
    if (Math.abs(change) < 1) {
      direction = 'stable';
    } else if (change > 0) {
      direction = 'up';
    } else {
      direction = 'down';
    }

    return {
      direction,
      magnitude: Math.round(Math.abs(change) * 10) / 10,
    };
  }

  /**
   * Empty metrics
   */
  private emptyApprovalMetrics(
    state: string | undefined,
    position: 'presidencial' | 'governador'
  ): ApprovalMetrics {
    return {
      state,
      position,
      period: 30,
      approval: 0,
      disapproval: 0,
      neutral: 0,
      confidence: 0,
      samplesUsed: 0,
      trend: 'stable',
      trendMagnitude: 0,
      aggregatedAt: new Date(),
    };
  }
}

export const approvalAggregation = new ApprovalAggregation();
