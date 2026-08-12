/**
 * Poll History Service
 *
 * Tracks aggregated poll snapshots over time:
 * - Daily snapshots of aggregated results
 * - Historical candidate tracking
 * - Trend analysis
 */

import { supabaseAdmin as supabase } from '@/lib/supabase/admin';

export interface AggregationSnapshot {
  id: string
  state: string
  position: 'governador' | 'senador' | 'presidencial'
  snapshotDate: Date
  candidates: Array<{
    name: string
    party?: string
    percentage: number
    confidence: number
  }>
  qualityMetrics: {
    dataQualityScore: number
    coverageScore: number
    conflictScore: number
  }
  sampleSize: number
  source: 'live' | 'cron' | 'manual'
}

export interface CandidateTrajectory {
  name: string
  party?: string
  state: string
  position: string
  history: Array<{
    date: Date
    percentage: number
    confidence: number
    rank: number
  }>
  trend: 'up' | 'down' | 'stable'
  totalChange: number
  averagePercentage: number
}

export interface TrendMetrics {
  candidate: string
  state?: string
  position: string
  startDate: Date
  endDate: Date
  startPercentage: number
  endPercentage: number
  change: number
  changePercent: number
  volatility: number // Standard deviation
  trend: 'up' | 'down' | 'stable'
  consistency: 'high' | 'medium' | 'low' // Based on volatility
}

class PollHistory {
  private tableName = 'aggregation_history';

  /**
   * Record aggregation snapshot
   */
  async recordSnapshot(snapshot: AggregationSnapshot): Promise<string | null> {
    try {
      // Upsert on (state, position, snapshot_date): re-recording the same
      // day (e.g. the cron firing twice, or a manual + live trigger both
      // landing same-day) refreshes that day's snapshot instead of erroring
      // on the unique_snapshot constraint.
      const { data, error } = await supabase
        .from(this.tableName)
        .upsert(
          {
            state: snapshot.state,
            position: snapshot.position,
            snapshot_date: snapshot.snapshotDate.toISOString(),
            candidates_data: JSON.stringify(snapshot.candidates),
            quality_metrics: JSON.stringify(snapshot.qualityMetrics),
            sample_size: snapshot.sampleSize,
            source: snapshot.source,
          },
          { onConflict: 'state,position,snapshot_date' }
        )
        .select('id')
        .single();

      if (error) {
        console.error('[History] Record snapshot error:', error);
        return null;
      }

      console.log(`[History] Recorded snapshot: ${snapshot.state} ${snapshot.position}`);
      return data.id;
    } catch (error) {
      console.error('[History] Record snapshot exception:', error);
      return null;
    }
  }

  /**
   * Get historical data for a candidate
   */
  async getCandidateHistory(
    candidateName: string,
    state: string,
    position: string,
    days: number
  ): Promise<CandidateTrajectory | null> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('state', state)
        .eq('position', position)
        .gte('snapshot_date', startDate.toISOString())
        .order('snapshot_date', { ascending: true });

      if (error || !data) {
        console.error('[History] Get history error:', error);
        return null;
      }

      // Extract candidate data points
      const history: CandidateTrajectory['history'] = [];
      let rank = 1;

      for (const snapshot of data) {
        const candidates = JSON.parse(snapshot.candidates_data || '[]');
        const candidate = candidates.find((c: any) =>
          c.name.toLowerCase() === candidateName.toLowerCase()
        );

        if (candidate) {
          history.push({
            date: new Date(snapshot.snapshot_date),
            percentage: candidate.percentage,
            confidence: candidate.confidence,
            rank,
          });

          rank++;
        }
      }

      if (history.length === 0) {
        return null;
      }

      // Calculate metrics
      const startPercentage = history[0].percentage;
      const endPercentage = history[history.length - 1].percentage;
      const avgPercentage = history.reduce((sum, h) => sum + h.percentage, 0) / history.length;
      const volatility = this.calculateVolatility(history.map(h => h.percentage));

      let trend: 'up' | 'down' | 'stable';
      if (endPercentage > startPercentage + 2) {
        trend = 'up';
      } else if (endPercentage < startPercentage - 2) {
        trend = 'down';
      } else {
        trend = 'stable';
      }

      return {
        name: candidateName,
        state,
        position,
        history,
        trend,
        totalChange: endPercentage - startPercentage,
        averagePercentage: avgPercentage,
      };
    } catch (error) {
      console.error('[History] Get history exception:', error);
      return null;
    }
  }

  /**
   * Get trend metrics for a candidate
   */
  async getTrendMetrics(
    candidateName: string,
    state: string | undefined,
    position: string,
    startDate: Date,
    endDate: Date
  ): Promise<TrendMetrics | null> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('position', position)
        .gte('snapshot_date', startDate.toISOString())
        .lte('snapshot_date', endDate.toISOString())
        .order('snapshot_date', { ascending: true });

      if (state) {
        query = query.eq('state', state);
      }

      const { data, error } = await query;

      if (error || !data || data.length < 2) {
        return null;
      }

      const percentages: number[] = [];
      let startPercentage = 0;
      let endPercentage = 0;

      for (let i = 0; i < data.length; i++) {
        const candidates = JSON.parse(data[i].candidates_data || '[]');
        const candidate = candidates.find((c: any) =>
          c.name.toLowerCase() === candidateName.toLowerCase()
        );

        if (candidate) {
          percentages.push(candidate.percentage);
          if (i === 0) startPercentage = candidate.percentage;
          if (i === data.length - 1) endPercentage = candidate.percentage;
        }
      }

      if (percentages.length < 2) {
        return null;
      }

      const change = endPercentage - startPercentage;
      const changePercent = startPercentage !== 0 ? (change / startPercentage) * 100 : 0;
      const volatility = this.calculateVolatility(percentages);

      let trend: 'up' | 'down' | 'stable';
      if (change > 2) {
        trend = 'up';
      } else if (change < -2) {
        trend = 'down';
      } else {
        trend = 'stable';
      }

      let consistency: 'high' | 'medium' | 'low';
      if (volatility < 1) {
        consistency = 'high';
      } else if (volatility < 3) {
        consistency = 'medium';
      } else {
        consistency = 'low';
      }

      return {
        candidate: candidateName,
        state,
        position,
        startDate,
        endDate,
        startPercentage,
        endPercentage,
        change,
        changePercent,
        volatility,
        trend,
        consistency,
      };
    } catch (error) {
      console.error('[History] Get trend metrics exception:', error);
      return null;
    }
  }

  /**
   * Compare two periods
   */
  async comparePeriods(
    state: string,
    position: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date
  ): Promise<{
    period1: Array<{ name: string; percentage: number }>
    period2: Array<{ name: string; percentage: number }>
    changes: Array<{ name: string; change: number; percentChange: number }>
  } | null> {
    try {
      // Get period 1 data
      const { data: data1, error: error1 } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('state', state)
        .eq('position', position)
        .gte('snapshot_date', period1Start.toISOString())
        .lte('snapshot_date', period1End.toISOString())
        .order('snapshot_date', { ascending: false })
        .limit(1);

      // Get period 2 data
      const { data: data2, error: error2 } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('state', state)
        .eq('position', position)
        .gte('snapshot_date', period2Start.toISOString())
        .lte('snapshot_date', period2End.toISOString())
        .order('snapshot_date', { ascending: false })
        .limit(1);

      if (error1 || error2 || !data1?.[0] || !data2?.[0]) {
        return null;
      }

      const period1Candidates = JSON.parse(data1[0].candidates_data || '[]');
      const period2Candidates = JSON.parse(data2[0].candidates_data || '[]');

      const changes: Array<{ name: string; change: number; percentChange: number }> = [];

      for (const candidate of period2Candidates) {
        const p1Candidate = period1Candidates.find((c: any) =>
          c.name.toLowerCase() === candidate.name.toLowerCase()
        );

        if (p1Candidate) {
          const change = candidate.percentage - p1Candidate.percentage;
          const percentChange =
            p1Candidate.percentage !== 0 ? (change / p1Candidate.percentage) * 100 : 0;

          changes.push({
            name: candidate.name,
            change: Math.round(change * 10) / 10,
            percentChange: Math.round(percentChange * 10) / 10,
          });
        }
      }

      // Sort by absolute change
      changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

      return {
        period1: period1Candidates,
        period2: period2Candidates,
        changes,
      };
    } catch (error) {
      console.error('[History] Compare periods exception:', error);
      return null;
    }
  }

  /**
   * Get snapshots for a state
   */
  async getSnapshots(
    state: string,
    position: string,
    days: number,
    limit: number = 100
  ): Promise<AggregationSnapshot[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('state', state)
        .eq('position', position)
        .gte('snapshot_date', startDate.toISOString())
        .order('snapshot_date', { ascending: false })
        .limit(limit);

      if (error || !data) {
        return [];
      }

      return data.map(row => ({
        id: row.id,
        state: row.state,
        position: row.position,
        snapshotDate: new Date(row.snapshot_date),
        candidates: JSON.parse(row.candidates_data || '[]'),
        qualityMetrics: JSON.parse(row.quality_metrics || '{}'),
        sampleSize: row.sample_size,
        source: row.source,
      }));
    } catch (error) {
      console.error('[History] Get snapshots exception:', error);
      return [];
    }
  }

  /**
   * Calculate volatility (standard deviation)
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Archive old snapshots (optional cleanup)
   */
  async archiveOlderThan(days: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { count, error } = await supabase
        .from(this.tableName)
        .delete()
        .lt('snapshot_date', cutoffDate.toISOString());

      if (error) {
        console.error('[History] Archive error:', error);
        return 0;
      }

      console.log(`[History] Archived ${count} old snapshots`);
      return count || 0;
    } catch (error) {
      console.error('[History] Archive exception:', error);
      return 0;
    }
  }
}

export const pollHistory = new PollHistory();
