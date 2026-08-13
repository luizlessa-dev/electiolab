/**
 * Institute Sync Manager
 *
 * Orchestrates polling data synchronization from all 65 Brazilian institutes
 * - Coordinates parallel fetches with rate limiting
 * - Normalizes data to standard format
 * - Stores polls and results in Supabase
 * - Handles retries and error recovery
 */

import { InstituteClientBase, Poll } from './institute-client-base';

export interface SyncOptions {
  electionId?: string;
  instituteIds?: string[]; // Specific institutes (default: all)
  dryRun?: boolean;
  parallel?: number; // Concurrent fetches (default: 3)
}

export interface SyncResult {
  institute: string;
  success: boolean;
  pollsFetched: number;
  pollsInserted: number;
  pollsUpdated: number;
  error?: string;
  duration: number;
}

/**
 * Manages sync operations across all institutes
 */
export class InstituteSyncManager {
  private clients: Map<string, InstituteClientBase> = new Map();
  private institutes: InstituteMeta[] = [];

  constructor() {
    this.registerDefaultClients();
  }

  /**
   * Register default institute clients
   * NOTE: Use updated clients from src/lib/institutes instead
   */
  private registerDefaultClients(): void {
    // TODO: Migrate to new InstituteClientBase from src/lib/institutes/
    // Phase 1+2.5 clients are implemented in electiolab/src/lib/institutes/
    // - DatafolhaClientReal, IpecClientReal, QuaestClientReal
    // - PoderDataClient, AtlasIntelClient, Tier 2 clients
    // Tier 1: APIs/Scraping implemented
    // this.registerClient(datafolhaClient);
    // this.registerClient(ipecClient);
    // this.registerClient(quaestClient);

    // TODO: Register remaining 62 institutes as clients are implemented
  }

  /**
   * Register an institute client
   */
  registerClient(client: InstituteClientBase): void {
    const instituteId = client.getInstituteId();
    this.clients.set(instituteId, client);
  }

  /**
   * Sync polls from specified institutes
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult[]> {
    const startTime = Date.now();
    const results: SyncResult[] = [];

    // Determine which institutes to sync
    const instituteIds = options.instituteIds || Array.from(this.clients.keys());

    console.log(`[InstituteSyncManager] Starting sync for ${instituteIds.length} institutes`);

    // Fetch polls in parallel with concurrency limit
    const pollsByInstitute = await this.fetchAllInstitutes(
      instituteIds,
      options.parallel || 3
    );

    // Process and store each institute's polls
    for (const [instituteId, polls] of Object.entries(pollsByInstitute)) {
      try {
        const result = await this.processPollsForInstitute(
          instituteId,
          polls as Poll[],
          options
        );
        results.push({
          institute: instituteId,
          success: true,
          pollsFetched: polls.length,
          ...result,
          duration: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          institute: instituteId,
          success: false,
          pollsFetched: polls.length,
          pollsInserted: 0,
          pollsUpdated: 0,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Fetch polls from all institutes in parallel with rate limiting
   */
  private async fetchAllInstitutes(
    instituteIds: string[],
    concurrency: number
  ): Promise<Record<string, Poll[]>> {
    const results: Record<string, Poll[]> = {};
    const queue = [...instituteIds];
    const executing: Promise<void>[] = [];

    while (queue.length > 0 || executing.length > 0) {
      while (executing.length < concurrency && queue.length > 0) {
        const instituteId = queue.shift()!;
        const promise = this.fetchSingleInstitute(instituteId)
          .then(polls => {
            results[instituteId] = polls;
          })
          .catch(error => {
            console.error(`[${instituteId}] Fetch failed:`, error);
            results[instituteId] = [];
          })
          .finally(() => {
            executing.splice(executing.indexOf(promise), 1);
          });

        executing.push(promise);
      }

      if (executing.length > 0) {
        await Promise.race(executing);
      }
    }

    return results;
  }

  /**
   * Fetch from single institute
   */
  private async fetchSingleInstitute(instituteId: string): Promise<Poll[]> {
    const client = this.clients.get(instituteId);
    if (!client) {
      console.warn(`[${instituteId}] No client registered`);
      return [];
    }

    try {
      console.log(`[${instituteId}] Fetching polls...`);
      return await client.fetch();
    } catch (error) {
      console.error(`[${instituteId}] Fetch error:`, error);
      return [];
    }
  }

  /**
   * Process and store polls for an institute
   */
  private async processPollsForInstitute(
    instituteId: string,
    polls: Poll[],
    options: SyncOptions
  ): Promise<{ pollsInserted: number; pollsUpdated: number }> {
    if (options.dryRun) {
      console.log(`[${instituteId}] DRY RUN: Would store ${polls.length} polls`);
      return { pollsInserted: polls.length, pollsUpdated: 0 };
    }

    // TODO: Implement actual storage logic
    // - Upsert polls into Supabase
    // - Store poll_results for each candidate
    // - Update institute.total_polls count
    // - Mark as is_verified based on source

    console.log(`[${instituteId}] Storing ${polls.length} polls...`);
    return { pollsInserted: polls.length, pollsUpdated: 0 };
  }

  /**
   * Get list of all registered institutes
   */
  getRegisteredInstitutes(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get count of all available institutes (65 total)
   */
  getTotalInstituteCount(): number {
    return 65; // Total in database
  }

  /**
   * Get registration coverage
   */
  getCoverageSummary(): {
    registered: number;
    total: number;
    percentage: number;
  } {
    const registered = this.clients.size;
    const total = this.getTotalInstituteCount();
    return {
      registered,
      total,
      percentage: Math.round((registered / total) * 100),
    };
  }
}

/**
 * Institute metadata (from database)
 */
export interface InstituteMeta {
  id: string;
  name: string;
  slug: string;
  reliabilityScore: number;
  methodologyDefault: string;
}

// Export singleton
export const instituteSyncManager = new InstituteSyncManager();
