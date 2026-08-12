/**
 * Generic Pattern-Based HTML Scraper
 *
 * Pure TypeScript HTML scraper for Tier 3+ institutes
 * - No external dependencies (Playwright-free)
 * - Regex patterns for common polling data formats
 * - Works in serverless (Vercel)
 * - 0 cold start overhead
 *
 * Patterns supported:
 * 1. Candidate percentages: "Name: XX%", "Name - XX%", "Name (XX%)"
 * 2. HTML tables: <table> with candidate names and percentages
 * 3. JSON in script tags: window.data, __INITIAL_STATE__, etc
 * 4. Data attributes: data-candidate, data-percentage
 */

import { InstituteClientBase, Poll, PollResult } from './institute-client-base';

export interface GenericScraperConfig {
  instituteId: string;
  instituteName: string;
  reliabilityScore: number;
  baseUrl: string;

  // Regex patterns for extraction
  patterns?: {
    /** Match: "Name: 25%" or "Name - 25%" or "Name (25%)" */
    candidatePercentage?: RegExp;

    /** Match: JSON in script tags */
    scriptJson?: RegExp;

    /** Match: Table cells with percentage data */
    tableCell?: RegExp;
  };

  // CSS selectors as fallback (parse class names)
  selectors?: {
    candidate?: string;
    percentage?: string;
    container?: string;
  };

  // Metadata extraction
  datePatterns?: {
    publish?: RegExp;
    fieldworkEnd?: RegExp;
  };

  // Sample size and margin extraction
  metadataPatterns?: {
    sampleSize?: RegExp;
    marginOfError?: RegExp;
  };
}

/**
 * Generic scraper for HTML-based polling data
 * Extensible via configuration patterns
 */
export abstract class GenericScraper extends InstituteClientBase {
  protected scraperConfig: GenericScraperConfig;

  constructor(config: GenericScraperConfig) {
    super({
      instituteId: config.instituteId,
      instituteName: config.instituteName,
      reliabilityScore: config.reliabilityScore,
      baseUrl: config.baseUrl,
    });
    this.scraperConfig = config;
  }

  /**
   * Main fetch method
   * Subclasses override fetchUrl() to customize the endpoint
   */
  async fetch(): Promise<Poll[]> {
    return this.withRetry(async () => {
      console.log(`[${this.scraperConfig.instituteName}] Fetching HTML...`);

      const url = this.getFetchUrl();
      const html = await this.fetchHtml(url);

      const polls = this.parseHtml(html);
      console.log(`[${this.scraperConfig.instituteName}] Found ${polls.length} polls`);

      return polls;
    }, `${this.scraperConfig.instituteName} scrape`);
  }

  /**
   * Get the URL to fetch (override in subclasses)
   */
  protected getFetchUrl(): string {
    return this.scraperConfig.baseUrl;
  }

  /**
   * Fetch raw HTML without Playwright
   */
  protected async fetchHtml(url: string): Promise<string> {
    const response = await this.fetchWithUserAgent(url);
    return await response.text();
  }

  /**
   * Main HTML parsing orchestrator
   * Tries multiple extraction strategies in order
   */
  protected parseHtml(html: string): Poll[] {
    // Strategy 1: Extract JSON from script tags
    const jsonPolls = this.extractFromScriptTags(html);
    if (jsonPolls.length > 0) {
      console.log(`[${this.scraperConfig.instituteName}] Extracted ${jsonPolls.length} polls from JSON`);
      return jsonPolls;
    }

    // Strategy 2: Extract from HTML tables
    const tablePolls = this.extractFromTables(html);
    if (tablePolls.length > 0) {
      console.log(`[${this.scraperConfig.instituteName}] Extracted ${tablePolls.length} polls from tables`);
      return tablePolls;
    }

    // Strategy 3: Regex pattern matching for candidate percentages
    const patternPolls = this.extractFromPatterns(html);
    if (patternPolls.length > 0) {
      console.log(`[${this.scraperConfig.instituteName}] Extracted ${patternPolls.length} polls from patterns`);
      return patternPolls;
    }

    // Strategy 4: Extract from data attributes
    const attrPolls = this.extractFromAttributes(html);
    if (attrPolls.length > 0) {
      console.log(`[${this.scraperConfig.instituteName}] Extracted ${attrPolls.length} polls from attributes`);
      return attrPolls;
    }

    console.warn(`[${this.scraperConfig.instituteName}] No polls extracted from HTML`);
    return [];
  }

  /**
   * Strategy 1: Extract JSON from script tags
   * Looks for: window.__DATA__, __INITIAL_STATE__, window.polls, etc
   */
  protected extractFromScriptTags(html: string): Poll[] {
    const polls: Poll[] = [];

    // Common patterns for JSON in script tags
    const patterns = [
      /window\.__DATA__\s*=\s*({[\s\S]*?});/,
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
      /window\.polls\s*=\s*({[\s\S]*?});/,
      /window\.pesquisas\s*=\s*({[\s\S]*?});/,
      /const\s+data\s*=\s*({[\s\S]*?});/,
      /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/,
    ];

    for (const pattern of patterns) {
      try {
        const match = pattern.exec(html);
        if (!match) continue;

        const jsonStr = match[1];
        if (!jsonStr) continue;

        // Try to extract JSON object
        const data = this.parseJson(jsonStr);
        if (!data) continue;

        const extractedPolls = this.normalizeJsonData(data);
        if (extractedPolls.length > 0) {
          polls.push(...extractedPolls);
          return polls; // Return first successful extraction
        }
      } catch (e) {
        // Continue to next pattern
        console.debug(`[${this.scraperConfig.instituteName}] JSON parse error:`, e);
      }
    }

    return polls;
  }

  /**
   * Try to parse JSON string (handles malformed JSON)
   */
  protected parseJson(jsonStr: string): any {
    try {
      return JSON.parse(jsonStr);
    } catch {
      // Try removing trailing commas
      try {
        const cleaned = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  }

  /**
   * Normalize JSON data to Poll format
   */
  protected normalizeJsonData(data: any): Poll[] {
    const polls: Poll[] = [];

    // Handle array of polls
    const pollsArray = Array.isArray(data) ? data :
      data.polls ? (Array.isArray(data.polls) ? data.polls : [data.polls]) :
      data.pesquisas ? (Array.isArray(data.pesquisas) ? data.pesquisas : [data.pesquisas]) :
      data.results ? (Array.isArray(data.results) ? data.results : [data.results]) :
      [data];

    for (const rawPoll of pollsArray.slice(0, 10)) {
      if (!rawPoll) continue;

      try {
        const results = this.extractResultsFromJsonPoll(rawPoll);
        if (results.length === 0) continue;

        const poll = this.normalizePoll({
          id: rawPoll.id || rawPoll.uuid || `${this.scraperConfig.instituteId}-${Date.now()}`,
          publishDate: this.parseDate(rawPoll.publishDate || rawPoll.data_publicacao || rawPoll.publish_date),
          fieldworkEnd: this.parseDate(rawPoll.fieldworkEnd || rawPoll.data_fim || rawPoll.fieldwork_end),
          fieldworkStart: rawPoll.fieldworkStart || rawPoll.data_inicio ?
            this.parseDate(rawPoll.fieldworkStart || rawPoll.data_inicio) : undefined,
          sampleSize: parseInt(String(rawPoll.sampleSize || rawPoll.tamanho_amostra || 1000)),
          marginOfError: parseFloat(String(rawPoll.marginOfError || rawPoll.margem_erro || 0)),
          methodology: (rawPoll.methodology || rawPoll.metodologia || 'presencial').toLowerCase(),
          results,
          sourceUrl: this.scraperConfig.baseUrl,
          isVerified: false,
        });

        polls.push(poll);
      } catch (e) {
        console.debug(`[${this.scraperConfig.instituteName}] Error parsing poll:`, e);
      }
    }

    return polls;
  }

  /**
   * Extract results array from JSON poll object
   */
  protected extractResultsFromJsonPoll(pollData: any): PollResult[] {
    const results: PollResult[] = [];

    // Try various result field names
    const resultsArray =
      pollData.results ||
      pollData.resultados ||
      pollData.candidates ||
      pollData.candidatos ||
      [];

    if (!Array.isArray(resultsArray)) return [];

    for (const item of resultsArray) {
      if (!item) continue;

      const name = item.candidateName || item.nome || item.candidate_name || item.name || '';
      const pct = parseFloat(String(item.percentage || item.percentual || item.percent || 0));

      if (name && pct >= 0) {
        results.push({
          candidateName: name.trim(),
          candidateId: this.normalizeId(name),
          percentage: pct,
          margin: item.margin || item.margem,
        });
      }
    }

    return results;
  }

  /**
   * Strategy 2: Extract from HTML tables
   * Looks for <table> elements and parses rows
   */
  protected extractFromTables(html: string): Poll[] {
    const polls: Poll[] = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/g;

    let match;
    while ((match = tableRegex.exec(html)) !== null) {
      const tableHtml = match[1];

      // Extract rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      const rows: string[] = [];

      let rowMatch;
      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        rows.push(rowMatch[1]);
      }

      if (rows.length < 2) continue; // Need at least header + 1 data row

      // Parse each row for candidate data
      const results: PollResult[] = [];

      for (const row of rows) {
        // Extract cell data
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
        const cells: string[] = [];

        let cellMatch;
        while ((cellMatch = cellRegex.exec(row)) !== null) {
          cells.push(this.stripHtml(cellMatch[1]).trim());
        }

        if (cells.length >= 2) {
          // Try to match: Name, Percentage
          const name = cells[0];
          const pctStr = cells[cells.length - 1];

          if (this.looksLikeCandidateName(name) && this.looksLikePercentage(pctStr)) {
            const pct = this.parsePercentage(pctStr);
            if (pct >= 0) {
              results.push({
                candidateName: name,
                candidateId: this.normalizeId(name),
                percentage: pct,
              });
            }
          }
        }
      }

      if (results.length >= 2) {
        polls.push(
          this.normalizePoll({
            id: `${this.scraperConfig.instituteId}-table-${Date.now()}`,
            publishDate: new Date(),
            fieldworkEnd: new Date(),
            sampleSize: 1000,
            methodology: 'presencial',
            results,
            sourceUrl: this.scraperConfig.baseUrl,
            isVerified: false,
          })
        );
        return polls;
      }
    }

    return polls;
  }

  /**
   * Strategy 3: Extract using regex patterns
   * Matches: "Name: 25%", "Name - 25%", "Name (25%)"
   */
  protected extractFromPatterns(html: string): Poll[] {
    const polls: Poll[] = [];

    // Default pattern if none configured
    const pattern = this.scraperConfig.patterns?.candidatePercentage ||
      /([A-ZÀ-Ÿ][a-zà-ÿ\s]{2,})\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*%/g;

    const results: PollResult[] = [];
    let match;

    // Create a new regex for each search
    const regexStr = pattern.source;
    const regex = new RegExp(regexStr, 'g');

    while ((match = regex.exec(html)) !== null) {
      const name = match[1].trim();
      const pctStr = match[2];

      if (this.looksLikeCandidateName(name)) {
        const pct = parseFloat(pctStr.replace(',', '.'));
        if (pct >= 0 && pct <= 100) {
          results.push({
            candidateName: name,
            candidateId: this.normalizeId(name),
            percentage: pct,
          });
        }
      }
    }

    // Deduplicate by candidate ID
    const seen = new Set<string>();
    const deduped: PollResult[] = [];
    for (const result of results) {
      if (!seen.has(result.candidateId)) {
        seen.add(result.candidateId);
        deduped.push(result);
      }
    }

    if (deduped.length >= 2) {
      polls.push(
        this.normalizePoll({
          id: `${this.scraperConfig.instituteId}-pattern-${Date.now()}`,
          publishDate: new Date(),
          fieldworkEnd: new Date(),
          sampleSize: 1000,
          methodology: 'presencial',
          results: deduped,
          sourceUrl: this.scraperConfig.baseUrl,
          isVerified: false,
        })
      );
    }

    return polls;
  }

  /**
   * Strategy 4: Extract from data attributes
   * Looks for: data-candidate, data-percentage, etc
   */
  protected extractFromAttributes(html: string): Poll[] {
    const polls: Poll[] = [];

    // Find all elements with data-candidate
    const candidateRegex = /data-candidate\s*=\s*["']([^"']+)["']/g;
    const percentageRegex = /data-percentage\s*=\s*["']([^"']+)["']/g;

    const candidates = new Map<string, string>();
    const percentages = new Map<string, number>();

    let match;

    // Extract candidates
    while ((match = candidateRegex.exec(html)) !== null) {
      const id = match[1];
      // Look for nearby name
      candidates.set(id, id);
    }

    // Extract percentages
    while ((match = percentageRegex.exec(html)) !== null) {
      const id = match[1];
      const pct = parseFloat(match[2] || match[1]);
      if (!isNaN(pct)) {
        percentages.set(id, pct);
      }
    }

    if (candidates.size >= 2) {
      const results: PollResult[] = [];
      const candidateIds = Array.from(candidates.keys());
      for (const id of candidateIds) {
        const name = candidates.get(id) || '';
        const pct = percentages.get(id) || 0;
        if (pct > 0) {
          results.push({
            candidateName: name,
            candidateId: id,
            percentage: pct,
          });
        }
      }

      if (results.length >= 2) {
        polls.push(
          this.normalizePoll({
            id: `${this.scraperConfig.instituteId}-attr-${Date.now()}`,
            publishDate: new Date(),
            fieldworkEnd: new Date(),
            sampleSize: 1000,
            methodology: 'presencial',
            results,
            sourceUrl: this.scraperConfig.baseUrl,
            isVerified: false,
          })
        );
      }
    }

    return polls;
  }

  /**
   * Helper: Strip HTML tags
   */
  protected stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Helper: Check if string looks like a candidate name
   */
  protected looksLikeCandidateName(text: string): boolean {
    // At least 2 words, starts with capital
    const words = text.trim().split(/\s+/);
    return words.length >= 1 && /^[A-ZÀ-Ÿ]/.test(text) && text.length > 2;
  }

  /**
   * Helper: Check if string looks like a percentage
   */
  protected looksLikePercentage(text: string): boolean {
    return /^\d+(?:[.,]\d+)?%?$/.test(text.trim());
  }

  /**
   * Helper: Parse percentage from string
   */
  protected parsePercentage(text: string): number {
    const match = text.match(/(\d+(?:[.,]\d+)?)/);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return -1;
  }

  /**
   * Helper: Parse date (tries multiple formats)
   */
  protected parseDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;

    const str = String(value).trim();
    if (!str) return new Date();

    // Try ISO format
    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime())) return isoDate;

    // Try DD/MM/YYYY format
    const dmy = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(str);
    if (dmy) {
      return new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`);
    }

    // Fallback
    return new Date();
  }

  /**
   * Helper: Normalize candidate ID (lowercase, remove spaces/special chars)
   */
  protected normalizeId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[àáâãä]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
  }
}
