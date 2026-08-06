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

// import { PollData, PollingResult, CacheEntry } from '../types/polling'; // TODO: create types

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

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
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
];

class DatafolhaClient {
  private cache: Map<string, CacheEntry<DatafolhaPoll[]>> = new Map();
  private lastRequestTime = 0;
  private requestDelay = 1000; // 1 second between requests

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  private async throttleRequest(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

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
   * Convert Datafolha poll to internal format
   */
  toPollData(datafolhaPoll: DatafolhaPoll, electionId: string) {
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
    // Datafolha typically publishes polls with this HTML structure:
    // <div class="poll-data">
    //   <span class="candidate">Nome</span>
    //   <span class="percentage">XX%</span>
    //   <span class="date">DD/MM/YYYY</span>
    // </div>

    await this.throttleRequest();
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
      },
    });
    const html = await response.text();

    try {
      // Extract JSON data embedded in page (common pattern)
      const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
      if (!jsonMatch) {
        console.warn('Datafolha: Could not find JSON data in page');
        return [];
      }

      const data = JSON.parse(jsonMatch[1]);
      return this.parseDatafolhaJSON(data, options);
    } catch (error) {
      console.error('Failed to parse Datafolha data:', error);
      throw error;
    }
  }

  private parseDatafolhaJSON(
    data: Record<string, unknown>,
    options: DatafolhaSearchOptions
  ): DatafolhaPoll[] {
    // Parse structure depends on Datafolha's actual JSON format
    // This is a template - adjust based on real data structure

    const polls: DatafolhaPoll[] = [];

    // Example structure (adjust to actual Datafolha format):
    // data.pesquisas = [{ id, titulo, data_fim, tamanho_amostra, resultados: [] }]

    // For now, implement a safe parser that handles common cases
    if (!Array.isArray(data.pesquisas)) {
      return [];
    }

    for (const poll of data.pesquisas) {
      try {
        const datafolhaPoll: DatafolhaPoll = {
          id: poll.id || `df-${Date.now()}`,
          publishDate: new Date(poll.data_publicacao || new Date()),
          fieldworkEnd: new Date(poll.data_fim || new Date()),
          sampleSize: parseInt(poll.tamanho_amostra || '0'),
          methodology: this.parseMethodology(poll.metodologia),
          marginOfError: this.parseMarginOfError(poll.margem_erro),
          results: this.parseResults(poll.resultados || []),
          source: 'Datafolha (web scraping)',
          reliabilityScore: CREDIBILITY_SCORE,
        };

        if (datafolhaPoll.sampleSize > 0 && datafolhaPoll.results.length > 0) {
          polls.push(datafolhaPoll);
        }
      } catch (error) {
        console.warn(`Failed to parse Datafolha poll:`, error);
        continue;
      }
    }

    return polls;
  }

  private parseMethodology(
    method?: string
  ): 'presencial' | 'mista' | 'online' {
    if (!method) return 'presencial';

    const lower = method.toLowerCase();
    if (lower.includes('telefon')) return 'presencial'; // telefone is presencial
    if (lower.includes('mist')) return 'mista';
    if (lower.includes('online') || lower.includes('internet')) return 'online';
    if (lower.includes('presencial')) return 'presencial';

    return 'presencial'; // default
  }

  private parseMarginOfError(moe?: string | number): number | undefined {
    if (!moe) return undefined;

    const value = typeof moe === 'string' ? parseFloat(moe) : moe;
    return isNaN(value) ? undefined : value;
  }

  private parseResults(
    results: unknown[]
  ): DatafolhaPoll['results'] {
    if (!Array.isArray(results)) return [];

    return results
      .map(r => {
        if (typeof r !== 'object' || !r) return null;

        const obj = r as Record<string, unknown>;
        return {
          candidateId: String(obj.candidato_id || obj.id || ''),
          candidateName: String(obj.candidato_nome || obj.nome || ''),
          percentage: parseFloat(String(obj.percentual || obj.pct || '0')),
          margin: parseFloat(String(obj.margem || '0')),
        };
      })
      .filter(
        (r) =>
          r !== null &&
          r.candidateId &&
          r.candidateName &&
          r.percentage > 0
      ) as DatafolhaPoll['results'];
  }

  private estimateMoE(sampleSize: number): number {
    // Standard formula: 1.96 * sqrt(0.25 / n)
    // Using p=0.5 (worst case) for conservatism
    // Datafolha typically has MoE of 2.0-2.5% for large samples
    if (sampleSize <= 0) return 5.0;
    return parseFloat((1.96 * Math.sqrt(0.25 / sampleSize)).toFixed(2));
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
