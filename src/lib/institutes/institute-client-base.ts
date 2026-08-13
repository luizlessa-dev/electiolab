/**
 * Abstract Base Client for All Brazilian Polling Institutes
 *
 * Provides:
 * - Unified interface for all 65 institutes
 * - Retry logic with exponential backoff
 * - Rate limiting and throttling
 * - Data normalization to standard format
 *
 * Subclass pattern for specific institutes (Datafolha, Ipec, Quaest, etc)
 */

export interface PollResult {
  candidateId: string;
  candidateName: string;
  percentage: number;
  margin?: number;
}

export interface Poll {
  id: string;
  instituteId: string;
  instituteName: string;
  electionId?: string;
  publishDate: Date;
  fieldworkEnd: Date;
  fieldworkStart?: Date;
  sampleSize: number;
  marginOfError?: number;
  confidenceLevel?: number;
  methodology: 'presencial' | 'telefonica' | 'mista' | 'online';
  results: PollResult[];
  sourceUrl?: string;
  isVerified: boolean;
  reliabilityScore: number;
}

/**
 * Loose shape accepted by normalizePoll().
 *
 * Institute clients build this object from freshly scraped/parsed data
 * (third-party HTML or JSON payloads), so most fields are optional and both
 * camelCase and the legacy snake_case source keys normalizePoll() falls back
 * to are represented here.
 */
export interface NormalizePollInput {
  id: string;
  publishDate?: Date | string | number;
  publication_date?: Date | string | number;
  fieldworkEnd?: Date | string | number;
  fieldwork_end?: Date | string | number;
  fieldworkStart?: Date | string | number;
  sampleSize?: number | string;
  sample_size?: number | string;
  marginOfError?: number | string;
  margin_of_error?: number | string;
  confidenceLevel?: number;
  confidence_level?: number;
  methodology?: string;
  results?: PollResult[];
  sourceUrl?: string;
  source_url?: string;
  isVerified?: boolean;
}

/**
 * Narrows an unknown value (typically JSON.parse() output from a
 * third-party site) down to a plain object we can safely index into.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Base class for all institute clients
 *
 * Usage:
 * ```typescript
 * class DatafolhaClient extends InstituteClientBase {
 *   constructor() {
 *     super({
 *       instituteId: 'datafolha',
 *       instituteName: 'Datafolha',
 *       reliabilityScore: 0.92,
 *       baseUrl: 'https://datafolha.folha.uol.com.br'
 *     })
 *   }
 *
 *   async fetch(): Promise<Poll[]> {
 *     // Implement specific API call or scraping
 *   }
 * }
 * ```
 */
export abstract class InstituteClientBase {
  protected instituteId: string;
  protected instituteName: string;
  protected reliabilityScore: number;
  protected baseUrl: string;
  protected retryConfig: RetryConfig;

  private lastRequestTime = 0;
  private requestDelay = 1000; // 1s between requests (respect rate limits)

  protected userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  ];

  constructor(config: {
    instituteId: string;
    instituteName: string;
    reliabilityScore: number; // 0-1
    baseUrl: string;
    retryConfig?: Partial<RetryConfig>;
  }) {
    this.instituteId = config.instituteId;
    this.instituteName = config.instituteName;
    this.reliabilityScore = config.reliabilityScore;
    this.baseUrl = config.baseUrl;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retryConfig };
  }

  /**
   * Main method to fetch and parse polls
   * Subclasses implement specific logic
   */
  abstract fetch(): Promise<Poll[]>;

  /**
   * Throttle requests to respect rate limits
   */
  protected async throttleRequest(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.requestDelay) {
      await new Promise(resolve =>
        setTimeout(resolve, this.requestDelay - elapsed)
      );
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

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.retryConfig.initialDelayMs *
            Math.pow(this.retryConfig.backoffMultiplier, attempt);
          console.warn(
            `${this.instituteName} ${context} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}), ` +
            `retrying in ${delay}ms`,
            error
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(
            `${this.instituteName} ${context} failed after ${this.retryConfig.maxRetries + 1} attempts:`,
            error
          );
        }
      }
    }

    throw lastError || new Error(`${this.instituteName} ${context} failed after retries`);
  }

  /**
   * Fetch with User-Agent rotation
   */
  protected async fetchWithUserAgent(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
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
      throw new Error(
        `${this.instituteName} API error: ${response.status} ${response.statusText} from ${url}`
      );
    }

    return response;
  }

  /**
   * Get random User-Agent to avoid detection
   */
  protected getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Normalize poll data to standard format
   */
  protected normalizePoll(data: NormalizePollInput): Poll {
    return {
      id: data.id,
      instituteId: this.instituteId,
      instituteName: this.instituteName,
      publishDate: new Date((data.publishDate || data.publication_date) as string | number | Date),
      fieldworkEnd: new Date((data.fieldworkEnd || data.fieldwork_end) as string | number | Date),
      fieldworkStart: data.fieldworkStart ? new Date(data.fieldworkStart) : undefined,
      sampleSize: parseInt(String(data.sampleSize || data.sample_size)) || 0,
      marginOfError: parseFloat(String(data.marginOfError || data.margin_of_error)) || undefined,
      confidenceLevel: data.confidenceLevel || data.confidence_level || 95,
      methodology: (data.methodology || 'presencial').toLowerCase() as Poll['methodology'],
      results: Array.isArray(data.results) ? data.results : [],
      sourceUrl: data.sourceUrl || data.source_url,
      isVerified: data.isVerified || false,
      reliabilityScore: this.reliabilityScore,
    };
  }
}

/**
 * Export all institute client singletons
 * Will be populated as clients are implemented
 */
export const instituteClients: { [key: string]: InstituteClientBase } = {};

/**
 * Register an institute client
 */
export function registerInstituteClient(client: InstituteClientBase): void {
  instituteClients[client['instituteId']] = client;
}
