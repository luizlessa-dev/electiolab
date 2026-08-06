/**
 * Lambda Playwright Scraper Client
 *
 * For complex JavaScript-heavy sites that Cheerio can't handle
 * - Renders full page JavaScript
 * - Handles dynamic content, SPAs, and client-side rendering
 * - 8-12s cold start (acceptable for async tasks)
 * - 500-1000ms warm requests
 *
 * Assumes AWS Lambda Layer with Playwright is available
 * Fallback: local Playwright (dev environment)
 */

import { InstituteClientBase, Poll } from './institute-client-base';

export interface PlaywrightConfig {
  instituteId: string;
  instituteName: string;
  reliabilityScore: number;
  baseUrl: string;
  timeout?: number; // milliseconds
  waitSelector?: string; // CSS selector to wait for before scraping
}

export class LambdaPlaywrightClient extends InstituteClientBase {
  protected config: PlaywrightConfig;
  protected lambdaEndpoint?: string;

  constructor(config: PlaywrightConfig) {
    super({
      instituteId: config.instituteId,
      instituteName: config.instituteName,
      reliabilityScore: config.reliabilityScore,
      baseUrl: config.baseUrl,
    });
    this.config = config;
    this.lambdaEndpoint = process.env.LAMBDA_PLAYWRIGHT_ENDPOINT;
  }

  /**
   * Fetch using Lambda layer (full JS rendering)
   */
  async fetch(): Promise<Poll[]> {
    return this.withRetry(async () => {
      console.log(`[${this.config.instituteName}] Fetching with Lambda/Playwright...`);

      // Try Lambda layer first (production)
      if (this.lambdaEndpoint && process.env.NODE_ENV === 'production') {
        return await this.fetchViaLambda();
      }

      // Fallback to local Playwright (development)
      console.log(`[${this.config.instituteName}] Lambda not available, using local Playwright...`);
      return await this.fetchViaLocalPlaywright();
    }, `${this.config.instituteName} Lambda/Playwright fetch`);
  }

  /**
   * Invoke Lambda layer for rendering
   */
  private async fetchViaLambda(): Promise<Poll[]> {
    try {
      const response = await fetch(this.lambdaEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.LAMBDA_API_KEY || '',
        },
        body: JSON.stringify({
          url: this.config.baseUrl,
          timeout: this.config.timeout || 30000,
          waitSelector: this.config.waitSelector,
        }),
      });

      if (!response.ok) {
        throw new Error(`Lambda error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.html) {
        throw new Error('No HTML returned from Lambda');
      }

      // Parse the rendered HTML
      const polls = this.extractPolls(data.html);
      console.log(
        `[${this.config.instituteName}] Found ${polls.length} polls (via Lambda)`
      );

      return polls;
    } catch (error) {
      console.error(`[${this.config.instituteName}] Lambda fetch failed:`, error);
      throw error;
    }
  }

  /**
   * Local Playwright rendering (development/fallback)
   * Requires: npm install playwright
   */
  private async fetchViaLocalPlaywright(): Promise<Poll[]> {
    try {
      // Lazy load Playwright to avoid requiring it in production
      const { chromium } = await import('playwright');

      console.log(`[${this.config.instituteName}] Launching browser...`);
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      const page = await context.newPage();

      // Set timeout
      const timeout = this.config.timeout || 30000;
      page.setDefaultTimeout(timeout);

      console.log(`[${this.config.instituteName}] Loading URL...`);
      await page.goto(this.config.baseUrl, {
        waitUntil: 'networkidle',
        timeout,
      });

      // Wait for specific selector if provided
      if (this.config.waitSelector) {
        console.log(`[${this.config.instituteName}] Waiting for ${this.config.waitSelector}...`);
        await page.waitForSelector(this.config.waitSelector, { timeout });
      }

      // Extract HTML after JS rendering
      const html = await page.content();

      // Cleanup
      await context.close();
      await browser.close();

      // Parse rendered HTML
      const polls = this.extractPolls(html);
      console.log(
        `[${this.config.instituteName}] Found ${polls.length} polls (via local Playwright)`
      );

      return polls;
    } catch (error) {
      console.error(`[${this.config.instituteName}] Local Playwright fetch failed:`, error);
      throw error;
    }
  }

  /**
   * Extract polls from rendered HTML
   * Override in subclasses for site-specific parsing
   */
  protected extractPolls(html: string): Poll[] {
    const polls: Poll[] = [];

    // Generic extraction from rendered HTML
    // Look for common poll patterns in the DOM
    const patterns = [
      // Pattern 1: "Candidate - XX%"
      /([A-ZÀ-Ÿ][a-zà-ÿ\s]{2,}?)\s*[–\-:]\s*(\d+(?:[.,]\d+)?)\s*%/g,
      // Pattern 2: "Candidate (XX%)"
      /([A-ZÀ-Ÿ][a-zà-ÿ\s]{2,}?)\s*\((\d+(?:[.,]\d+)?)\s*%\)/g,
    ];

    const results: Poll['results'] = [];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html))) {
        results.push({
          candidateName: match[1].trim(),
          candidateId: match[1].toLowerCase().replace(/\s+/g, '-'),
          percentage: parseFloat(match[2].replace(',', '.')),
        });
      }
    }

    if (results.length > 0) {
      polls.push(
        this.normalizePoll({
          id: `playwright-${Date.now()}`,
          publishDate: new Date(),
          fieldworkEnd: new Date(),
          sampleSize: 1000,
          methodology: 'presencial',
          results,
          sourceUrl: this.config.baseUrl,
        })
      );
    }

    return polls;
  }
}

export const createLambdaPlaywrightClient = (config: PlaywrightConfig) =>
  new LambdaPlaywrightClient(config);
