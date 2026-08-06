/**
 * TSE (Tribunal Superior Eleitoral) Base Client
 *
 * Official election data from Brazil's Electoral Justice System
 *
 * APIs Available:
 * 1. DivulgaCandContas - Candidate Registry (unofficial, needs proxy)
 * 2. TSE Resultados - Live election results during apuração (official)
 * 3. Consulta Pública - Search candidates and results
 *
 * Rate Limiting:
 * - ~50 requests per IP before temporary block
 * - Use exponential backoff: 1s → 2s → 4s (max 3 retries)
 * - Add random User-Agent headers
 *
 * Data Quality:
 * - Official government source (100% credibility)
 * - Updated in real-time during apuração
 * - Reliable for live tracking
 */

export interface TSECandidate {
  id: string; // TSE candidate ID
  name: string;
  party: string;
  position: 'presidente' | 'governador' | 'senador' | 'deputado';
  state?: string;
  year: number;
  status: 'registrado' | 'cancelado' | 'inapto' | 'excluido';
}

export interface TSEResult {
  electionId: string;
  state: string;
  position: 'presidente' | 'governador' | 'senador' | 'deputado';
  candidateId: string;
  candidateName: string;
  party: string;
  votes: number;
  percentage?: number; // calculated after poll closes
  round: 1 | 2;
  updateTime: Date;
}

export interface TSEApuracaoStatus {
  state: string;
  position: 'presidente' | 'governador';
  round: 1 | 2;
  sectionsTotal: number;
  sectionsProcessed: number;
  percentComplete: number;
  lastUpdate: Date;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Base TSE Client with retry logic and rate limiting
 */
export class TSEClient {
  private lastRequestTime = 0;
  private requestDelay = 1000; // 1 second between requests
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  ];

  /**
   * Get random User-Agent to avoid blocking
   */
  protected getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Throttle requests to avoid rate limiting
   */
  protected async throttleRequest(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Retry wrapper with exponential backoff
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    context: string = 'request'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
          console.warn(
            `TSE ${context} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}), retrying in ${delay}ms`,
            error
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`TSE ${context} failed after ${RETRY_CONFIG.maxRetries + 1} attempts:`, error);
        }
      }
    }

    throw lastError || new Error(`TSE ${context} failed after retries`);
  }

  /**
   * Fetch with User-Agent and error handling
   */
  protected async fetchWithUserAgent(url: string, options: RequestInit = {}): Promise<Response> {
    await this.throttleRequest();

    const headers = {
      ...options.headers,
      'User-Agent': this.getRandomUserAgent(),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`TSE API error: ${response.status} ${response.statusText} from ${url}`);
    }

    return response;
  }

  /**
   * Parse candidates from TSE API response
   * Override in subclass for specific endpoint
   */
  protected parseCandidates(data: unknown): TSECandidate[] {
    if (!data || typeof data !== 'object') return [];

    const obj = data as Record<string, unknown>;
    const candidates: TSECandidate[] = [];

    // Handle array of candidates
    const list = Array.isArray(obj) ? obj : Array.isArray(obj.data) ? obj.data : [];

    for (const item of list) {
      if (typeof item !== 'object' || !item) continue;

      const c = item as Record<string, unknown>;
      try {
        candidates.push({
          id: String(c.id || c.sequencial || ''),
          name: String(c.nome || c.name || ''),
          party: String(c.partido || c.sigla_partido || ''),
          position: (c.cargo || c.position || 'presidente') as any,
          state: c.uf || c.estado ? String(c.uf || c.estado) : undefined,
          year: parseInt(String(c.ano || new Date().getFullYear())),
          status: (c.situacao || c.status || 'registrado') as any,
        });
      } catch (error) {
        console.warn('Failed to parse TSE candidate:', error);
      }
    }

    return candidates;
  }

  /**
   * Parse results from TSE API response
   * Override in subclass for specific endpoint
   */
  protected parseResults(data: unknown): TSEResult[] {
    if (!data || typeof data !== 'object') return [];

    const obj = data as Record<string, unknown>;
    const results: TSEResult[] = [];

    // Handle various TSE response formats
    const list = Array.isArray(obj)
      ? obj
      : Array.isArray(obj.dados)
        ? obj.dados
        : Array.isArray(obj.resultados)
          ? obj.resultados
          : [];

    for (const item of list) {
      if (typeof item !== 'object' || !item) continue;

      const r = item as Record<string, unknown>;
      try {
        const votes = parseInt(String(r.votos || r.votacao || '0'));
        const percentage =
          typeof r.percentual === 'number'
            ? r.percentual
            : typeof r.percentual === 'string'
              ? parseFloat(r.percentual)
              : undefined;

        results.push({
          electionId: String(r.eleicao_id || r.election_id || ''),
          state: String(r.uf || r.estado || ''),
          position: (r.cargo || r.position || 'presidente') as any,
          candidateId: String(r.candidato_id || r.candidate_id || ''),
          candidateName: String(r.candidato_nome || r.candidate_name || ''),
          party: String(r.partido || r.party || ''),
          votes,
          percentage,
          round: parseInt(String(r.turno || '1')) as 1 | 2,
          updateTime: new Date(r.data_atualizacao || r.updated_at || new Date()),
        });
      } catch (error) {
        console.warn('Failed to parse TSE result:', error);
      }
    }

    return results;
  }
}

/**
 * Specialization for DivulgaCandContas API
 */
export class DivulgaCandContasClient extends TSEClient {
  private readonly baseUrl = 'https://divulgacandcontas.tse.jus.br/api';

  /**
   * Search candidates by position and year
   * Note: This endpoint has no CORS support - requires backend proxy
   */
  async searchCandidatos(
    ano: number,
    cargo: 'presidente' | 'governador' | 'senador' | 'deputado',
    estado?: string
  ): Promise<TSECandidate[]> {
    return this.withRetry(async () => {
      // URL pattern: /api/v1/candidato/listar
      // Requires proxy for CORS
      const params = new URLSearchParams({
        ano: ano.toString(),
        cargo,
        ...(estado && { estado }),
      });

      const url = `${this.baseUrl}/v1/candidato/listar?${params}`;
      const response = await this.fetchWithUserAgent(url);
      const data = await response.json();

      return this.parseCandidates(data);
    }, `DivulgaCandContas search for ${cargo} ${ano}`);
  }
}

/**
 * Specialization for TSE Resultados (official results during apuração)
 */
export class TSEResultadosClient extends TSEClient {
  private readonly baseUrl = 'https://resultados.tse.jus.br/oficial/app';

  /**
   * Get live results for presidente
   */
  async buscarResultadosPresidencial(
    ano: number,
    turno: 1 | 2
  ): Promise<TSEResult[]> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/index.html?p=${ano}&m=${turno}&c=P`;
      const response = await this.fetchWithUserAgent(url);
      const html = await response.text();

      // Parse HTML for results data (typically in JSON embedded in page)
      const data = this.extractJSONFromHTML(html);
      return this.parseResults(data);
    }, `TSE Resultados presidente ${ano} turno ${turno}`);
  }

  /**
   * Get live results for governador by state
   */
  async buscarResultadosGovernador(
    ano: number,
    estado: string,
    turno: 1 | 2
  ): Promise<TSEResult[]> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/index.html?p=${ano}&m=${turno}&c=G&e=${estado}`;
      const response = await this.fetchWithUserAgent(url);
      const html = await response.text();

      const data = this.extractJSONFromHTML(html);
      return this.parseResults(data);
    }, `TSE Resultados governador ${estado} ${ano} turno ${turno}`);
  }

  /**
   * Get apuração status (how many sections have been counted)
   */
  async buscarStatusApuracao(ano: number): Promise<TSEApuracaoStatus[]> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/api/status?ano=${ano}`;
      const response = await this.fetchWithUserAgent(url);
      const data = await response.json();

      // Parse and return status data
      return this.parseApuracaoStatus(data);
    }, `TSE status apuração ${ano}`);
  }

  /**
   * Extract JSON from HTML page (data usually embedded in <script> tags)
   */
  private extractJSONFromHTML(html: string): unknown {
    // Look for window.__data = { ... } pattern
    const match = html.match(/window\.__data\s*=\s*({.*?});/s);
    if (!match) {
      throw new Error('Could not find data in TSE response');
    }

    return JSON.parse(match[1]);
  }

  /**
   * Parse apuração status from response
   */
  private parseApuracaoStatus(data: unknown): TSEApuracaoStatus[] {
    if (!data || typeof data !== 'object') return [];

    const obj = data as Record<string, unknown>;
    const statuses: TSEApuracaoStatus[] = [];

    // TSE typically returns status by state and position
    const list = Array.isArray(obj.status)
      ? obj.status
      : Array.isArray(obj)
        ? obj
        : [];

    for (const item of list) {
      if (typeof item !== 'object' || !item) continue;

      const s = item as Record<string, unknown>;
      try {
        const sectionsProcessed = parseInt(String(s.secoes_totalizadas || s.processed || '0'));
        const sectionsTotal = parseInt(String(s.secoes_totais || s.total || '1'));

        statuses.push({
          state: String(s.uf || s.estado || 'BR'),
          position: (s.cargo || s.position || 'presidente') as any,
          round: parseInt(String(s.turno || '1')) as 1 | 2,
          sectionsTotal,
          sectionsProcessed,
          percentComplete:
            sectionsTotal > 0
              ? Math.round((sectionsProcessed / sectionsTotal) * 100)
              : 0,
          lastUpdate: new Date(s.ultima_atualizacao || s.last_update || new Date()),
        });
      } catch (error) {
        console.warn('Failed to parse TSE apuração status:', error);
      }
    }

    return statuses;
  }
}

/**
 * Export singleton instances
 */
export const divulgaCandContasClient = new DivulgaCandContasClient();
export const tseResultadosClient = new TSEResultadosClient();
