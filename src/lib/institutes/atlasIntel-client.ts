/**
 * AtlasIntel Client Implementation
 *
 * AtlasIntel: High-frequency real-time polling
 * Profile: 0.84/10 | Frequency: 2-3x per week | Real-time tracking
 *
 * Strategy: Dashboard scraping + API endpoints
 */

import { BrowserScraperBase } from './browser-scraper-base';
import { Poll } from './institute-client-base';

export class AtlasIntelClient extends BrowserScraperBase {
  constructor() {
    super({
      instituteId: 'atlasIntel',
      instituteName: 'AtlasIntel',
      reliabilityScore: 0.84,
      baseUrl: 'https://www.atlasinteligencia.com.br',
      pollSelectors: {
        container: '[data-poll], .poll, .tracking, .resultado',
        date: '[data-date], .poll-date, time, .data-pesquisa',
        candidates: '.candidate, .candidato, [data-candidate], .option',
        percentage: '.percentage, .pct, [data-pct], .percent',
      },
    });
  }

  /**
   * Override fetch to try multiple endpoints
   */
  async fetch(): Promise<Poll[]> {
    return this.withRetry(async () => {
      console.log('[AtlasIntel] Fetching real-time tracking...');

      const urls = [
        `${this.config.baseUrl}/`,
        `${this.config.baseUrl}/rastreador`,
        `${this.config.baseUrl}/pesquisas`,
        `${this.config.baseUrl}/tracking`,
      ];

      for (const url of urls) {
        try {
          console.log(`[AtlasIntel] Trying ${url}`);
          const html = await this.fetchWithBrowser(url, this.config.pollSelectors.container);
          const polls = this.extractPollsFromHTML(html);

          if (polls.length > 0) {
            console.log(`[AtlasIntel] Found ${polls.length} polls`);
            return polls;
          }
        } catch (e) {
          console.warn(`[AtlasIntel] Failed to fetch from ${url}`);
        }
      }

      return [];
    }, 'AtlasIntel fetch');
  }

  /**
   * Extract polls from rendered HTML
   */
  protected extractPollsFromHTML(html: string): Poll[] {
    const polls: Poll[] = [];

    // Try JSON API patterns
    const jsonPatterns = [
      /window\.__TRACKING__\s*=\s*({[\s\S]*?});/,
      /window\.__POLLS__\s*=\s*({[\s\S]*?});/,
      /window\.__DATA__\s*=\s*({[\s\S]*?});/,
      /<script[^>]*>var\s+tracking\s*=\s*({[\s\S]*?});<\/script>/,
    ];

    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const extracted = this.parseJSON(data);
          if (extracted.length > 0) {
            console.log('[AtlasIntel] Successfully parsed JSON');
            return extracted;
          }
        } catch (e) {
          console.warn('[AtlasIntel] JSON parse failed');
        }
      }
    }

    // Fallback: Extract from dashboard divs
    const dashboardPolls = this.extractFromDashboard(html);
    if (dashboardPolls.length > 0) {
      console.log('[AtlasIntel] Successfully parsed dashboard');
      return dashboardPolls;
    }

    // Last resort: Card-based extraction
    const cardPolls = this.extractFromCards(html);
    if (cardPolls.length > 0) {
      console.log('[AtlasIntel] Successfully parsed cards');
      return cardPolls;
    }

    return polls;
  }

  /**
   * Parse JSON data
   */
  private parseJSON(data: any): Poll[] {
    const polls: Poll[] = [];

    const pollsArray = data.tracking || data.polls || data.pesquisas || data.results || [];

    if (!Array.isArray(pollsArray)) return [];

    for (const rawPoll of pollsArray.slice(0, 10)) {
      try {
        const poll = this.normalizePoll({
          id: rawPoll.id || `ai-${Date.now()}-${Math.random()}`,
          publishDate: new Date(rawPoll.publishedAt || rawPoll.data_publicacao || rawPoll.date || new Date()),
          fieldworkEnd: new Date(rawPoll.fieldworkEnd || rawPoll.data_coleta || rawPoll.date || new Date()),
          sampleSize: parseInt(String(rawPoll.sampleSize || rawPoll.n || rawPoll.amostra || 1000)),
          methodology: this.normalizeMethodology(rawPoll.methodology || rawPoll.metodologia),
          marginOfError: this.parseMoE(rawPoll.marginOfError || rawPoll.moe || rawPoll.margem),
          results: this.parseResults(rawPoll.results || rawPoll.candidatos || rawPoll.options || []),
          sourceUrl: rawPoll.url || this.config.baseUrl,
        });

        if (poll.sampleSize > 0 && poll.results.length > 0) {
          polls.push(poll);
        }
      } catch (error) {
        console.warn('[AtlasIntel] Parse error:', error);
      }
    }

    return polls;
  }

  /**
   * Extract from dashboard grid
   */
  private extractFromDashboard(html: string): Poll[] {
    const polls: Poll[] = [];

    // Look for tracking boxes
    const boxPattern = /<div[^>]*class="[^"]*tracking[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let boxMatch;

    while ((boxMatch = boxPattern.exec(html))) {
      const box = boxMatch[1];

      try {
        // Extract candidate data
        const results: Poll['results'] = [];

        // Pattern: "Candidate: XX%" or "Candidate - XX%"
        const candPattern = /(?:>|:\s)([A-ZÀ-Ÿ][a-zà-ÿ\s]*?)\s*[:\-––]\s*(\d+(?:[.,]\d+)?)\s*%/g;
        let candMatch;

        while ((candMatch = candPattern.exec(box))) {
          const name = candMatch[1].trim();
          const pct = candMatch[2].replace(',', '.');

          if (name.length > 2 && name.length < 50) {
            results.push({
              candidateName: name,
              candidateId: name.toLowerCase().replace(/\s+/g, '-'),
              percentage: parseFloat(pct),
            });
          }
        }

        if (results.length > 0) {
          const poll = this.normalizePoll({
            id: `ai-dashboard-${Date.now()}-${Math.random()}`,
            publishDate: new Date(),
            fieldworkEnd: new Date(),
            sampleSize: 1500,
            methodology: 'online',
            results,
            sourceUrl: this.config.baseUrl,
          });

          polls.push(poll);
        }
      } catch (e) {
        console.warn('[AtlasIntel] Dashboard parse error');
      }
    }

    return polls;
  }

  /**
   * Extract from cards/items
   */
  private extractFromCards(html: string): Poll[] {
    const polls: Poll[] = [];

    // Look for card elements
    const cardPattern = /<div[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let cardMatch;

    while ((cardMatch = cardPattern.exec(html))) {
      const card = cardMatch[1];

      try {
        // Skip if too small
        if (card.length < 100) continue;

        // Extract results
        const results: Poll['results'] = [];

        // Multi-line candidate pattern
        const lines = card.split(/[\n<br>]+/);
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].replace(/<[^>]*>/g, '').trim();
          const nextLine = lines[i + 1].replace(/<[^>]*>/g, '').trim();

          // Try to match "Name" on line i and "XX%" on line i+1
          if (line.match(/^[A-ZÀ-Ÿ][a-zà-ÿ\s]{2,}$/) && nextLine.match(/^\d+(?:[.,]\d+)?%?$/)) {
            const pct = parseFloat(nextLine.replace(',', '.').replace('%', ''));
            if (pct > 0) {
              results.push({
                candidateName: line,
                candidateId: line.toLowerCase().replace(/\s+/g, '-'),
                percentage: pct,
              });
            }
          }
        }

        if (results.length > 0) {
          const poll = this.normalizePoll({
            id: `ai-card-${Date.now()}-${Math.random()}`,
            publishDate: new Date(),
            fieldworkEnd: new Date(),
            sampleSize: 1500,
            methodology: 'online',
            results,
            sourceUrl: this.config.baseUrl,
          });

          polls.push(poll);
        }
      } catch (e) {
        console.warn('[AtlasIntel] Card parse error');
      }
    }

    return polls;
  }

  /**
   * Parse results
   */
  private parseResults(results: any[]): Poll['results'] {
    if (!Array.isArray(results)) return [];

    return results
      .map(r => {
        if (!r || typeof r !== 'object') return null;

        const name = String(r.candidateName || r.name || r.candidato || r.candidate || r.option || '');
        const pct = parseFloat(String(r.percentage || r.pct || r.percentual || r.percent || '0'));

        if (!name || pct <= 0 || name.length > 50) return null;

        return {
          candidateName: name,
          candidateId: name.toLowerCase().replace(/\s+/g, '-'),
          percentage: pct,
        };
      })
      .filter(Boolean) as Poll['results'];
  }

  /**
   * Normalize methodology
   */
  private normalizeMethodology(
    method?: string
  ): 'presencial' | 'telefonica' | 'mista' | 'online' {
    if (!method) return 'online'; // AtlasIntel is primarily online
    const lower = String(method).toLowerCase();
    if (lower.includes('presencial')) return 'presencial';
    if (lower.includes('telefone')) return 'telefonica';
    if (lower.includes('mist')) return 'mista';
    if (lower.includes('online') || lower.includes('internet') || lower.includes('web'))
      return 'online';
    return 'online';
  }

  /**
   * Parse margin of error
   */
  private parseMoE(moe?: string | number): number | undefined {
    if (!moe) return undefined;
    const value = typeof moe === 'string' ? parseFloat(moe) : moe;
    return isNaN(value) ? undefined : value;
  }
}

export const atlasIntelClient = new AtlasIntelClient();
