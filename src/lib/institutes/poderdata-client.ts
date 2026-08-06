/**
 * PoderData Client Implementation
 *
 * PoderData: Research institute known for quick turnaround polls
 * Profile: 0.82/10 | Frequency: Weekly | Known for accuracy
 *
 * Strategy: JSON API + HTML parsing
 */

import { BrowserScraperBase } from './browser-scraper-base';
import { Poll } from './institute-client-base';

export class PoderDataClient extends BrowserScraperBase {
  constructor() {
    super({
      instituteId: 'poderdata',
      instituteName: 'PoderData',
      reliabilityScore: 0.82,
      baseUrl: 'https://www.poderdata.com.br',
      pollSelectors: {
        container: '[data-poll], .poll, .pesquisa, article',
        date: '[data-date], .poll-date, time, .data',
        candidates: '.candidate, .candidato, [data-candidate], .resultado',
        percentage: '.percentage, .pct, [data-pct], .percentual',
      },
    });
  }

  /**
   * Extract polls from rendered HTML
   */
  protected extractPollsFromHTML(html: string): Poll[] {
    const polls: Poll[] = [];

    // Try common JSON patterns
    const jsonPatterns = [
      /window\.__INITIAL_DATA__\s*=\s*({[\s\S]*?});/,
      /window\.__DATA__\s*=\s*({[\s\S]*?});/,
      /<script[^>]*type="application\/json"[^>]*id="poll-data"[^>]*>([\s\S]*?)<\/script>/,
      /var\s+pollsData\s*=\s*({[\s\S]*?});/,
    ];

    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const extracted = this.parseJSON(data);
          if (extracted.length > 0) {
            console.log('[PoderData] Successfully parsed JSON');
            return extracted;
          }
        } catch (e) {
          console.warn('[PoderData] JSON parse failed, trying next pattern');
        }
      }
    }

    // Fallback: HTML table extraction
    const tablePolls = this.extractFromTable(html);
    if (tablePolls.length > 0) {
      console.log('[PoderData] Successfully parsed HTML table');
      return tablePolls;
    }

    // Last resort: Article/div extraction
    const articlePolls = this.extractFromArticles(html);
    if (articlePolls.length > 0) {
      console.log('[PoderData] Successfully parsed articles');
      return articlePolls;
    }

    return polls;
  }

  /**
   * Parse JSON data
   */
  private parseJSON(data: any): Poll[] {
    const polls: Poll[] = [];
    const pollsArray = data.polls || data.pesquisas || data.results || data.data || [];

    if (!Array.isArray(pollsArray)) return [];

    for (const rawPoll of pollsArray.slice(0, 10)) {
      try {
        const poll = this.normalizePoll({
          id: rawPoll.id || `pd-${Date.now()}-${Math.random()}`,
          publishDate: new Date(rawPoll.publishedAt || rawPoll.data_publicacao || rawPoll.date || new Date()),
          fieldworkEnd: new Date(rawPoll.fieldworkEnd || rawPoll.data_fim || rawPoll.date || new Date()),
          sampleSize: parseInt(String(rawPoll.sampleSize || rawPoll.tamanho_amostra || rawPoll.n || 1000)),
          methodology: this.normalizeMethodology(rawPoll.methodology || rawPoll.metodologia),
          marginOfError: this.parseMoE(rawPoll.marginOfError || rawPoll.margem_erro || rawPoll.moe),
          results: this.parseResults(rawPoll.results || rawPoll.candidatos || rawPoll.candidates || []),
          sourceUrl: rawPoll.url || this.config.baseUrl,
        });

        if (poll.sampleSize > 0 && poll.results.length > 0) {
          polls.push(poll);
        }
      } catch (error) {
        console.warn('[PoderData] Parse error:', error);
      }
    }

    return polls;
  }

  /**
   * Extract from HTML table
   */
  private extractFromTable(html: string): Poll[] {
    const polls: Poll[] = [];

    const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;

    while ((tableMatch = tablePattern.exec(html))) {
      const table = tableMatch[1];
      const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;

      while ((rowMatch = rowPattern.exec(table))) {
        const row = rowMatch[1];
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

        if (cells.length >= 3) {
          try {
            const poll = this.parseTableRow(cells.map(c => c.replace(/<[^>]*>/g, '').trim()));
            if (poll) polls.push(poll);
          } catch (e) {
            // Skip invalid rows
          }
        }
      }
    }

    return polls;
  }

  /**
   * Parse table row
   */
  private parseTableRow(cells: string[]): Poll | null {
    try {
      if (cells.length < 3) return null;

      // Typical: [candidate, percentage, date, ...]
      const candidateName = cells[0];
      const percentageMatch = cells[1].match(/(\d+(?:\.\d+)?)/);
      if (!percentageMatch) return null;

      return this.normalizePoll({
        id: `pd-table-${Date.now()}-${Math.random()}`,
        publishDate: new Date(),
        fieldworkEnd: new Date(),
        sampleSize: 1000,
        methodology: 'presencial',
        results: [
          {
            candidateName,
            candidateId: candidateName.toLowerCase().replace(/\s+/g, '-'),
            percentage: parseFloat(percentageMatch[1]),
          },
        ],
        sourceUrl: this.config.baseUrl,
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract from article elements
   */
  private extractFromArticles(html: string): Poll[] {
    const polls: Poll[] = [];

    const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let articleMatch;

    while ((articleMatch = articlePattern.exec(html))) {
      const article = articleMatch[1];

      try {
        // Look for poll-like structure
        if (!article.includes('candidat') && !article.includes('%')) continue;

        const results: Poll['results'] = [];

        // Extract candidates with percentages
        const candPattern = /(?:>|:)\s*([A-ZÀ-Ÿa-zà-ÿ\s]+)\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*%/gi;
        let candMatch;

        while ((candMatch = candPattern.exec(article))) {
          const name = candMatch[1].trim();
          const pct = candMatch[2].replace(',', '.');

          if (name.length > 2) {
            results.push({
              candidateName: name,
              candidateId: name.toLowerCase().replace(/\s+/g, '-'),
              percentage: parseFloat(pct),
            });
          }
        }

        if (results.length > 0) {
          const poll = this.normalizePoll({
            id: `pd-article-${Date.now()}-${Math.random()}`,
            publishDate: new Date(),
            fieldworkEnd: new Date(),
            sampleSize: 1000,
            methodology: 'presencial',
            results,
            sourceUrl: this.config.baseUrl,
          });

          polls.push(poll);
        }
      } catch (e) {
        console.warn('[PoderData] Article parse error');
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

        const name = String(r.candidateName || r.name || r.candidato || r.candidate || '');
        const pct = parseFloat(String(r.percentage || r.pct || r.percentual || r.percent || '0'));

        if (!name || pct <= 0) return null;

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
    if (!method) return 'presencial';
    const lower = String(method).toLowerCase();
    if (lower.includes('presencial')) return 'presencial';
    if (lower.includes('telefone')) return 'telefonica';
    if (lower.includes('mist')) return 'mista';
    if (lower.includes('online') || lower.includes('internet')) return 'online';
    return 'presencial';
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

export const poderDataClient = new PoderDataClient();
