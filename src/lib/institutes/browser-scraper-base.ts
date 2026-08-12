/**
 * Browser Scraper Base
 *
 * Uses Playwright to render JavaScript-heavy pages
 * before extracting poll data.
 *
 * For sites that load data via JavaScript:
 * - Datafolha (React SPA)
 * - Ipec (Dynamic content)
 * - Quaest (JS-rendered)
 */

import { chromium, Browser } from 'playwright';
import { InstituteClientBase, Poll } from './institute-client-base';

export interface BrowserScraperConfig {
  instituteId: string;
  instituteName: string;
  reliabilityScore: number;
  baseUrl: string;
  pollSelectors: {
    container: string; // CSS selector for poll container
    title?: string;
    date?: string;
    candidates?: string;
    percentage?: string;
  };
}

/**
 * Base class for browser-based scraping
 * Handles Playwright lifecycle and page navigation
 */
export abstract class BrowserScraperBase extends InstituteClientBase {
  private browser: Browser | null = null;
  protected config: BrowserScraperConfig;

  constructor(config: BrowserScraperConfig) {
    super({
      instituteId: config.instituteId,
      instituteName: config.instituteName,
      reliabilityScore: config.reliabilityScore,
      baseUrl: config.baseUrl,
    });
    this.config = config;
  }

  /**
   * Initialize browser (lazy load)
   */
  private async initBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;

    console.log(`[${this.config.instituteName}] Launching browser...`);
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    return this.browser;
  }

  /**
   * Fetch and render page with browser
   */
  protected async fetchWithBrowser(url: string, waitFor?: string): Promise<string> {
    const browser = await this.initBrowser();
    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(),
    });
    const page = await context.newPage();

    try {

      // Navigate and wait for content
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for specific selector if provided
      if (waitFor) {
        console.log(`[${this.config.instituteName}] Waiting for: ${waitFor}`);
        await page.waitForSelector(waitFor, { timeout: 10000 }).catch(() => {
          console.warn(`[${this.config.instituteName}] Selector not found: ${waitFor}`);
        });
      }

      // Small delay for dynamic content
      await page.waitForTimeout(1000);

      // Get rendered HTML
      const html = await page.content();
      return html;
    } finally {
      await page.close();
      await context.close();
    }
  }

  /**
   * Extract polls from rendered HTML
   */
  protected abstract extractPollsFromHTML(html: string): Poll[];

  /**
   * Implement fetch using browser rendering
   */
  async fetch(): Promise<Poll[]> {
    return this.withRetry(async () => {
      console.log(`[${this.config.instituteName}] Fetching with browser...`);

      const html = await this.fetchWithBrowser(
        this.config.baseUrl,
        this.config.pollSelectors.container
      );

      const polls = this.extractPollsFromHTML(html);
      console.log(`[${this.config.instituteName}] Found ${polls.length} polls`);

      return polls;
    }, `${this.config.instituteName} browser fetch`);
  }

  /**
   * Cleanup browser on destruction
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      console.log(`[${this.config.instituteName}] Closing browser...`);
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Implement in subclasses
   */
  protected getRandomUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }
}
