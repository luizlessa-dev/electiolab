/**
 * Datafolha Polling Institute Client
 *
 * Institute Profile:
 * - Credibility Score: 9/10 (one of Brazil's most trusted pollsters)
 * - Update Frequency: Daily
 * - Cache TTL: 24 hours
 * - Typical MoE: 2.0-2.5%
 *
 * API: Uses unofficial web scraping (CORS-friendly)
 * Last Updated: 2026-08-05
 */

import { PollData, PollingResult, CacheEntry } from '../types/polling';

export interface DatafolhaPoll {
  id: string;
  publishDate: Date;
  fieldworkEnd: Date;
  sampleSize: number;
  methodology: 'presencial' | 'mista' | 'online';
  marginOfError?: number;
  results: {
    candidateId: string;
    candidateName: string;
    percentage: number;
    margin?: number;
  }[];
  source: string;
  reliabilityScore: number; // 9/10
}

export interface DatafolhaSearchOptions {
  cargo: 'presidente' | 'governador' | 'senador';
  estado?: string; // required for governador/senador
  ano?: number;
  scenario?: string; // "lula-vs-bolsonaro" format for 2T
}

const CREDIBILITY_SCORE = 9; // Datafolha é confiável
const CACHE_TTL_HOURS = 24;
const BASE_URL = 'https://datafolha.folha.uol.com.br';

class DatafolhaClient {
  private cache: Map<string, CacheEntry<DatafolhaPoll[]>> = new Map();
  private lastRequestTime = 0;
  private requestDelay = 1000; // 1 second between requests

  /**
   * Search for presidential polls
   */
  async searchPresidencial(ano: number = new Date().getFullYear()): Promise<DatafolhaPoll[]> {
    const cacheKey = `datafolha:presidente:${ano}`;

    if (this.isCached(cacheKey)) {
      return this.getFromCache(cacheKey);
    }

    await this.throttleRequest();

    try {
      // Datafolha typically publishes: presidencial polls
      // URL pattern: https://datafolha.folha.uol.com.br/pesquisa/...
      const polls = await this.fetchAndParse(
        `${BASE_URL}/pesquisa/`,
        { cargo: 'presidente', ano }
      );

      this.setCache(cacheKey, polls);
      return polls;
    } catch (error) {
      console.error(`Datafolha search failed for presidente ${ano}:`, error);
      throw new Error(`Failed to fetch Datafolha presidential polls: ${error}`);
    }
  }

  /**
   * Search for gubernatorial polls by state
   */
  async searchGovernador(
    estado: string,
    ano: number = new Date().getFullYear()
  ): Promise<DatafolhaPoll[]> {
    const cacheKey = `datafolha:governador:${estado}:${ano}`;

    if (this.isCached(cacheKey)) {
      return this.getFromCache(cacheKey);
    }

    await this.throttleRequest();

    try {
      const polls = await this.fetchAndParse(
        `${BASE_URL}/pesquisa/`,
        { cargo: 'governador', estado, ano }
      );

      this.setCache(cacheKey, polls);
      return polls;
    } catch (error) {
      console.error(`Datafolha search failed for governador ${estado} ${ano}:`, error);
      throw new Error(`Failed to fetch Datafolha gubernatorial polls: ${error}`);
    }
  }

  /**
   * Get latest poll for a candidate pair (second round scenario)
   */
  async getLatestScenario(
    scenario: string, // "lula-vs-bolsonaro"
    ano: number = new Date().getFullYear()
  ): Promise<DatafolhaPoll | null> {
    const cacheKey = `datafolha:scenario:${scenario}:${ano}`;

    if (this.isCached(cacheKey)) {
      const cached = this.getFromCache(cacheKey);
      return cached.length > 0 ? cached[0] : null;
    }

    await this.throttleRequest();

    try {
      const polls = await this.fetchAndParse(
        `${BASE_URL}/pesquisa/`,
        { cargo: 'presidente', ano, scenario }
      );

      this.setCache(cacheKey, polls);
      return polls.length > 0 ? polls[0] : null;
    } catch (error) {
      console.error(`Datafolha scenario search failed for ${scenario}:`, error);
      return null;
    }
  }

  /**
   * Convert Datafolha poll to internal PollData format
   */
  toPollData(datafolhaPoll: DatafolhaPoll, electionId: string): PollData {
    return {
      id: `datafolha-${datafolhaPoll.id}`,
      electionId,
      instituteId: 'datafolha',
      instituteName: 'Datafolha',
      credibilityScore: CREDIBILITY_SCORE,
      publishDate: datafolhaPoll.publishDate,
      fieldworkEnd: datafolhaPoll.fieldworkEnd,
      sampleSize: datafolhaPoll.sampleSize,
      methodology: datafolhaPoll.methodology,
      marginOfError: datafolhaPoll.marginOfError || this.estimateMoE(datafolhaPoll.sampleSize),
      results: datafolhaPoll.results.map(r => ({
        candidateId: r.candidateId,
        candidateName: r.candidateName,
        percentage: r.percentage,
      })),
      source: datafolhaPoll.source,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async fetchAndParse(
    url: string,
    options: DatafolhaSearchOptions
  ): Promise<DatafolhaPoll[]> {
    // TODO: Implement web scraping or API integration
    // For now, returns empty array as placeholder
    //
    // Steps:
    // 1. Fetch HTML from Datafolha website
    // 2. Parse poll data from page
    // 3. Extract candidate names, percentages, dates
    // 4. Validate and return structured data

    console.warn('Datafolha client: Web scraping not yet implemented');
    return [];
  }

  private estimateMoE(sampleSize: number): number {
    // Standard formula: 1.96 * sqrt(0.25 / n)
    // Using p=0.5 (worst case) for conservatism
    // Datafolha typically has MoE of 2.0-2.5% for large samples
    if (sampleSize <= 0) return 5.0;
    return parseFloat((1.96 * Math.sqrt(0.25 / sampleSize)).toFixed(2));
  }

  private async throttleRequest(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private isCached(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    const ttl = CACHE_TTL_HOURS * 60 * 60 * 1000;

    if (age > ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  private getFromCache(key: string): DatafolhaPoll[] {
    return this.cache.get(key)?.data || [];
  }

  private setCache(key: string, data: DatafolhaPoll[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

// Export singleton instance
export const datafolhaClient = new DatafolhaClient();
