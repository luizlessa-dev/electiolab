/**
 * TSE Sync Service - Wave 3 Phase 3
 *
 * Manages synchronization with TSE official registry:
 * - Fetches official candidates from TSE API
 * - Validates poll candidates against TSE registry
 * - Logs discrepancies and updates
 * - Maintains cache for performance
 */

import { fetchTSECandidatos, fetchTSEEleicoes, TSECandidato, TSEEleicao } from './tse-client';
import { discrepancyManager } from '@/lib/admin/discrepancy-manager';

export interface TSESyncResult {
  state: string;
  position: 'governador' | 'senador' | 'presidencial';
  syncedAt: Date;
  totalCandidates: number;
  newCandidates: number;
  updatedCandidates: number;
  discrepancies: SyncDiscrepancy[];
  status: 'success' | 'partial' | 'failed';
}

export interface SyncDiscrepancy {
  type: 'missing_in_research' | 'missing_in_tse' | 'name_mismatch' | 'status_change';
  candidateName: string;
  tseData?: TSECandidato;
  researchData?: any;
  details: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface SyncCache {
  eleicoes: TSEEleicao[];
  candidatos: Map<string, TSECandidato[]>; // Key: `${eleicaoId}-${uf}`
  lastSyncTime: Record<string, Date>;
  syncStatus: Record<string, TSESyncResult>;
}

class TSESyncService {
  private cache: SyncCache = {
    eleicoes: [],
    candidatos: new Map(),
    lastSyncTime: {},
    syncStatus: {},
  };

  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  /**
   * Fetch elections from TSE with caching
   */
  async fetchElectionsWithCache(): Promise<TSEEleicao[]> {
    const now = Date.now();
    const lastSync = this.cache.lastSyncTime['eleicoes'];

    // Use cache if available and fresh
    if (this.cache.eleicoes.length > 0 && lastSync && (now - lastSync.getTime()) < this.CACHE_TTL) {
      console.log('[TSE Sync] Using cached elections');
      return this.cache.eleicoes;
    }

    console.log('[TSE Sync] Fetching fresh elections from TSE API...');
    try {
      const eleicoes = await fetchTSEEleicoes();
      this.cache.eleicoes = eleicoes;
      this.cache.lastSyncTime['eleicoes'] = new Date();
      console.log(`[TSE Sync] Synced ${eleicoes.length} elections`);
      return eleicoes;
    } catch (error) {
      console.error('[TSE Sync] Failed to fetch elections:', error);
      return this.cache.eleicoes; // Return stale cache on error
    }
  }

  /**
   * Fetch candidates for a specific election/state
   */
  async fetchCandidatesWithCache(
    eleicaoId: string,
    state: string
  ): Promise<TSECandidato[]> {
    const cacheKey = `${eleicaoId}-${state}`;
    const now = Date.now();
    const lastSync = this.cache.lastSyncTime[cacheKey];

    if (
      this.cache.candidatos.has(cacheKey) &&
      lastSync &&
      (now - lastSync.getTime()) < this.CACHE_TTL
    ) {
      console.log(`[TSE Sync] Using cached candidates for ${state}`);
      return this.cache.candidatos.get(cacheKey) || [];
    }

    console.log(`[TSE Sync] Fetching fresh candidates from TSE for ${state}...`);
    try {
      const candidatos = await fetchTSECandidatos(eleicaoId, state);
      this.cache.candidatos.set(cacheKey, candidatos);
      this.cache.lastSyncTime[cacheKey] = new Date();
      console.log(`[TSE Sync] Synced ${candidatos.length} candidates for ${state}`);
      return candidatos;
    } catch (error) {
      console.error(`[TSE Sync] Failed to fetch candidates for ${state}:`, error);
      return this.cache.candidatos.get(cacheKey) || [];
    }
  }

  /**
   * Sync candidates for all states and positions
   * Returns summary of discrepancies found
   */
  async syncAllCandidates(
    position: 'governador' | 'senador' | 'presidencial' = 'governador'
  ): Promise<TSESyncResult[]> {
    console.log(`\n[TSE Sync] Starting full sync for ${position}s...`);
    const startTime = Date.now();

    const elections = await this.fetchElectionsWithCache();
    const election2026 = elections.find(
      (e) => e.ano === 2026 && e.tipo === position
    );

    if (!election2026) {
      console.error(`[TSE Sync] No ${position} election found for 2026`);
      return [];
    }

    const results: TSESyncResult[] = [];

    // Sync each state in parallel
    const syncPromises = this.STATES.map((state) =>
      this.syncStatePosition(election2026.id, state, position)
    );

    const syncResults = await Promise.allSettled(syncPromises);

    for (const result of syncResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[TSE Sync] Full sync completed in ${elapsed}ms`);
    console.log(`[TSE Sync] Summary: ${results.length} states synced`);

    return results;
  }

  /**
   * Sync single state/position combination
   */
  async syncStatePosition(
    eleicaoId: string,
    state: string,
    position: 'governador' | 'senador' | 'presidencial'
  ): Promise<TSESyncResult> {
    const startTime = Date.now();
    const discrepancies: SyncDiscrepancy[] = [];

    try {
      const tseCandidatos = await this.fetchCandidatesWithCache(eleicaoId, state);

      if (tseCandidatos.length === 0) {
        console.warn(`[TSE Sync] No candidates found for ${state} ${position}`);
        return {
          state,
          position,
          syncedAt: new Date(),
          totalCandidates: 0,
          newCandidates: 0,
          updatedCandidates: 0,
          discrepancies: [],
          status: 'failed',
        };
      }

      // Get research data for comparison
      const { getRealCandidatesByStateAndPosition } = await import('@/lib/candidates/real-candidates-2026');
      const researchCandidates = getRealCandidatesByStateAndPosition(state, position as 'governador' | 'senador');

      // Check for candidates in TSE but not in research
      for (const tseCand of tseCandidatos) {
        const researchMatch = researchCandidates.find(
          (r) => this.normalizeNameForComparison(r.name) === this.normalizeNameForComparison(tseCand.nomeUrna)
        );

        if (!researchMatch) {
          discrepancies.push({
            type: 'missing_in_research',
            candidateName: tseCand.nomeUrna,
            tseData: tseCand,
            details: `Candidate registered in TSE but not found in research database`,
            severity: tseCand.numero ? 'warning' : 'info',
          });
        }
      }

      // Check for candidates in research but not in TSE
      for (const resCand of researchCandidates) {
        const tseMatch = tseCandidatos.find(
          (t) => this.normalizeNameForComparison(t.nomeUrna) === this.normalizeNameForComparison(resCand.name)
        );

        if (!tseMatch) {
          discrepancies.push({
            type: 'missing_in_tse',
            candidateName: resCand.name,
            researchData: resCand,
            details: `Candidate in research database but not found in TSE registry`,
            severity: 'critical', // Should have TSE registration
          });
        }
      }

      if (discrepancies.length > 0) {
        await Promise.all(
          discrepancies.map((d) => discrepancyManager.createDiscrepancy(state, position, d))
        );
      }

      const elapsed = Date.now() - startTime;
      const result: TSESyncResult = {
        state,
        position,
        syncedAt: new Date(),
        totalCandidates: tseCandidatos.length,
        newCandidates: discrepancies.filter((d) => d.type === 'missing_in_research').length,
        updatedCandidates: 0,
        discrepancies,
        status: discrepancies.filter((d) => d.severity === 'critical').length > 0 ? 'partial' : 'success',
      };

      // Cache result
      const cacheKey = `${state}-${position}`;
      this.cache.syncStatus[cacheKey] = result;

      console.log(
        `[TSE Sync] ${state} ${position}: ${tseCandidatos.length} TSE candidates, ${discrepancies.length} discrepancies (${elapsed}ms)`
      );

      return result;
    } catch (error) {
      console.error(`[TSE Sync] Error syncing ${state} ${position}:`, error);
      return {
        state,
        position,
        syncedAt: new Date(),
        totalCandidates: 0,
        newCandidates: 0,
        updatedCandidates: 0,
        discrepancies: [],
        status: 'failed',
      };
    }
  }

  /**
   * Normalize names for comparison
   */
  private normalizeNameForComparison(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // Remove diacritics
      .toLowerCase()
      .trim();
  }

  /**
   * Get sync status for a state
   */
  getSyncStatus(state: string, position: string): TSESyncResult | null {
    return this.cache.syncStatus[`${state}-${position}`] || null;
  }

  /**
   * Log all discrepancies in structured format
   */
  logDiscrepancies(results: TSESyncResult[]): void {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TSE SYNC DISCREPANCY REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const result of results) {
      if (result.discrepancies.length === 0) continue;

      console.log(`📍 ${result.state} - ${result.position}`);
      console.log(`   Synced: ${result.syncedAt.toLocaleString('pt-BR')}`);
      console.log(`   Total TSE Candidates: ${result.totalCandidates}`);

      for (const disc of result.discrepancies) {
        const icon = disc.severity === 'critical' ? '🔴' : disc.severity === 'warning' ? '🟡' : '🔵';
        console.log(`   ${icon} [${disc.severity.toUpperCase()}] ${disc.type}`);
        console.log(`      Candidate: ${disc.candidateName}`);
        console.log(`      Details: ${disc.details}`);

        if (disc.severity === 'critical') criticalCount++;
        else if (disc.severity === 'warning') warningCount++;
        else infoCount++;
      }
      console.log();
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Summary: ${criticalCount} critical, ${warningCount} warnings, ${infoCount} info`);
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * Export discrepancies to JSON for analysis
   */
  exportDiscrepancies(results: TSESyncResult[]): object {
    return {
      exportedAt: new Date().toISOString(),
      summary: {
        totalStates: results.length,
        totalDiscrepancies: results.reduce((sum, r) => sum + r.discrepancies.length, 0),
        critical: results.reduce(
          (sum, r) => sum + r.discrepancies.filter((d) => d.severity === 'critical').length,
          0
        ),
        warnings: results.reduce(
          (sum, r) => sum + r.discrepancies.filter((d) => d.severity === 'warning').length,
          0
        ),
      },
      results: results.map((r) => ({
        state: r.state,
        position: r.position,
        status: r.status,
        syncedAt: r.syncedAt.toISOString(),
        tseCandidates: r.totalCandidates,
        discrepancies: r.discrepancies,
      })),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = {
      eleicoes: [],
      candidatos: new Map(),
      lastSyncTime: {},
      syncStatus: {},
    };
    console.log('[TSE Sync] Cache cleared');
  }
}

// Export singleton instance
export const tseSyncService = new TSESyncService();
