/**
 * Scraper Router - Intelligent Request Routing
 *
 * Routes requests intelligently:
 * 1. Try Cheerio (80% of sites) - fast, serverless-ready
 * 2. Use Lambda Layer (20% complex) - JS rendering
 * 3. Fallback to external service if needed
 *
 * Maintains list of known complex sites that need Lambda
 */

export interface ScraperRequest {
  url: string;
  instituteId: string;
  instituteType?: 'simple' | 'complex' | 'auto';
}

export interface ScraperResponse {
  success: boolean;
  strategy: 'cheerio' | 'lambda' | 'external' | 'failed';
  data?: any;
  duration: number;
  error?: string;
}

// Known complex sites that require JavaScript rendering
const COMPLEX_SITES = [
  'datafolha.folha.uol.com.br', // React SPA
  'atlasinteligencia.com.br', // Dynamic dashboard
  'ictouch.com.br', // JavaScript-heavy
];

// Sites known to work perfectly with Cheerio
const SIMPLE_SITES = [
  'example.com', // Static HTML
  'news.site', // Traditional news site
];

export class ScraperRouter {
  /**
   * Determine best strategy for URL
   */
  static determinStrategy(
    url: string,
    override?: 'simple' | 'complex' | 'auto'
  ): 'cheerio' | 'lambda' | 'external' {
    if (override === 'simple') return 'cheerio';
    if (override === 'complex') return 'lambda';

    // Check known complex sites
    for (const complex of COMPLEX_SITES) {
      if (url.includes(complex)) return 'lambda';
    }

    // Check known simple sites
    for (const simple of SIMPLE_SITES) {
      if (url.includes(simple)) return 'cheerio';
    }

    // Default: try Cheerio first, fallback to Lambda
    return 'cheerio';
  }

  /**
   * Route request to appropriate scraper
   */
  static async route(request: ScraperRequest): Promise<ScraperResponse> {
    const startTime = Date.now();
    const strategy = this.determinStrategy(request.url, request.instituteType as any);

    try {
      switch (strategy) {
        case 'cheerio':
          return await this.tryCheerio(request, startTime);

        case 'lambda':
          return await this.tryLambda(request, startTime);

        case 'external':
          return await this.tryExternal(request, startTime);
      }
    } catch (error) {
      console.error(`[Router] Error with ${strategy}:`, error);

      // Fallback chain
      if (strategy !== 'lambda') {
        console.log(`[Router] Falling back to Lambda for ${request.instituteId}`);
        return await this.tryLambda(request, startTime).catch(() =>
          this.returnFailure(strategy, error, startTime)
        );
      }

      return this.returnFailure(strategy, error, startTime);
    }
  }

  /**
   * Try Cheerio scraper (lightweight, 0 cold start)
   */
  private static async tryCheerio(
    request: ScraperRequest,
    startTime: number
  ): Promise<ScraperResponse> {
    console.log(`[Router] Trying Cheerio for ${request.instituteId}`);

    // Placeholder: would call actual Cheerio client
    // const client = getCheerioClient(request.instituteId);
    // const data = await client.fetch();

    return {
      success: true,
      strategy: 'cheerio',
      data: {}, // Mock
      duration: Date.now() - startTime,
    };
  }

  /**
   * Try Lambda layer (Playwright, full JS rendering)
   */
  private static async tryLambda(
    request: ScraperRequest,
    startTime: number
  ): Promise<ScraperResponse> {
    console.log(`[Router] Trying Lambda for ${request.instituteId}`);

    // Placeholder: would call Lambda layer via API
    // const response = await fetch(process.env.LAMBDA_ENDPOINT, {
    //   method: 'POST',
    //   body: JSON.stringify({ url: request.url })
    // });

    return {
      success: true,
      strategy: 'lambda',
      data: {}, // Mock
      duration: Date.now() - startTime,
    };
  }

  /**
   * Try external scraping service (ScraperAPI, etc)
   */
  private static async tryExternal(
    request: ScraperRequest,
    startTime: number
  ): Promise<ScraperResponse> {
    if (!process.env.SCRAPER_API_KEY) {
      throw new Error('SCRAPER_API_KEY not configured');
    }

    console.log(`[Router] Trying external service for ${request.instituteId}`);

    // Placeholder: would call external API
    // const response = await fetch('https://api.scraperapi.com', {
    //   params: { api_key, url: request.url }
    // });

    return {
      success: true,
      strategy: 'external',
      data: {},
      duration: Date.now() - startTime,
    };
  }

  /**
   * Return failure response
   */
  private static returnFailure(
    strategy: string,
    error: any,
    startTime: number
  ): ScraperResponse {
    return {
      success: false,
      strategy: 'failed' as const,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Register known complex site
   */
  static registerComplexSite(url: string): void {
    if (!COMPLEX_SITES.includes(url)) {
      COMPLEX_SITES.push(url);
      console.log(`[Router] Registered complex site: ${url}`);
    }
  }

  /**
   * Register known simple site
   */
  static registerSimpleSite(url: string): void {
    if (!SIMPLE_SITES.includes(url)) {
      SIMPLE_SITES.push(url);
      console.log(`[Router] Registered simple site: ${url}`);
    }
  }
}

export const router = ScraperRouter;
