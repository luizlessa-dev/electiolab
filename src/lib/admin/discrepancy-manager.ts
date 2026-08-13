/**
 * Discrepancy Manager
 *
 * Manages storage and resolution of discrepancies:
 * - Store discrepancies in database
 * - Track resolutions
 * - Audit trail
 */

import { supabaseAdmin as supabase } from '@/lib/supabase/admin';
import type { SyncDiscrepancy } from '@/lib/tse/tse-sync-service';
import type { Json, Tables } from '@/types/database.types';

export type DiscrepancySeverity = 'info' | 'warning' | 'critical';
export type DiscrepancyType = 'missing_in_research' | 'missing_in_tse' | 'name_mismatch' | 'status_change';
export type ResolutionType = 'verified' | 'dismissed' | 'escalated' | 'pending';

export interface DiscrepancyRecord {
  id: string
  state: string
  position: string
  candidateName: string
  type: DiscrepancyType
  severity: DiscrepancySeverity
  details: string
  tseData?: Json | null
  researchData?: Json | null
  resolution: ResolutionType
  resolvedBy?: string
  resolvedAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface DiscrepancyFilter {
  state?: string
  position?: string
  severity?: DiscrepancySeverity
  type?: DiscrepancyType
  resolution?: ResolutionType
  search?: string
  limit?: number
  offset?: number
}

export interface DiscrepancyStats {
  total: number
  byState: Record<string, number>
  byType: Record<string, number>
  bySeverity: Record<string, number>
  byResolution: Record<string, number>
}

class DiscrepancyManager {
  private tableName = 'discrepancies';

  /**
   * Create discrepancy record
   */
  async createDiscrepancy(
    state: string,
    position: string,
    discrepancy: SyncDiscrepancy
  ): Promise<DiscrepancyRecord | null> {
    try {
      // Upsert on (state, position, candidate_name, type): re-detecting the
      // same discrepancy (e.g. on a repeat TSE sync) refreshes its details
      // instead of erroring on the unique_discrepancy constraint. `resolution`
      // is intentionally omitted so an existing resolved/dismissed record
      // isn't reset back to 'pending' by a later re-detection.
      const { data, error } = await supabase
        .from(this.tableName)
        .upsert(
          {
            state,
            position,
            candidate_name: discrepancy.candidateName,
            type: discrepancy.type,
            severity: discrepancy.severity,
            details: discrepancy.details,
            tse_data: discrepancy.tseData,
            research_data: discrepancy.researchData,
          },
          { onConflict: 'state,position,candidate_name,type' }
        )
        .select()
        .single();

      if (error) {
        console.error('[Discrepancy] Create error:', error);
        return null;
      }

      return this.mapRowToRecord(data);
    } catch (error) {
      console.error('[Discrepancy] Create exception:', error);
      return null;
    }
  }

  /**
   * Batch create discrepancies
   */
  async createBatch(
    state: string,
    position: string,
    discrepancies: SyncDiscrepancy[]
  ): Promise<DiscrepancyRecord[]> {
    if (discrepancies.length === 0) return [];

    try {
      const records = discrepancies.map(d => ({
        state,
        position,
        candidate_name: d.candidateName,
        type: d.type,
        severity: d.severity,
        details: d.details,
        tse_data: d.tseData,
        research_data: d.researchData,
        resolution: 'pending',
      }));

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(records)
        .select();

      if (error) {
        console.error('[Discrepancy] Batch create error:', error);
        return [];
      }

      return (data || []).map(row => this.mapRowToRecord(row));
    } catch (error) {
      console.error('[Discrepancy] Batch create exception:', error);
      return [];
    }
  }

  /**
   * Get discrepancies with filters
   */
  async getDiscrepancies(filter: DiscrepancyFilter): Promise<DiscrepancyRecord[]> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (filter.state) {
        query = query.eq('state', filter.state);
      }

      if (filter.position) {
        query = query.eq('position', filter.position);
      }

      if (filter.severity) {
        query = query.eq('severity', filter.severity);
      }

      if (filter.type) {
        query = query.eq('type', filter.type);
      }

      if (filter.resolution) {
        query = query.eq('resolution', filter.resolution);
      }

      if (filter.search) {
        query = query.or(`candidate_name.ilike.%${filter.search}%,details.ilike.%${filter.search}%`);
      }

      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Discrepancy] Get error:', error);
        return [];
      }

      return (data || []).map(row => this.mapRowToRecord(row));
    } catch (error) {
      console.error('[Discrepancy] Get exception:', error);
      return [];
    }
  }

  /**
   * Get single discrepancy
   */
  async getDiscrepancy(id: string): Promise<DiscrepancyRecord | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[Discrepancy] Get single error:', error);
        return null;
      }

      return this.mapRowToRecord(data);
    } catch (error) {
      console.error('[Discrepancy] Get single exception:', error);
      return null;
    }
  }

  /**
   * Resolve discrepancy
   */
  async resolveDiscrepancy(
    id: string,
    resolution: ResolutionType,
    resolvedBy: string,
    notes?: string
  ): Promise<DiscrepancyRecord | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          resolution,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Discrepancy] Resolve error:', error);
        return null;
      }

      console.log(`[Discrepancy] Resolved: ${id} → ${resolution}`);
      return this.mapRowToRecord(data);
    } catch (error) {
      console.error('[Discrepancy] Resolve exception:', error);
      return null;
    }
  }

  /**
   * Batch resolve discrepancies
   */
  async resolveBatch(
    ids: string[],
    resolution: ResolutionType,
    resolvedBy: string
  ): Promise<DiscrepancyRecord[]> {
    if (ids.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          resolution,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .select();

      if (error) {
        console.error('[Discrepancy] Batch resolve error:', error);
        return [];
      }

      console.log(`[Discrepancy] Batch resolved: ${ids.length} items`);
      return (data || []).map(row => this.mapRowToRecord(row));
    } catch (error) {
      console.error('[Discrepancy] Batch resolve exception:', error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<DiscrepancyStats> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('state, type, severity, resolution');

      if (error) {
        console.error('[Discrepancy] Stats error:', error);
        return this.emptyStats();
      }

      const stats: DiscrepancyStats = {
        total: (data || []).length,
        byState: {},
        byType: {},
        bySeverity: {},
        byResolution: {},
      };

      for (const row of data || []) {
        stats.byState[row.state] = (stats.byState[row.state] || 0) + 1;
        stats.byType[row.type] = (stats.byType[row.type] || 0) + 1;
        stats.bySeverity[row.severity] = (stats.bySeverity[row.severity] || 0) + 1;
        stats.byResolution[row.resolution] = (stats.byResolution[row.resolution] || 0) + 1;
      }

      return stats;
    } catch (error) {
      console.error('[Discrepancy] Stats exception:', error);
      return this.emptyStats();
    }
  }

  /**
   * Get unresolved count
   */
  async getUnresolvedCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('resolution', 'pending');

      if (error) {
        console.error('[Discrepancy] Unresolved count error:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[Discrepancy] Unresolved count exception:', error);
      return 0;
    }
  }

  /**
   * Get critical unresolved
   */
  async getCriticalUnresolved(): Promise<DiscrepancyRecord[]> {
    return this.getDiscrepancies({
      severity: 'critical',
      resolution: 'pending',
      limit: 100,
    });
  }

  /**
   * Delete old discrepancies (archive)
   */
  async deleteOlderThan(days: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { count, error } = await supabase
        .from(this.tableName)
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('[Discrepancy] Delete error:', error);
        return 0;
      }

      console.log(`[Discrepancy] Deleted ${count} old records`);
      return count || 0;
    } catch (error) {
      console.error('[Discrepancy] Delete exception:', error);
      return 0;
    }
  }

  /**
   * Map database row to record
   */
  private mapRowToRecord(row: Tables<'discrepancies'>): DiscrepancyRecord {
    return {
      id: row.id,
      state: row.state,
      position: row.position,
      candidateName: row.candidate_name,
      // `type`/`severity`/`resolution` are `string` at the DB-schema level
      // (no Postgres enum backing them) but this app only ever writes the
      // literal unions below via createDiscrepancy/createBatch/resolve*.
      type: row.type as DiscrepancyType,
      severity: row.severity as DiscrepancySeverity,
      details: row.details,
      tseData: row.tse_data,
      researchData: row.research_data,
      resolution: row.resolution as ResolutionType,
      resolvedBy: row.resolved_by ?? undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Empty stats object
   */
  private emptyStats(): DiscrepancyStats {
    return {
      total: 0,
      byState: {},
      byType: {},
      bySeverity: {},
      byResolution: {},
    };
  }
}

export const discrepancyManager = new DiscrepancyManager();
