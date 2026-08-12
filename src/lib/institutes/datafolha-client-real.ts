/**
 * Datafolha Real Scraper Implementation
 *
 * Fetches latest presidential and gubernatorial polls
 * from datafolha.folha.uol.com.br
 *
 * Strategy:
 * 1. Fetch polls page HTML
 * 2. Extract JSON from <script> tags
 * 3. Parse candidate results
 * 4. Normalize to Poll format
 */

import { InstituteClientBase, Poll } from './institute-client-base';

export class DatafolhaClientReal extends InstituteClientBase {
  constructor() {
    super({
      instituteId: 'datafolha',
      instituteName: 'Datafolha',
      reliabilityScore: 0.92,
      baseUrl: 'https://datafolha.folha.uol.com.br',
    });
  }

  /**
   * Fetch Datafolha presidential polls
   */
  async fetch(): Promise<Poll[]> {
    return this.withRetry(async () => {
      console.log('[Datafolha] Fetching presidential polls...');

      try {
        const url = `${this.baseUrl}/pesquisa/`;
        const response = await this.fetchWithUserAgent(url);
        const html = await response.text();

        // Extract JSON data from page
        const polls = this.extractPolls(html);

        console.log(`[Datafolha] Found ${polls.length} polls`);
        return polls;
      } catch (error) {
        console.error('[Datafolha] Fetch error:', error);
        return [];
      }
    }, 'Datafolha fetch');
  }

  /**
   * Extract polls from HTML page
   *
   * Datafolha uses multiple formats:
   * 1. Embedded JSON in <script> tags
   * 2. HTML table with poll data
   * 3. Press release text with numbers
   */
  private extractPolls(html: string): Poll[] {
    const polls: Poll[] = [];

    // Try JSON extraction first
    const jsonPatterns = [
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
      /window\.__data__\s*=\s*({[\s\S]*?});/,
      /<script[^>]*type="application\/json"[^>]*>({[\s\S]*?})<\/script>/,
    ];

    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const extracted = this.parseDatafolhaJSON(data);
          if (extracted.length > 0) {
            polls.push(...extracted);
            return polls;
          }
        } catch {
          console.warn('[Datafolha] JSON parse error, trying next pattern');
        }
      }
    }

    // Fallback: Extract from HTML table
    const tablePolls = this.extractFromHTMLTable(html);
    polls.push(...tablePolls);

    return polls;
  }

  /**
   * Parse Datafolha JSON structure
   */
  private parseDatafolhaJSON(data: any): Poll[] {
    const polls: Poll[] = [];

    // Handle various JSON structure possibilities
    const pollsArray = data.pesquisas || data.polls || data.data || [];

    if (!Array.isArray(pollsArray)) {
      return [];
    }

    for (const rawPoll of pollsArray) {
      try {
        const poll = this.normalizePoll({
          id: rawPoll.id || `df-${Date.now()}-${Math.random()}`,
          publishDate: new Date(rawPoll.data_publicacao || rawPoll.publishDate || new Date()),
          fieldworkEnd: new Date(rawPoll.data_fim || rawPoll.fieldworkEnd || new Date()),
          sampleSize: parseInt(String(rawPoll.tamanho_amostra || rawPoll.sampleSize || 0)),
          methodology: this.normalizeMethodology(rawPoll.metodologia || rawPoll.methodology),
          marginOfError: this.parseMoE(rawPoll.margem_erro || rawPoll.marginOfError),
          results: this.parseResults(rawPoll.resultados || rawPoll.results || []),
          sourceUrl: rawPoll.url || `${this.baseUrl}/pesquisa/`,
        });

        if (poll.sampleSize > 0 && poll.results.length > 0) {
          polls.push(poll);
        }
      } catch (error) {
        console.warn('[Datafolha] Failed to parse poll:', error);
      }
    }

    return polls;
  }

  /**
   * Extract polls from HTML table
   * Fallback when JSON is not available
   */
  private extractFromHTMLTable(html: string): Poll[] {
    const polls: Poll[] = [];

    // Look for table rows with poll data
    const tableRowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;

    let tableMatch;
    while ((tableMatch = tableRowPattern.exec(html))) {
      const row = tableMatch[1];
      const cells: string[] = [];
      let cellMatch;

      while ((cellMatch = cellPattern.exec(row))) {
        // Remove HTML tags and decode entities
        const text = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .trim();
        cells.push(text);
      }

      // Try to parse row as poll data
      if (cells.length >= 3) {
        // Typical structure: [candidate, percentage, date, sample_size, ...]
        try {
          const poll = this.parseTableRow(cells);
          if (poll) {
            polls.push(poll);
          }
        } catch {
          // Skip invalid rows
        }
      }
    }

    return polls;
  }

  /**
   * Parse a table row into a Poll
   */
  private parseTableRow(cells: string[]): Poll | null {
    if (cells.length < 3) return null;

    try {
      // Extract percentage (XX%)
      const percentageMatch = cells[1].match(/(\d+(?:\.\d+)?)/);
      if (!percentageMatch) return null;

      return this.normalizePoll({
        id: `df-table-${Date.now()}-${Math.random()}`,
        publishDate: new Date(),
        fieldworkEnd: new Date(),
        sampleSize: 1000, // Default, would be extracted if available
        methodology: 'presencial',
        results: [
          {
            candidateName: cells[0],
            percentage: parseFloat(percentageMatch[1]),
            candidateId: cells[0].toLowerCase().replace(/\s+/g, '-'),
          },
        ],
        sourceUrl: `${this.baseUrl}/pesquisa/`,
      });
    } catch {
      return null;
    }
  }

  /**
   * Parse candidate results from various formats
   */
  private parseResults(results: any[]): Poll['results'] {
    if (!Array.isArray(results)) return [];

    return results
      .map(r => {
        if (typeof r !== 'object' || !r) return null;

        const name = String(r.candidato_nome || r.candidateName || r.nome || '');
        const percentage = parseFloat(String(r.percentual || r.percentage || r.pct || '0'));

        if (!name || percentage <= 0) return null;

        return {
          candidateName: name,
          candidateId: name.toLowerCase().replace(/\s+/g, '-'),
          percentage,
          margin: parseFloat(String(r.margem || r.margin || '0')) || undefined,
        };
      })
      .filter(Boolean) as Poll['results'];
  }

  /**
   * Normalize methodology values
   */
  private normalizeMethodology(
    method?: string
  ): 'presencial' | 'telefonica' | 'mista' | 'online' {
    if (!method) return 'presencial';

    const lower = String(method).toLowerCase();
    if (lower.includes('presencial')) return 'presencial';
    if (lower.includes('telefone') || lower.includes('telefon')) return 'telefonica';
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

// Export singleton
export const datafolhaClientReal = new DatafolhaClientReal();
